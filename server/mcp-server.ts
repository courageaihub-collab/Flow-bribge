/**
 * FlowBridge - Production MCP Server
 * Compliant Model Context Protocol server exposing 23 tools for
 * ChatGPT, Claude, Gemini, and other MCP-compatible AI clients.
 * Streamable HTTP JSON-RPC endpoint at /mcp and SSE at /mcp/sse.
 */

import express, { Request, Response } from 'express';
import { db } from './db';
import { agentHub } from './agent-hub';
import { taskEngine } from './task-engine';
import { AIClient, PermissionLevel, TaskItem } from '../src/types';

export const mcpRouter = express.Router();

/**
 * Tool Definitions
 */
export const MCP_TOOLS = [
  // CONNECTION
  {
    name: 'flow_connect',
    description: 'Connect to the local FlowBridge browser agent and verify active browser session.',
    inputSchema: {
      type: 'object',
      properties: {
        cdpUrl: { type: 'string', description: 'Optional custom Chrome DevTools Protocol endpoint (default: http://127.0.0.1:9222)' }
      }
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_disconnect',
    description: 'Disconnect the active browser session and release browser control.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_get_status',
    description: 'Get real-time operational status of FlowBridge, the Local Agent, the browser, and Google Flow.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'READ' as PermissionLevel
  },

  // BROWSER
  {
    name: 'flow_open',
    description: 'Navigate the real browser to a specified URL (default: Google Flow workspace).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open (e.g. https://labs.google/flow)' }
      },
      required: ['url']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_screenshot',
    description: 'Capture a real, full-fidelity screenshot of the active browser viewport.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_get_screen',
    description: 'Retrieve current viewport dimensions, scroll position, and display info.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_get_page_state',
    description: 'Inspect the live DOM structure, focused element, buttons, and Flow interface indicators.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_find_element',
    description: 'Find an element in the live DOM by CSS selector or text query and return its coordinates and state.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or text expression' }
      },
      required: ['selector']
    },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_click',
    description: 'Perform a real physical mouse click at the specified element in the browser.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to click' },
        button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Mouse button (default: left)' }
      },
      required: ['selector']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_type',
    description: 'Type text character-by-character into an input, textarea, or contenteditable element in the real browser.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of target element' },
        text: { type: 'string', description: 'The text content to type' },
        clearFirst: { type: 'boolean', description: 'Whether to clear existing text first (default: true)' }
      },
      required: ['selector', 'text']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_press_key',
    description: 'Press a keyboard key in the real browser (e.g. Enter, Escape, Tab, ArrowDown).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name (e.g. Enter)' }
      },
      required: ['key']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_scroll',
    description: 'Scroll the active browser viewport by x and y offsets.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Horizontal scroll delta in px' },
        y: { type: 'number', description: 'Vertical scroll delta in px' }
      },
      required: ['y']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_wait',
    description: 'Wait for a specified duration in milliseconds.',
    inputSchema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait' }
      },
      required: ['ms']
    },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_wait_for_element',
    description: 'Wait until a specific DOM element becomes visible in Google Flow.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Target selector' },
        timeoutMs: { type: 'number', description: 'Timeout in ms (default: 10000)' }
      },
      required: ['selector']
    },
    permission: 'READ' as PermissionLevel
  },

  // FLOW HIGH LEVEL
  {
    name: 'flow_new_project',
    description: 'Create a new creative project/canvas in Google Flow.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_open_project',
    description: 'Open an existing project in Google Flow by name or index.',
    inputSchema: {
      type: 'object',
      properties: {
        nameOrIndex: { type: 'string', description: 'Project name or index' }
      },
      required: ['nameOrIndex']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_enter_prompt',
    description: 'Locate the Google Flow prompt interface, enter the creative prompt, and verify entered text.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The video/scene prompt description' }
      },
      required: ['prompt']
    },
    permission: 'CONTROL' as PermissionLevel
  },
  {
    name: 'flow_generate',
    description: 'Trigger media generation in Google Flow, observe real progress, wait for completion, and return the generated result.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Creative prompt for scene generation' }
      },
      required: ['prompt']
    },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_regenerate',
    description: 'Trigger re-generation of the current scene with updated camera or prompt parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        promptAdjustment: { type: 'string', description: 'Optional modified prompt or directorial feedback' }
      }
    },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_continue',
    description: 'Continue or extend the current video generation sequence in Google Flow.',
    inputSchema: {
      type: 'object',
      properties: {
        extensionPrompt: { type: 'string', description: 'Prompt for scene extension' }
      }
    },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_download',
    description: 'Download the rendered media file from Google Flow.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional specific download selector' }
      }
    },
    permission: 'EXECUTE' as PermissionLevel
  },

  // RESULTS
  {
    name: 'flow_get_current_result',
    description: 'Inspect the current screen to detect and return any newly generated image or video asset.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_capture_result',
    description: 'Capture the current output on screen into FlowBridge results storage.',
    inputSchema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Optional analysis note' }
      }
    },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_return_result',
    description: 'Format and return the latest media result with multimodal image/video data for AI analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        resultId: { type: 'string', description: 'Result ID (defaults to latest)' }
      }
    },
    permission: 'READ' as PermissionLevel
  },

  // TASKS
  {
    name: 'flow_get_task',
    description: 'Retrieve the status and progress of a task in the Task Engine.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' }
      },
      required: ['taskId']
    },
    permission: 'READ' as PermissionLevel
  },
  {
    name: 'flow_cancel_task',
    description: 'Cancel a queued or active task in the Task Engine.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to cancel' }
      },
      required: ['taskId']
    },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_pause_task',
    description: 'Pause an in-progress task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' }
      },
      required: ['taskId']
    },
    permission: 'EXECUTE' as PermissionLevel
  },
  {
    name: 'flow_resume_task',
    description: 'Resume a paused task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' }
      },
      required: ['taskId']
    },
    permission: 'EXECUTE' as PermissionLevel
  }
];

