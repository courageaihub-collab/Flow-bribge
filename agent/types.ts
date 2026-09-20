/**
 * FlowBridge Local Agent - Core Types & Browser Controller Interfaces
 */

export interface PageState {
  url: string;
  title: string;
  ready: boolean;
  activeElementTag?: string;
  activeElementId?: string;
  headings: string[];
  buttonCount: number;
  inputCount: number;
  hasFlowCanvas: boolean;
  hasFlowVideo: boolean;
  hasFlowPrompt: boolean;
  domSummaryText: string;
}

export interface ElementInfo {
  found: boolean;
  selector: string;
  tag?: string;
  text?: string;
  value?: string;
  attributes?: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  disabled?: boolean;
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delayMs?: number;
}

export interface TypeOptions {
  clearFirst?: boolean;
  delayMs?: number;
}

/**
 * Required BrowserController Abstraction
 */
export interface BrowserController {
  connect(cdpUrl?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  open(url: string): Promise<boolean>;
  getCurrentUrl(): Promise<string>;
  getPageState(): Promise<PageState>;
  screenshot(): Promise<string>; // Returns base64 PNG/JPEG
  click(selector: string, options?: ClickOptions): Promise<boolean>;
  type(selector: string, text: string, options?: TypeOptions): Promise<boolean>;
  pressKey(key: string): Promise<boolean>;
  scroll(x: number, y: number): Promise<boolean>;
  wait(ms: number): Promise<void>;
  waitForElement(selector: string, timeoutMs?: number): Promise<ElementInfo>;
  findElement(selector: string): Promise<ElementInfo>;
  inspectElements(selector: string): Promise<ElementInfo[]>;
  download(selector: string): Promise<{ filename: string; dataBase64?: string; downloadUrl?: string }>;
  upload(selector: string, filePath: string): Promise<boolean>;
  close(): Promise<void>;
}

export type AgentStatus = 'CONNECTED' | 'DISCONNECTED' | 'AUTHENTICATING' | 'ERROR' | 'BUSY' | 'IDLE';

export interface AgentRpcRequest {
  id: string;
  type: 'COMMAND' | 'FLOW_ACTION' | 'PING' | 'EMERGENCY_STOP';
  action: string;
  params?: any;
  taskId?: string;
  clientId?: string;
}

export interface AgentRpcResponse {
  id: string;
  taskId?: string;
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    screenshot?: string;
    currentUrl?: string;
    suggestedRecovery?: string;
  };
}

export interface AgentStatusUpdate {
  type: 'STATUS_UPDATE';
  status: AgentStatus;
  currentAction?: string;
  progress?: number;
  screenshot?: string;
  currentUrl?: string;
  flowState?: string;
  taskId?: string;
}
