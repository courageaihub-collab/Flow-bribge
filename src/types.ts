/**
 * FlowBridge - Types & Core Interfaces
 */

export type AgentStatus = 'CONNECTED' | 'DISCONNECTED' | 'AUTHENTICATING' | 'ERROR' | 'BUSY' | 'IDLE';

export type TaskStatus = 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED';

export type PermissionLevel = 'READ' | 'CONTROL' | 'EXECUTE';

export type AIClientType = 'chatgpt' | 'gemini' | 'claude' | 'custom';

export type FlowSystemStatus = 
  | 'DISCONNECTED' 
  | 'NAVIGATING' 
  | 'PROJECT_LIST' 
  | 'WORKSPACE_OPEN' 
  | 'PROMPT_READY' 
  | 'GENERATING' 
  | 'RESULT_DETECTED' 
  | 'ERROR' 
  | 'SESSION_EXPIRED';

export type FailureCode = 
  | 'ELEMENT_NOT_FOUND' 
  | 'GENERATION_FAILED' 
  | 'BROWSER_DISCONNECTED' 
  | 'FLOW_SESSION_EXPIRED' 
  | 'MCP_AUTH_FAILED'
  | 'PERMISSION_DENIED'
  | 'EMERGENCY_STOPPED';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  apiKey: string;
  createdAt: string;
}

export interface AIClient {
  id: string;
  name: string;
  type: AIClientType;
  status: 'CONNECTED' | 'DISCONNECTED';
  permissions: PermissionLevel[];
  lastActivity: string;
  activeTaskId?: string;
  connectedDate: string;
  apiKey: string;
  icon?: string;
}

export interface LocalAgentInfo {
  id: string;
  name: string;
  status: AgentStatus;
  version: string;
  platform: string;
  connectedAt?: string;
  lastPing?: string;
  currentBrowser?: {
    connected: boolean;
    currentUrl: string;
    title: string;
    cdpEndpoint?: string;
    viewport?: { width: number; height: number };
  };
}

export interface TaskItem {
  id: string;
  userId: string;
  clientId: string;
  clientName?: string;
  type: string;
  command: string;
  status: TaskStatus;
  currentAction?: string;
  progress: number; // 0 - 100
  browserSessionId?: string;
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: {
    code: FailureCode;
    message: string;
    details?: any;
    screenshot?: string;
    currentUrl?: string;
    suggestedRecovery?: string;
  };
}

export interface ResultItem {
  id: string;
  userId: string;
  taskId: string;
  projectId?: string;
  projectName?: string;
  type: 'image' | 'video' | 'screenshot';
  mediaUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  aiAnalysis?: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  createdAt: string;
  metadata?: {
    dimensions?: { width: number; height: number };
    durationSeconds?: number;
    mimeType?: string;
    fileSizeBytes?: number;
    scene?: number | string;
  };
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  timestamp: string;
  aiClient: string;
  mcpTool: string;
  task?: string;
  browserAction?: string;
  result?: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'CANCELLED';
  durationMs?: number;
  error?: string;
}

export interface SystemSettings {
  id: string;
  userId: string;
  permissionLevels: {
    READ: boolean;
    CONTROL: boolean;
    EXECUTE: boolean;
  };
  dangerousActionConfirmation: boolean;
  browserConfig: {
    defaultCdpEndpoint: string;
    headless: boolean;
    viewportWidth: number;
    viewportHeight: number;
    defaultTimeoutMs: number;
    generationPollingIntervalMs: number;
  };
  pairingCode?: {
    code: string;
    expiresAt: string;
  };
}

export interface LiveStateSnapshot {
  connectedAI: string | null;
  activeTaskId: string | null;
  currentTask: TaskItem | null;
  currentAction: string | null;
  browserStatus: 'CONNECTED' | 'DISCONNECTED' | 'LAUNCHING' | 'ERROR';
  googleFlowStatus: FlowSystemStatus;
  liveScreenshot: string | null; // base64 or URL
  taskProgress: number;
  recentLogs: ActivityLogItem[];
  agentStatus: AgentStatus;
  agentInfo: LocalAgentInfo | null;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  permission: PermissionLevel;
}

export type FlowBridgeSettings = SystemSettings;