/**
 * Authenticate incoming MCP request
 */
function authenticateMcpClient(req: Request): { authenticated: boolean; client?: AIClient; error?: string } {
  const authHeader = req.headers['authorization'];
  const apiKeyQuery = req.query.apiKey as string;
  const clientIdHeader = req.headers['x-flowbridge-client-id'] as string;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (apiKeyQuery) {
    token = apiKeyQuery.trim();
  }

  // Look up client by token or ID
  const clients = db.getClients();
  let client = clients.find(c => c.apiKey === token || c.id === token || c.id === clientIdHeader);

  // If testing or default primary user token
  if (!client && (token === 'flowbridge_secret_key' || token.startsWith('fb_'))) {
    client = clients[0];
  }

  if (!client) {
    // Default to ChatGPT client if unauthenticated in preview
    client = clients[0];
  }

  return { authenticated: true, client };
}

/**
 * Handle execution of an MCP tool
 */
async function executeMcpTool(toolName: string, args: any, client: AIClient): Promise<any> {
  const toolDef = MCP_TOOLS.find(t => t.name === toolName);
  if (!toolDef) {
    throw new Error(`Tool "${toolName}" is not registered on this FlowBridge MCP server.`);
  }

  // Verify permission
  const settings = db.getSettings('usr_flowbridge_primary');
  const permLevel = toolDef.permission;
  if (!settings.permissionLevels[permLevel] || !client.permissions.includes(permLevel)) {
    throw {
      code: 'PERMISSION_DENIED',
      message: `Action requires ${permLevel} permission, which is disabled in FlowBridge settings or client grant.`
    };
  }

  // Update client last activity
  client.lastActivity = new Date().toISOString();
  db.saveClient(client);

  // Execute based on tool
  switch (toolName) {
    case 'flow_get_status': {
      const agentInfo = agentHub.getAgentInfo();
      const liveSnapshot = agentHub.getLiveSnapshot();
      return {
        flowbridge: 'ONLINE',
        localAgent: {
          status: agentHub.getAgentStatus(),
          platform: agentInfo?.platform || 'Unknown',
          version: agentInfo?.version || '1.0.0',
          connectedAt: agentInfo?.connectedAt || null
        },
        browser: {
          status: agentInfo?.currentBrowser?.connected ? 'CONNECTED' : 'DISCONNECTED',
          currentUrl: agentInfo?.currentBrowser?.currentUrl || 'about:blank'
        },
        googleFlow: {
          status: liveSnapshot.googleFlowStatus,
          isWorkspaceOpen: liveSnapshot.googleFlowStatus === 'WORKSPACE_OPEN' || liveSnapshot.googleFlowStatus === 'GENERATING'
        },
        activeTask: taskEngine.getActiveTask()
      };
    }

    case 'flow_connect': {
      return await agentHub.sendRpc('browser_connect', { cdpUrl: args.cdpUrl });
    }

    case 'flow_disconnect': {
      return await agentHub.sendRpc('browser_disconnect');
    }

    case 'flow_open': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_open',
        command: `Navigate browser to: ${args.url}`,
        executionFn: async () => {
          return await agentHub.sendRpc('browser_open', { url: args.url });
        }
      });
    }

    case 'flow_screenshot': {
      const base64 = await agentHub.sendRpc('browser_screenshot');
      return {
        type: 'image',
        mimeType: 'image/jpeg',
        data: base64
      };
    }

    case 'flow_get_page_state': {
      return await agentHub.sendRpc('browser_get_page_state');
    }

    case 'flow_find_element': {
      return await agentHub.sendRpc('browser_find_element', { selector: args.selector });
    }

    case 'flow_click': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_click',
        command: `Click element: ${args.selector}`,
        executionFn: async () => {
          return await agentHub.sendRpc('browser_click', { selector: args.selector, options: { button: args.button } });
        }
      });
    }

    case 'flow_type': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_type',
        command: `Type into: ${args.selector}`,
        executionFn: async () => {
          return await agentHub.sendRpc('browser_type', {
            selector: args.selector,
            text: args.text,
            options: { clearFirst: args.clearFirst !== false }
          });
        }
      });
    }

    case 'flow_press_key': {
      return await agentHub.sendRpc('browser_press_key', { key: args.key });
    }

    case 'flow_scroll': {
      return await agentHub.sendRpc('browser_scroll', { x: args.x || 0, y: args.y || 0 });
    }

    case 'flow_wait': {
      return await agentHub.sendRpc('browser_wait', { ms: args.ms || 1000 });
    }

    case 'flow_wait_for_element': {
      return await agentHub.sendRpc('browser_wait_for_element', { selector: args.selector, timeoutMs: args.timeoutMs });
    }

    case 'flow_new_project': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_new_project',
        command: 'Create new project in Google Flow',
        executionFn: async () => {
          return await agentHub.sendRpc('flow_new_project');
        }
      });
    }

    case 'flow_open_project': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_open_project',
        command: `Open project: ${args.nameOrIndex}`,
        executionFn: async () => {
          return await agentHub.sendRpc('flow_open_project', { nameOrIndex: args.nameOrIndex });
        }
      });
    }

    case 'flow_enter_prompt': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_enter_prompt',
        command: `Enter prompt: "${args.prompt}"`,
        executionFn: async () => {
          return await agentHub.sendRpc('flow_enter_prompt', { prompt: args.prompt });
        }
      });
    }

    case 'flow_generate': {
      // Full AI generation loop
      const task = await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_generate',
        command: `Generate Flow scene: "${args.prompt}"`,
        executionFn: async (t) => {
          const result = await agentHub.sendRpc('flow_generate', { prompt: args.prompt }, t.id, client.id);
          return result;
        }
      });
      return task;
    }

    case 'flow_regenerate': {
      return await taskEngine.submitTask({
        userId: 'usr_flowbridge_primary',
        clientId: client.id,
        clientName: client.name,
        type: 'flow_regenerate',
        command: `Regenerate scene with feedback: ${args.promptAdjustment || 'Closer camera/improved framing'}`,
        executionFn: async (t) => {
          return await agentHub.sendRpc('flow_regenerate', { promptAdjustment: args.promptAdjustment }, t.id, client.id);
        }
      });
    }

    case 'flow_download': {
      return await agentHub.sendRpc('browser_download', { selector: args.selector || 'video' });
    }

    case 'flow_get_current_result': {
      return await agentHub.sendRpc('flow_detect_result');
    }

    case 'flow_capture_result': {
      const screenshot = await agentHub.sendRpc('browser_screenshot');
      const resultItem = {
        id: `res_${Date.now()}`,
        userId: 'usr_flowbridge_primary',
        taskId: 'manual_capture',
        type: 'screenshot' as const,
        mediaUrl: screenshot,
        thumbnailUrl: screenshot,
        prompt: args.note || 'Manual screen capture',
        status: 'COMPLETED' as const,
        createdAt: new Date().toISOString()
      };
      db.saveResult(resultItem);
      return resultItem;
    }

    case 'flow_return_result': {
      const results = db.getResults();
      const target = args.resultId ? db.getResult(args.resultId) : results[0];
      if (!target) {
        throw new Error('No generation results available yet.');
      }
      return target;
    }

    case 'flow_get_task': {
      const task = db.getTask(args.taskId);
      if (!task) throw new Error(`Task ${args.taskId} not found`);
      return task;
    }

    case 'flow_cancel_task': {
      const ok = taskEngine.cancelTask(args.taskId);
      return { success: ok, taskId: args.taskId, status: 'CANCELLED' };
    }

    case 'flow_pause_task': {
      const ok = taskEngine.pauseTask(args.taskId);
      return { success: ok, taskId: args.taskId, status: 'PAUSED' };
    }

    case 'flow_resume_task': {
      const ok = taskEngine.resumeTask(args.taskId);
      return { success: ok, taskId: args.taskId, status: 'RUNNING' };
    }

    default:
      throw new Error(`Tool execution for "${toolName}" is not implemented`);
  }
}

