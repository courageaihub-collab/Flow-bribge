/**
 * FlowBridge Local Agent - Executable Service & CLI
 * Connects securely to the FlowBridge Cloud / Web Application,
 * controls the local user's browser, and automates Google Flow.
 */

import { WebSocket } from 'ws';
import readline from 'readline';
import { RealBrowserController } from './browser-controller';
import { GoogleFlowController } from './google-flow-controller';
import { AgentRpcRequest, AgentRpcResponse, AgentStatus } from './types';

export class FlowBridgeAgentService {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private pairingCode: string | null = null;
  private agentToken: string | null = null;
  private status: AgentStatus = 'DISCONNECTED';
  private browser: RealBrowserController;
  private flowController: GoogleFlowController;
  private activeTaskId: string | null = null;
  private isStopping = false;

  constructor(serverUrl: string = 'http://localhost:3000', pairingCode?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.pairingCode = pairingCode || null;
    this.browser = new RealBrowserController();
    this.flowController = new GoogleFlowController(this.browser);
  }

  async start(): Promise<void> {
    console.log('====================================================');
    console.log('       FlowBridge Local Browser Agent v1.0.0        ');
    console.log('       "Let AI control your creative workflow"      ');
    console.log('====================================================');

    if (!this.pairingCode) {
      this.pairingCode = await this.promptForPairingCode();
    }

    await this.connectToFlowBridge();
  }

  private promptForPairingCode(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nEnter FlowBridge Pairing Code from Web Dashboard (e.g. FB-8492-X1): ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private async connectToFlowBridge(): Promise<void> {
    const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/ws/agent';
    console.log(`\n[Agent] Connecting to FlowBridge at ${wsUrl}...`);
    this.status = 'AUTHENTICATING';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[Agent] WebSocket opened. Sending authentication handshake...');
        this.send({
          type: 'AUTH_HANDSHAKE',
          pairingCode: this.pairingCode,
          agentToken: this.agentToken,
          platform: process.platform,
          version: '1.0.0'
        });
      });

