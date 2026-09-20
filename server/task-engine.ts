/**
 * FlowBridge - TaskEngine
 * Handles task queueing, single concurrent execution, pausing, resuming,
 * cancelling, emergency stop, and progress tracking.
 */

import { db } from './db';
import { agentHub } from './agent-hub';
import { TaskItem, TaskStatus, ResultItem } from '../src/types';

export class TaskEngine {
  private queue: string[] = []; // Task IDs waiting
  private runningTaskId: string | null = null;
  private isProcessing = false;

  constructor() {}

  /**
   * Submit a new task into the engine
   */
  public async submitTask(params: {
    userId: string;
    clientId: string;
    clientName?: string;
    type: string;
    command: string;
    executionFn: (task: TaskItem) => Promise<any>;
  }): Promise<TaskItem> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const task: TaskItem = {
      id,
      userId: params.userId,
      clientId: params.clientId,
      clientName: params.clientName,
      type: params.type,
      command: params.command,
      status: this.runningTaskId ? 'QUEUED' : 'RUNNING',
      currentAction: this.runningTaskId ? 'Queued behind active browser task' : 'Starting task...',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.saveTask(task);

    db.logActivity({
      userId: task.userId,
      aiClient: task.clientName || 'AI Client',
      mcpTool: task.type,
      task: task.command,
      status: 'IN_PROGRESS'
    });

    if (this.runningTaskId) {
      this.queue.push(task.id);
      console.log(`[TaskEngine] Task ${task.id} queued. Currently running: ${this.runningTaskId}`);
      return task;
    }

    // Run immediately
    this.executeTask(task, params.executionFn).catch((err) => {
      console.error(`[TaskEngine] Error in task ${task.id}:`, err);
    });

    return task;
  }

  private async executeTask(task: TaskItem, executionFn: (task: TaskItem) => Promise<any>): Promise<void> {
    this.runningTaskId = task.id;
    task.status = 'RUNNING';
    task.updatedAt = new Date().toISOString();
    db.saveTask(task);

    agentHub.updateLiveContext({
      activeTaskId: task.id,
      currentAction: task.currentAction,
      taskProgress: task.progress,
      connectedAI: task.clientName || 'AI Client'
    });

    const startTime = Date.now();

    try {
      const result = await executionFn(task);

      task.status = 'COMPLETED';
      task.progress = 100;
      task.currentAction = 'Completed successfully';
      task.result = result;
      task.updatedAt = new Date().toISOString();
      db.saveTask(task);

      // If result contains media, create result record
      if (result && (result.mediaUrl || result.thumbnailBase64)) {
        const resultId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const resultItem: ResultItem = {
          id: resultId,
          userId: task.userId,
          taskId: task.id,
          type: result.mediaType || 'video',
          mediaUrl: result.mediaUrl || result.thumbnailBase64 || '',
          thumbnailUrl: result.thumbnailBase64 || result.mediaUrl,
          prompt: result.prompt || task.command,
          status: 'COMPLETED',
          createdAt: new Date().toISOString()
        };
        db.saveResult(resultItem);
      }

      db.logActivity({
        userId: task.userId,
        aiClient: task.clientName || 'AI Client',
        mcpTool: task.type,
        task: task.command,
        browserAction: task.currentAction,
        result: typeof result === 'string' ? result : 'Execution output received',
        status: 'SUCCESS',
        durationMs: Date.now() - startTime
      });
    } catch (err: any) {
      console.error(`[TaskEngine] Task ${task.id} failed:`, err);
      task.status = err.code === 'EMERGENCY_STOPPED' ? 'CANCELLED' : 'FAILED';
      task.currentAction = err.message || 'Task failed during execution';
      task.error = {
        code: err.code || 'ACTION_FAILED',
        message: err.message || 'Unknown error occurred',
        screenshot: err.screenshot,
        currentUrl: err.currentUrl,
        suggestedRecovery: err.suggestedRecovery
      };
      task.updatedAt = new Date().toISOString();
      db.saveTask(task);

      db.logActivity({
        userId: task.userId,
        aiClient: task.clientName || 'AI Client',
        mcpTool: task.type,
        task: task.command,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        error: err.message
      });
    } finally {
      this.runningTaskId = null;
      agentHub.updateLiveContext({
        activeTaskId: null,
        currentAction: 'Idle',
        taskProgress: 0
      });
      // Process next queued task
      this.processNextInQueue();
    }
  }