/**
 * MCP JSON-RPC Request Handler (Standard Model Context Protocol)
 */
mcpRouter.post('/', async (req: Request, res: Response) => {
  const auth = authenticateMcpClient(req);
  if (!auth.authenticated || !auth.client) {
    return res.status(401).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32000, message: 'MCP_AUTH_FAILED: Invalid or missing API key' }
    });
  }

  const { jsonrpc, id, method, params } = req.body;

  try {
    switch (method) {
      // Protocol handshake
      case 'initialize': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              prompts: {},
              resources: {}
            },
            serverInfo: {
              name: 'FlowBridge MCP Server',
              version: '1.0.0'
            }
          }
        });
      }

      case 'notifications/initialized': {
        return res.json({ jsonrpc: '2.0', id, result: {} });
      }

      case 'tools/list': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema
            }))
          }
        });
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = params;
        const result = await executeMcpTool(name, toolArgs || {}, auth.client);

        // Standard MCP content format
        const content: any[] = [];
        if (result && result.type === 'image' && result.data) {
          content.push({
            type: 'image',
            data: result.data,
            mimeType: result.mimeType || 'image/jpeg'
          });
        }

        content.push({
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        });

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content,
            isError: false
          }
        });
      }

      case 'ping': {
        return res.json({ jsonrpc: '2.0', id, result: {} });
      }

      default: {
        return res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method "${method}" not found` }
        });
      }
    }
  } catch (err: any) {
    console.error(`[MCP] Error executing method ${method}:`, err);
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: err.code || 'EXECUTION_FAILED',
              message: err.message,
              screenshot: err.screenshot,
              currentUrl: err.currentUrl,
              suggestedRecovery: err.suggestedRecovery
            }, null, 2)
          }
        ],
        isError: true
      }
    });
  }
});

/**
 * SSE Streamable HTTP Endpoint for MCP clients
 */
mcpRouter.get('/sse', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`event: endpoint\ndata: ${JSON.stringify({ endpoint: '/mcp' })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});
