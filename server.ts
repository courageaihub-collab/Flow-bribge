/**
 * FlowBridge - Main Server Entry Point
 * Full-stack Express server + WebSocket Hub + MCP Server + Vite Middleware
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { agentHub } from './server/agent-hub';
import { taskEngine } from './server/task-engine';
import { mcpRouter, MCP_TOOLS } from './server/mcp-server';

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers for local agent & external MCP clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-flowbridge-client-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount MCP Server endpoint at /mcp
  app.use('/mcp', mcpRouter);

  // REST API Routes
  const apiRouter = express.Router();

  // Health check
  apiRouter.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'FlowBridge Orchestration Engine',
      version: '1.0.0',
      agentConnected: agentHub.isAgentConnected(),
      time: new Date().toISOString()
    });
  });

  // Live Snapshot
  apiRouter.get('/snapshot', (req, res) => {
    res.json(agentHub.getLiveSnapshot());
  });

  // Pairing code generation
  apiRouter.post('/agent/pair', (req, res) => {
    const code = db.createPairingCode('usr_flowbridge_primary');
    res.json({
      code,
      expiresInMinutes: 15,
      instructions: `Run on your computer: npm run agent -- --pair=${code}`
    });
  });

  // Emergency stop
  apiRouter.post('/agent/emergency-stop', (req, res) => {
    taskEngine.emergencyStop();
    res.json({ success: true, message: 'Emergency stop executed. All actions halted.' });
  });

  // AI Clients
  apiRouter.get('/clients', (req, res) => {
    res.json(db.getClients());
  });

  apiRouter.post('/clients', (req, res) => {
    const { name, type, permissions } = req.body;
    const client = {
      id: `client_${Date.now()}`,
      name: name || 'New AI Client',
      type: type || 'custom',
      status: 'CONNECTED' as const,
      permissions: permissions || ['READ', 'CONTROL'],
      lastActivity: new Date().toISOString(),
      connectedDate: new Date().toISOString(),
      apiKey: `fb_key_${Math.random().toString(36).substr(2, 16)}`
    };
    db.saveClient(client);
    res.json(client);
  });

  apiRouter.delete('/clients/:id', (req, res) => {
    // Soft removal
    const clients = db.getClients();
    const target = clients.find(c => c.id === req.params.id);
    if (target) {
      target.status = 'DISCONNECTED';
      db.saveClient(target);
    }
    res.json({ success: true });
  });

  // Tasks
  apiRouter.get('/tasks', (req, res) => {
    res.json({
      tasks: db.getTasks(),
      activeTask: taskEngine.getActiveTask(),
      queue: taskEngine.getQueue()
    });
  });

  apiRouter.post('/tasks/:id/cancel', (req, res) => {
    const success = taskEngine.cancelTask(req.params.id);
    res.json({ success });
  });

  apiRouter.post('/tasks/:id/pause', (req, res) => {
    const success = taskEngine.pauseTask(req.params.id);
    res.json({ success });
  });

  apiRouter.post('/tasks/:id/resume', (req, res) => {
    const success = taskEngine.resumeTask(req.params.id);
    res.json({ success });
  });

  // Manual tool test invoker from dashboard
  apiRouter.post('/tools/invoke', async (req, res) => {
    const { tool, params } = req.body;
    try {
      const clients = db.getClients();
      const primaryClient = clients[0];
      const task = await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: primaryClient.id,
        clientName: primaryClient.name,
        type: tool,
        command: `Manual Web UI Command: ${tool}`,
        executionFn: async () => {
          let actionName = tool.replace(/^flow_/, 'browser_');
          if (tool.startsWith('flow_generate') || tool.startsWith('flow_open') || tool.startsWith('flow_new_project') || tool.startsWith('flow_enter_prompt')) {
            actionName = tool;
          }
          return await agentHub.sendRpc(actionName, params || {});
        }
      });
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });

  // Results
  apiRouter.get('/results', (req, res) => {
    res.json(db.getResults());
  });

  // Activity Log
  apiRouter.get('/activity', (req, res) => {
    res.json(db.getActivity(150));
  });

  // Settings
  apiRouter.get('/settings', (req, res) => {
    res.json(db.getSettings('usr_flowbridge_primary'));
  });

  apiRouter.post('/settings', (req, res) => {
    const settings = {
      ...db.getSettings('usr_flowbridge_primary'),
      ...req.body
    };
    db.saveSettings(settings);
    res.json(settings);
  });

  // Tools Metadata list for UI
  apiRouter.get('/mcp/tools', (req, res) => {
    res.json(MCP_TOOLS);
  });

  // Live SSE Stream for web UI
  apiRouter.get('/live/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendUpdate = () => {
      const data = JSON.stringify(agentHub.getLiveSnapshot());
      res.write(`data: ${data}\n\n`);
    };

    sendUpdate();
    const interval = setInterval(sendUpdate, 1500);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  app.use('/api', apiRouter);

  // WebSocket Server for Agent and Live UI
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';

    if (pathname === '/ws/agent') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Handled by AgentHub
        wss.emit('agent_connection', ws, request);
      });
    } else if (pathname === '/ws/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        agentHub.registerUiSubscriber(ws as any);
      });
    } else {
      socket.destroy();
    }
  });

  const agentWss = new WebSocketServer({ noServer: true });
  wss.on('agent_connection', (ws: WebSocket) => {
    agentWss.emit('connection', ws);
  });
  agentHub.attachAgentWss(agentWss);

  // Vite middleware in dev, Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` FlowBridge Server running on http://0.0.0.0:${PORT} `);
    console.log(` MCP Endpoint: http://0.0.0.0:${PORT}/mcp           `);
    console.log(` Local Agent WS: ws://0.0.0.0:${PORT}/ws/agent     `);
    console.log(`====================================================`);
  });
}

startServer().catch((e) => {
  console.error('Failed to start FlowBridge server:', e);
});