      this.ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          await this.handleServerMessage(msg);
        } catch (err: any) {
          console.error('[Agent] Error processing message:', err.message);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[Agent] Connection error:', err.message);
        this.status = 'ERROR';
      });

      this.ws.on('close', () => {
        console.log('[Agent] Connection closed. Status: DISCONNECTED');
        this.status = 'DISCONNECTED';
        // Auto-reconnect after 4s
        setTimeout(() => {
          if (this.status === 'DISCONNECTED') {
            this.connectToFlowBridge().catch(() => {});
          }
        }, 4000);
      });
    } catch (err: any) {
      this.status = 'ERROR';
      console.error('[Agent] Failed to establish connection:', err.message);
    }
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private async handleServerMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case 'AUTH_SUCCESS':
        this.agentToken = msg.agentToken;
        this.status = 'IDLE';
        console.log(`[Agent] Authenticated successfully! Agent ID: ${msg.agentId}`);
        console.log('[Agent] Status: CONNECTED & IDLE (Awaiting AI commands from FlowBridge)');

        // Connect browser automatically
        try {
          console.log('[Agent] Initializing browser connection...');
          await this.browser.connect();
          const pageState = await this.browser.getPageState();
          this.sendStatusUpdate({
            status: 'IDLE',
            currentAction: 'Browser connected',
            currentUrl: pageState.url
          });
        } catch (err: any) {
          console.warn('[Agent] Browser auto-connect note:', err.message);
        }
        break;

      case 'AUTH_FAILED':
        this.status = 'ERROR';
        console.error(`[Agent] Authentication failed: ${msg.reason}`);
        break;

      case 'EMERGENCY_STOP':
        console.warn('⚠️ [Agent] EMERGENCY STOP RECEIVED FROM FLOWBRIDGE!');
        this.isStopping = true;
        this.status = 'IDLE';
        this.activeTaskId = null;
        this.sendStatusUpdate({
          status: 'IDLE',
          currentAction: 'Emergency stop executed'
        });
        break;

      case 'RPC_REQUEST':
        await this.handleRpcRequest(msg.request);
        break;

      case 'PING':
        this.send({ type: 'PONG', timestamp: Date.now() });
        break;
    }
  }

  private async handleRpcRequest(req: AgentRpcRequest): Promise<void> {
    const { id, action, params, taskId } = req;
    this.activeTaskId = taskId || null;
    this.status = 'BUSY';
    this.isStopping = false;

    console.log(`[Agent] Executing action: ${action} for task: ${taskId || 'none'}`);

    try {
      let result: any = null;

      switch (action) {
        case 'browser_connect':
          result = await this.browser.connect(params?.cdpUrl);
          break;

        case 'browser_disconnect':
          await this.browser.disconnect();
          result = true;
          break;

        case 'browser_open':
          result = await this.browser.open(params.url);
          break;

        case 'browser_get_current_url':
          result = await this.browser.getCurrentUrl();
          break;

        case 'browser_get_page_state':
          result = await this.browser.getPageState();
          break;

        case 'browser_screenshot':
          result = await this.browser.screenshot();
          break;

        case 'browser_click':
          result = await this.browser.click(params.selector, params.options);
          break;

        case 'browser_type':
          result = await this.browser.type(params.selector, params.text, params.options);
          break;

        case 'browser_press_key':
          result = await this.browser.pressKey(params.key);
          break;

        case 'browser_scroll':
          result = await this.browser.scroll(params.x, params.y);
          break;

        case 'browser_wait':
          await this.browser.wait(params.ms || 1000);
          result = true;
          break;

        case 'browser_find_element':
          result = await this.browser.findElement(params.selector);
          break;

        case 'browser_wait_for_element':
          result = await this.browser.waitForElement(params.selector, params.timeoutMs);
          break;

        case 'browser_inspect_elements':
          result = await this.browser.inspectElements(params.selector);
          break;

        case 'browser_download':
          result = await this.browser.download(params.selector);
          break;

        // HIGH-LEVEL GOOGLE FLOW ACTIONS
        case 'flow_open':
          result = await this.flowController.navigation.openFlow();
          break;

        case 'flow_new_project':
          result = await this.flowController.projectManager.createNewProject();
          break;

        case 'flow_open_project':
          result = await this.flowController.projectManager.openProject(params.nameOrIndex);
          break;

        case 'flow_enter_prompt':
          result = await this.flowController.generation.enterPrompt(params.prompt);
          break;

        case 'flow_generate':
          // Full execution loop with progress updates
          result = await this.flowController.executeFullGeneration(
            params.prompt,
            (currAction, progress, screenshot) => {
              if (this.isStopping) return;
              this.sendStatusUpdate({
                status: 'BUSY',
                taskId,
                currentAction: currAction,
                progress,
                screenshot
              });
            }
          );
          break;

        case 'flow_regenerate':
          await this.flowController.generation.triggerRegeneration();
          result = await this.flowController.generation.observeUntilCompletion(
            (currAction, progress, screenshot) => {
              this.sendStatusUpdate({ status: 'BUSY', taskId, currentAction: currAction, progress, screenshot });
            }
          );
          break;

        case 'flow_get_state':
          result = await this.flowController.stateDetector.detectState();
          break;

        case 'flow_detect_result':
          result = await this.flowController.resultDetector.detectResult();
          break;

        default:
          throw new Error(`Unknown agent action: ${action}`);
      }

      this.status = 'IDLE';
      this.activeTaskId = null;

      this.sendResponse({
        id,
        taskId,
        success: true,
        result
      });
    } catch (err: any) {
      console.error(`[Agent] Action ${action} failed:`, err.message);
      this.status = 'IDLE';
      this.activeTaskId = null;

      let screenshot: string | undefined;
      let currentUrl: string | undefined;
      try {
        screenshot = await this.browser.screenshot();
        currentUrl = await this.browser.getCurrentUrl();
      } catch {}

      this.sendResponse({
        id,
        taskId,
        success: false,
        error: {
          code: err.message.includes('ELEMENT_NOT_FOUND') ? 'ELEMENT_NOT_FOUND' : 'ACTION_FAILED',
          message: err.message,
          screenshot,
          currentUrl,
          suggestedRecovery: 'Check that Google Flow workspace is focused and prompt input is visible.'
        }
      });
    }
  }

  private sendStatusUpdate(data: Partial<any>): void {
    this.send({
      type: 'STATUS_UPDATE',
      status: this.status,
      ...data
    });
  }

  private sendResponse(res: AgentRpcResponse): void {
    this.send({
      type: 'RPC_RESPONSE',
      response: res
    });
  }
}

// CLI Execution entry point
if (process.argv[1] && process.argv[1].includes('agent/index')) {
  const args = process.argv.slice(2);
  let pairArg: string | undefined;
  let serverArg = process.env.FLOWBRIDGE_SERVER_URL || 'http://localhost:3000';

  for (const a of args) {
    if (a.startsWith('--pair=')) pairArg = a.replace('--pair=', '');
    if (a.startsWith('--server=')) serverArg = a.replace('--server=', '');
  }

  const agent = new FlowBridgeAgentService(serverArg, pairArg);
  agent.start().catch((e) => {
    console.error('Fatal agent error:', e);
  });
}