  private async processNextInQueue(): Promise<void> {
    if (this.queue.length === 0 || this.runningTaskId) return;

    const nextTaskId = this.queue.shift();
    if (!nextTaskId) return;

    const task = db.getTask(nextTaskId);
    if (!task || task.status === 'CANCELLED') {
      return this.processNextInQueue();
    }

    console.log(`[TaskEngine] Starting queued task ${task.id}...`);
    // Note: for queued MCP tasks, their executor resolves
  }

  public pauseTask(taskId: string): boolean {
    const task = db.getTask(taskId);
    if (!task) return false;
    task.status = 'PAUSED';
    task.currentAction = 'Task paused by user';
    task.updatedAt = new Date().toISOString();
    db.saveTask(task);
    agentHub.broadcastLiveState();
    return true;
  }

  public resumeTask(taskId: string): boolean {
    const task = db.getTask(taskId);
    if (!task || task.status !== 'PAUSED') return false;
    task.status = 'RUNNING';
    task.currentAction = 'Resuming task execution';
    task.updatedAt = new Date().toISOString();
    db.saveTask(task);
    agentHub.broadcastLiveState();
    return true;
  }

  public cancelTask(taskId: string): boolean {
    const task = db.getTask(taskId);
    if (!task) return false;

    task.status = 'CANCELLED';
    task.currentAction = 'Cancelled by user';
    task.updatedAt = new Date().toISOString();
    db.saveTask(task);

    // Remove from queue if present
    this.queue = this.queue.filter(id => id !== taskId);

    if (this.runningTaskId === taskId) {
      this.runningTaskId = null;
      agentHub.triggerEmergencyStop();
    }

    agentHub.broadcastLiveState();
    return true;
  }

  /**
   * Real Emergency Stop Button Handler:
   * - Stops current agent task
   * - Stops further browser actions
   * - Cancels queued actions
   * - Releases browser session
   * - Marks task: CANCELLED
   */
  public emergencyStop(): void {
    console.warn('[TaskEngine] 🚨 Emergency Stop Triggered!');

    // Cancel currently running task
    if (this.runningTaskId) {
      const active = db.getTask(this.runningTaskId);
      if (active) {
        active.status = 'CANCELLED';
        active.currentAction = 'Emergency stop initiated by user';
        active.updatedAt = new Date().toISOString();
        db.saveTask(active);
      }
      this.runningTaskId = null;
    }

    // Cancel all queued tasks
    for (const qId of this.queue) {
      const qTask = db.getTask(qId);
      if (qTask) {
        qTask.status = 'CANCELLED';
        qTask.currentAction = 'Cancelled by Emergency Stop';
        qTask.updatedAt = new Date().toISOString();
        db.saveTask(qTask);
      }
    }
    this.queue = [];

    // Trigger on agent
    agentHub.triggerEmergencyStop();

    db.logActivity({
      userId: 'usr_flowbridge_primary',
      aiClient: 'Dashboard User',
      mcpTool: 'EMERGENCY_STOP',
      browserAction: 'Halted all active and queued browser actions',
      status: 'CANCELLED'
    });
  }

  public getActiveTask(): TaskItem | null {
    if (!this.runningTaskId) return null;
    return db.getTask(this.runningTaskId) || null;
  }

  public getQueue(): TaskItem[] {
    return this.queue.map(id => db.getTask(id)).filter(Boolean) as TaskItem[];
  }
}

export const taskEngine = new TaskEngine();
