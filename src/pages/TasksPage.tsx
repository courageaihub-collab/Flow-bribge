/**
 * FlowBridge - Task Engine Page
 * Manages queued, running, waiting, completed, failed, paused, and cancelled browser tasks.
 * Enables pause, resume, cancel, retry, and inspecting task details.
 */

import React, { useState } from 'react';
import { 
  ListOrdered, 
  Play, 
  Pause, 
  XSquare, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Eye,
  Layers,
  Bot
} from 'lucide-react';
import { TaskItem, TaskStatus } from '../types';

interface TasksPageProps {
  tasks: TaskItem[];
  activeTask: TaskItem | null;
  queue: TaskItem[];
  onRefresh: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ tasks, activeTask, queue, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const handlePause = async (id: string) => {
    await fetch(`/api/tasks/${id}/pause`, { method: 'POST' });
    onRefresh();
  };

  const handleResume = async (id: string) => {
    await fetch(`/api/tasks/${id}/resume`, { method: 'POST' });
    onRefresh();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/tasks/${id}/cancel`, { method: 'POST' });
    onRefresh();
  };

  const handleRetry = async (task: TaskItem) => {
    await fetch('/api/tools/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: task.type,
        params: task.result || {}
      })
    });
    onRefresh();
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse';
      case 'QUEUED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'WAITING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'PAUSED':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'CANCELLED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E5FF]/20 text-[#00E5FF]">
            <ListOrdered className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Task Engine & Concurrency Queue</h1>
            <p className="text-xs text-[#8B8B9A]">Single-session browser arbitration with automated queueing</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-[#1E1E2C] bg-[#08080D] px-3.5 py-2 text-xs font-semibold text-[#F5F5F7] hover:bg-[#1E1E2C] transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'RUNNING', 'QUEUED', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium whitespace-nowrap transition ${
              filterStatus === st
                ? 'bg-[#7C5CFC] text-white font-bold'
                : 'bg-[#101018] border border-[#1E1E2C] text-[#8B8B9A] hover:text-[#F5F5F7]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Main Grid: Tasks Table + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Task List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-12 text-center text-[#8B8B9A] text-xs">
              No tasks found in category &quot;{filterStatus}&quot;.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`rounded-xl border p-4 shadow-sm transition cursor-pointer ${
                    isSelected
                      ? 'border-[#00E5FF] bg-[#141422]'
                      : 'border-[#1E1E2C] bg-[#101018] hover:border-[#7C5CFC]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold font-mono ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                      <span className="font-mono text-xs text-[#8B8B9A]">{task.id}</span>
                      <span className="rounded bg-[#08080D] px-2 py-0.5 text-[11px] font-medium text-[#7C5CFC] border border-[#1E1E2C]">
                        {task.clientName || 'AI Client'}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#8B8B9A] font-mono">
                      {new Date(task.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-[#F5F5F7] line-clamp-2">
                    {task.command}
                  </h3>

                  <p className="mt-1 text-xs text-[#8B8B9A] font-mono truncate">
                    Action: <span className="text-[#00E5FF]">{task.currentAction || 'Queued'}</span>
                  </p>

                  {/* Actions Row */}
                  <div className="mt-3 flex items-center justify-between border-t border-[#1E1E2C] pt-3">
                    <div className="flex items-center gap-2">
                      {task.status === 'RUNNING' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePause(task.id); }}
                          className="flex items-center gap-1 rounded bg-[#1E1E2C] px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-[#2a2a3e] transition"
                        >
                          <Pause className="h-3 w-3" />
                          <span>Pause</span>
                        </button>
                      )}

                      {task.status === 'PAUSED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResume(task.id); }}
                          className="flex items-center gap-1 rounded bg-[#1E1E2C] px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-[#2a2a3e] transition"
                        >
                          <Play className="h-3 w-3" />
                          <span>Resume</span>
                        </button>
                      )}

                      {(task.status === 'RUNNING' || task.status === 'QUEUED') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(task.id); }}
                          className="flex items-center gap-1 rounded bg-rose-950/40 border border-rose-500/40 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-600 hover:text-white transition"
                        >
                          <XSquare className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )}

                      {(task.status === 'FAILED' || task.status === 'CANCELLED') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRetry(task); }}
                          className="flex items-center gap-1 rounded bg-[#1E1E2C] px-2.5 py-1 text-[11px] font-medium text-[#00E5FF] hover:bg-[#2a2a3e] transition"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#7C5CFC] font-medium">
                      <span>Inspect</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Col: Detailed Task Inspector Drawer */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#F5F5F7] border-b border-[#1E1E2C] pb-2">
            Task Inspector
          </h3>

          {selectedTask ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">TASK ID</span>
                <p className="font-mono text-xs text-[#00E5FF]">{selectedTask.id}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">STATUS</span>
                <p className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold font-mono ${getStatusBadge(selectedTask.status)}`}>
                  {selectedTask.status}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">COMMAND</span>
                <p className="text-[#F5F5F7] font-semibold mt-0.5 bg-[#08080D] p-2 rounded border border-[#1E1E2C]">
                  {selectedTask.command}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">CURRENT ACTION</span>
                <p className="text-[#00E5FF] font-mono mt-0.5">
                  {selectedTask.currentAction || 'None'}
                </p>
              </div>

              {selectedTask.error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 space-y-2 text-rose-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Error: {selectedTask.error.code}</span>
                  </div>
                  <p className="text-[11px] text-rose-200">{selectedTask.error.message}</p>
                  {selectedTask.error.suggestedRecovery && (
                    <p className="text-[10px] text-amber-300 bg-amber-950/30 p-2 rounded">
                      Suggested Recovery: {selectedTask.error.suggestedRecovery}
                    </p>
                  )}
                </div>
              )}

              {selectedTask.result && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">OUTPUT PAYLOAD</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-[#08080D] p-2 text-[10px] font-mono text-[#00E5FF] border border-[#1E1E2C]">
                    {JSON.stringify(selectedTask.result, null, 2)}
                  </pre>
                </div>
              )}

              <div className="border-t border-[#1E1E2C] pt-3 text-[11px] text-[#8B8B9A] space-y-1 font-mono">
                <p>Created: {new Date(selectedTask.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(selectedTask.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#8B8B9A] text-xs">
              Select any task from the left list to view execution trace, outputs, or error diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
