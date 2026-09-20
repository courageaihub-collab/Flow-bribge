/**
 * FlowBridge - Persistent Database Engine
 * Stores users, connections, projects, tasks, results, activity, settings, browserSessions.
 * Persists to disk in ./data/flowbridge-db.json and maps seamlessly to Firestore.
 */

import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  AIClient,
  TaskItem,
  ResultItem,
  ActivityLogItem,
  SystemSettings,
  LocalAgentInfo
} from '../src/types';

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  connections: Record<string, AIClient>;
  projects: Record<string, any>;
  tasks: Record<string, TaskItem>;
  results: Record<string, ResultItem>;
  activity: ActivityLogItem[];
  settings: Record<string, SystemSettings>;
  browserSessions: Record<string, any>;
  agentInfo: LocalAgentInfo | null;
  pairingCodes: Record<string, { code: string; userId: string; expiresAt: number }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'flowbridge-db.json');

class FlowBridgeDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.load();
    this.seedDefaultUserIfEmpty();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {}
    }
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[DB] Could not parse existing DB file, reinitializing default schema');
      }
    }

    return {
      users: {},
      connections: {},
      projects: {},
      tasks: {},
      results: {},
      activity: [],
      settings: {},
      browserSessions: {},
      agentInfo: null,
      pairingCodes: {}
    };
  }

  public save(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e: any) {
      console.error('[DB] Failed to save database:', e.message);
    }
  }

  private seedDefaultUserIfEmpty(): void {
    const defaultUserId = 'usr_flowbridge_primary';
    if (!this.data.users[defaultUserId]) {
      this.data.users[defaultUserId] = {
        id: defaultUserId,
        email: 'courageaihub@gmail.com',
        displayName: 'Creative Operator',
        apiKey: 'fb_key_live_9a8b7c6d5e4f3a2b1c',
        createdAt: new Date().toISOString()
      };
    }

    // Seed default AI Clients
    if (Object.keys(this.data.connections).length === 0) {
      const clients: AIClient[] = [
        {
          id: 'client_chatgpt',
          name: 'ChatGPT Plus / Team (OpenAI)',
          type: 'chatgpt',
          status: 'CONNECTED',
          permissions: ['READ', 'CONTROL', 'EXECUTE'],
          lastActivity: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          connectedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          apiKey: 'fb_ai_chatgpt_live_token'
        },
        {
          id: 'client_gemini',
          name: 'Gemini Pro / Flash (Google)',
          type: 'gemini',
          status: 'CONNECTED',
          permissions: ['READ', 'CONTROL', 'EXECUTE'],
          lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          connectedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          apiKey: 'fb_ai_gemini_live_token'
        },
        {
          id: 'client_claude',
          name: 'Claude 3.7 Sonnet (Anthropic)',
          type: 'claude',
          status: 'CONNECTED',
          permissions: ['READ', 'CONTROL', 'EXECUTE'],
          lastActivity: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          connectedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
          apiKey: 'fb_ai_claude_live_token'
        }
      ];

      for (const c of clients) {
        this.data.connections[c.id] = c;
      }
    }

    // Seed settings
    if (!this.data.settings[defaultUserId]) {
      this.data.settings[defaultUserId] = {
        id: 'set_primary',
        userId: defaultUserId,
        permissionLevels: {
          READ: true,
          CONTROL: true,
          EXECUTE: true
        },
        dangerousActionConfirmation: true,
        browserConfig: {
          defaultCdpEndpoint: 'http://127.0.0.1:9222',
          headless: false,
          viewportWidth: 1920,
          viewportHeight: 1080,
          defaultTimeoutMs: 30000,
          generationPollingIntervalMs: 1500
        }
      };
    }

    this.save();
  }

  // Users
  getUser(userId: string): UserProfile | undefined {
    return this.data.users[userId];
  }

  getPrimaryUser(): UserProfile {
    const first = Object.values(this.data.users)[0];
    if (first) return first;
    this.seedDefaultUserIfEmpty();
    return Object.values(this.data.users)[0];
  }

  // AI Clients
  getClients(): AIClient[] {
    return Object.values(this.data.connections);
  }

  getClient(id: string): AIClient | undefined {
    return this.data.connections[id];
  }

  saveClient(client: AIClient): void {
    this.data.connections[client.id] = client;
    this.save();
  }

  // Tasks
  getTasks(): TaskItem[] {
    return Object.values(this.data.tasks).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getTask(id: string): TaskItem | undefined {
    return this.data.tasks[id];
  }

  saveTask(task: TaskItem): void {
    this.data.tasks[task.id] = task;
    this.save();
  }

  // Results
  getResults(): ResultItem[] {
    return Object.values(this.data.results).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getResult(id: string): ResultItem | undefined {
    return this.data.results[id];
  }

  saveResult(result: ResultItem): void {
    this.data.results[result.id] = result;
    this.save();
  }

  // Activity Log
  getActivity(limit: number = 100): ActivityLogItem[] {
    return this.data.activity.slice(0, limit);
  }

  logActivity(item: Omit<ActivityLogItem, 'id' | 'timestamp'>): ActivityLogItem {
    const logItem: ActivityLogItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...item
    };
    this.data.activity.unshift(logItem);
    if (this.data.activity.length > 500) {
      this.data.activity = this.data.activity.slice(0, 500);
    }
    this.save();
    return logItem;
  }

  // Settings
  getSettings(userId: string): SystemSettings {
    const s = this.data.settings[userId];
    if (s) return s;
    return this.getSettings('usr_flowbridge_primary');
  }

  saveSettings(settings: SystemSettings): void {
    this.data.settings[settings.userId] = settings;
    this.save();
  }

  // Agent pairing codes
  createPairingCode(userId: string): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `FB-${rand.slice(0, 4)}-${rand.slice(4)}`;
    this.data.pairingCodes[code] = {
      code,
      userId,
      expiresAt: Date.now() + 1000 * 60 * 15 // 15 mins
    };
    this.save();
    return code;
  }

  verifyPairingCode(code: string): { valid: boolean; userId?: string } {
    const entry = this.data.pairingCodes[code];
    if (!entry) return { valid: false };
    if (Date.now() > entry.expiresAt) {
      delete this.data.pairingCodes[code];
      this.save();
      return { valid: false };
    }
    // Delete once used
    delete this.data.pairingCodes[code];
    this.save();
    return { valid: true, userId: entry.userId };
  }

  // Local Agent status
  getAgentInfo(): LocalAgentInfo | null {
    return this.data.agentInfo;
  }

  setAgentInfo(info: LocalAgentInfo | null): void {
    this.data.agentInfo = info;
    this.save();
  }
}

export const db = new FlowBridgeDatabase();
