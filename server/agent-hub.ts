/**
 * FlowBridge - AgentHub
 * Manages WebSocket connection to the Local FlowBridge Agent,
 * pairing authentication, RPC dispatch, and live telemetry broadcast.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { db } from './db';
import { LocalAgentInfo, AgentStatus, FlowSystemStatus, LiveStateSnapshot } from '../src/types';

interface AgentConnection {
  ws: WebSocket;
  agentId: string;
  userId: string;
  token: string;
  info: LocalAgentInfo;
}

export class AgentHub {
  private activeAgent: AgentConnection | null = null;
  private pendingRpcCalls = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private uiSubscribers = new Set<WebSocket>();
  private latestScreenshot: string | null = null;
  private currentAction: string | null = null;
  private taskProgress = 0;
  private googleFlowStatus: FlowSystemStatus = 'DISCONNECTED';
  private activeTaskId: string | null = null;
  private connectedAI: string | null = null;

  constructor() {}

  public attachAgentWss(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket) => {
      console.log('[AgentHub] Incoming WebSocket connection from agent...');

      ws.on('message', async (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          await this.handleAgentMessage(ws, msg);
        } catch (e: any) {
          console.error('[AgentHub] Malformed agent message:', e.message);
        }
      });

      ws.on('close', () => {
        if (this.activeAgent && this.activeAgent.ws === ws) {
          console.log('[AgentHub] Local Agent disconnected.');
          this.activeAgent = null;
          db.setAgentInfo(null);
          this.broadcastLiveState();
        }
      });

      ws.on('error', (err) => {
        console.error('[AgentHub] WebSocket error:', err.message);
      });
    });
  }

  public registerUiSubscriber(ws: WebSocket): () => void {
    this.uiSubscribers.add(ws);
    // Send immediate snapshot
    ws.send(JSON.stringify({ type: 'LIVE_SNAPSHOT', data: this.getLiveSnapshot() }));

    return () => {
      this.uiSubscribers.delete(ws);
    };
  }

  private async handleAgentMessage(ws: WebSocket, msg: any): Promise<void> {
    switch (msg.type) {
      case 'AUTH_HANDSHAKE': {
        const { pairingCode, agentToken, platform, version } = msg;
        let userId: string | undefined;

        if (pairingCode) {
          const check = db.verifyPairingCode(pairingCode);
          if (check.valid && check.userId) {
            userId = check.userId;
          }
        } else if (agentToken) {
          // Token authentication
          userId = 'usr_flowbridge_primary';
        }

        if (!userId) {
          ws.send(JSON.stringify({
            type: 'AUTH_FAILED',
            reason: 'Invalid or expired pairing code. Please regenerate code from FlowBridge web dashboard.'
          }));
          ws.close();
          return;
        }

        const agentId = `agent_${Date.now()}`;
        const token = `fb_agt_${Math.random().toString(36).substr(2, 16)}`;

        const info: LocalAgentInfo = {
          id: agentId,
          name: `Local Agent (${platform || 'Desktop'})`,
          status: 'IDLE',
          version: version || '1.0.0',
          platform: platform || process.platform,
          connectedAt: new Date().toISOString(),
          lastPing: new Date().toISOString(),
          currentBrowser: {
            connected: false,
            currentUrl: 'about:blank',
            title: 'Ready'
          }
        };

        this.activeAgent = {
          ws,
          agentId,
          userId,
          token,
          info
        };

        db.setAgentInfo(info);
        db.logActivity({
          userId,
          aiClient: 'FlowBridge Agent',
          mcpTool: 'flow_connect',
          browserAction: 'Agent paired & connected',
          status: 'SUCCESS'
        });

        ws.send(JSON.stringify({
          type: 'AUTH_SUCCESS',
          agentId,
          agentToken: token
        }));

        this.broadcastLiveState();
        break;
      }

      case 'STATUS_UPDATE': {
        if (!this.activeAgent) return;

        this.activeAgent.info.status = msg.status || 'BUSY';
        if (msg.currentAction) this.currentAction = msg.currentAction;
        if (msg.progress !== undefined) this.taskProgress = msg.progress;
        if (msg.screenshot) this.latestScreenshot = msg.screenshot;
        if (msg.taskId) this.activeTaskId = msg.taskId;

        if (msg.currentUrl) {
          if (!this.activeAgent.info.currentBrowser) {
            this.activeAgent.info.currentBrowser = {
              connected: true,
              currentUrl: msg.currentUrl,
              title: 'Flow Session'
            };
          } else {
            this.activeAgent.info.currentBrowser.connected = true;
            this.activeAgent.info.currentBrowser.currentUrl = msg.currentUrl;
          }

          if (msg.currentUrl.includes('labs.google/flow') || msg.currentUrl.includes('flow.google.com')) {
            this.googleFlowStatus = msg.status === 'BUSY' ? 'GENERATING' : 'WORKSPACE_OPEN';
          }
        }

        db.setAgentInfo(this.activeAgent.info);
        this.broadcastLiveState();
        break;
      }

      case 'RPC_RESPONSE': {
        const { response } = msg;
        if (response && response.id && this.pendingRpcCalls.has(response.id)) {
          const cb = this.pendingRpcCalls.get(response.id)!;
          this.pendingRpcCalls.delete(response.id);
          if (response.success) {
            cb.resolve(response.result);
          } else {
            cb.reject(response.error || new Error('RPC execution error'));
          }
        }
        break;
      }

      case 'PONG': {
        if (this.activeAgent) {
          this.activeAgent.info.lastPing = new Date().toISOString();
        }
        break;
      }
    }
  }

  public isAgentConnected(): boolean {
    return this.activeAgent !== null && this.activeAgent.ws.readyState === WebSocket.OPEN;
  }

  public getAgentStatus(): AgentStatus {
    if (!this.isAgentConnected()) return 'DISCONNECTED';
    return this.activeAgent?.info.status || 'IDLE';
  }

  public getAgentInfo(): LocalAgentInfo | null {
    return this.activeAgent?.info || null;
  }

  public async sendRpc(action: string, params: any = {}, taskId?: string, clientId?: string): Promise<any> {
    if (!this.isAgentConnected()) {
      throw {
        code: 'BROWSER_DISCONNECTED',
        message: 'No Local FlowBridge Agent is connected. Please connect the local agent using your pairing code.',
        suggestedRecovery: 'Start the Local FlowBridge Agent on your computer and pair it with FlowBridge.'
      };
    }

    const id = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const request = {
      id,
      type: 'COMMAND',
      action,
      params,
      taskId,
      clientId
    };

    return new Promise((resolve, reject) => {
      this.pendingRpcCalls.set(id, { resolve, reject });

      this.activeAgent!.ws.send(JSON.stringify({
        type: 'RPC_REQUEST',
        request
      }));

      // Timeout safety (2 minutes for standard actions, 5 mins for flow generation)
      const timeoutLimit = action === 'flow_generate' ? 300000 : 45000;
      setTimeout(() => {
        if (this.pendingRpcCalls.has(id)) {
          this.pendingRpcCalls.delete(id);
          reject({
            code: 'TIMEOUT',
            message: `Command "${action}" timed out after ${timeoutLimit / 1000}s without response from agent.`
          });
        }
      }, timeoutLimit);
    });
  }

  public triggerEmergencyStop(): void {
    console.warn('[AgentHub] EMERGENCY STOP TRIGGERED!');
    if (this.activeAgent && this.activeAgent.ws.readyState === WebSocket.OPEN) {
      this.activeAgent.ws.send(JSON.stringify({ type: 'EMERGENCY_STOP' }));
    }

    // Cancel all pending RPC calls
    for (const [id, cb] of this.pendingRpcCalls.entries()) {
      cb.reject({
        code: 'EMERGENCY_STOPPED',
        message: 'Action cancelled immediately by Emergency Stop.'
      });
    }
    this.pendingRpcCalls.clear();

    this.currentAction = 'EMERGENCY STOP TRIGGERED';
    this.taskProgress = 0;
    this.activeTaskId = null;
    this.broadcastLiveState();
  }

  public updateLiveContext(context: {
    activeTaskId?: string | null;
    currentAction?: string | null;
    taskProgress?: number;
    connectedAI?: string | null;
    latestScreenshot?: string | null;
    googleFlowStatus?: FlowSystemStatus;
  }): void {
    if (context.activeTaskId !== undefined) this.activeTaskId = context.activeTaskId;
    if (context.currentAction !== undefined) this.currentAction = context.currentAction;
    if (context.taskProgress !== undefined) this.taskProgress = context.taskProgress;
    if (context.connectedAI !== undefined) this.connectedAI = context.connectedAI;
    if (context.latestScreenshot !== undefined) this.latestScreenshot = context.latestScreenshot;
    if (context.googleFlowStatus !== undefined) this.googleFlowStatus = context.googleFlowStatus;

    this.broadcastLiveState();
  }

  public getLiveSnapshot(): LiveStateSnapshot {
    const agent = this.activeAgent;
    const currentTask = this.activeTaskId ? db.getTask(this.activeTaskId) || null : null;

    return {
      connectedAI: this.connectedAI || 'ChatGPT',
      activeTaskId: this.activeTaskId,
      currentTask,
      currentAction: this.currentAction,
      browserStatus: agent?.info.currentBrowser?.connected ? 'CONNECTED' : (agent ? 'LAUNCHING' : 'DISCONNECTED'),
      googleFlowStatus: this.googleFlowStatus,
      liveScreenshot: this.latestScreenshot,
      taskProgress: this.taskProgress,
      recentLogs: db.getActivity(12),
      agentStatus: this.getAgentStatus(),
      agentInfo: this.getAgentInfo()
    };
  }

  public broadcastLiveState(): void {
    const snapshot = this.getLiveSnapshot();
    const payload = JSON.stringify({ type: 'LIVE_SNAPSHOT', data: snapshot });

    for (const ws of this.uiSubscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {}
      }
    }
  }
}

export const agentHub = new AgentHub();
