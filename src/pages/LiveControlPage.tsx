/**
 * FlowBridge - Live Control Cockpit
 * Real-time monitoring and control center displaying:
 * CONNECTED AI, CURRENT TASK, CURRENT ACTION, BROWSER STATUS,
 * GOOGLE FLOW STATUS, LIVE SCREENSHOT, TASK PROGRESS, EVENT LOG, EMERGENCY STOP.
 */

import React, { useState } from 'react';
import { 
  Tv, 
  Bot, 
  Globe, 
  Laptop, 
  AlertOctagon, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Play, 
  Maximize2,
  Terminal,
  Activity,
  Layers,
  Clock
} from 'lucide-react';
import { LiveStateSnapshot, ActivityLogItem } from '../types';

interface LiveControlProps {
  liveState: LiveStateSnapshot | null;
  onEmergencyStop: () => void;
  onOpenPairing: () => void;
  activityLogs: ActivityLogItem[];
}

export const LiveControlPage: React.FC<LiveControlProps> = ({
  liveState,
  onEmergencyStop,
  onOpenPairing,
  activityLogs
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<boolean>(false);

  const isAgentConnected = liveState?.agentStatus === 'CONNECTED' || liveState?.agentStatus === 'IDLE' || liveState?.agentStatus === 'BUSY';
  const currentTask = liveState?.currentTask;
  const currentAction = liveState?.currentAction || (currentTask?.currentAction) || 'Awaiting incoming AI commands...';
  const progress = liveState?.taskProgress || currentTask?.progress || 0;
  const connectedAI = liveState?.connectedAI || currentTask?.clientName || 'ChatGPT (OpenAI)';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Emergency Stop Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#00E5FF]">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Live Computer-Control Cockpit</h1>
            <p className="text-xs text-[#8B8B9A]">Real-time telemetry stream between AI Chatbot and Google Flow</p>
          </div>
        </div>

        {/* Real Emergency Stop Button */}
        <button
          onClick={onEmergencyStop}
          id="cockpit-emergency-stop-btn"
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-rose-500 bg-rose-600 px-5 py-2.5 text-xs font-black tracking-wider text-white shadow-lg shadow-rose-950/60 hover:bg-rose-500 active:scale-95 transition"
        >
          <AlertOctagon className="h-4 w-4 fill-current" />
          <span>EMERGENCY STOP</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Viewport & Task State */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Screenshot Viewport */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E2C]">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isAgentConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isAgentConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </span>
                <h2 className="text-sm font-bold text-[#F5F5F7]">LIVE SCREENSHOT</h2>
                <span className="text-xs text-[#8B8B9A] font-mono ml-2">
                  {liveState?.agentInfo?.currentBrowser?.currentUrl || 'flow.google.com'}
                </span>
              </div>

              {liveState?.liveScreenshot && (
                <button
                  onClick={() => setFullscreenImage(!fullscreenImage)}
                  className="rounded p-1 text-[#8B8B9A] hover:text-white transition"
                  title="Toggle Fullscreen Screen Frame"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Visual Screen Frame */}
            <div className="mt-4 relative aspect-video w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] flex items-center justify-center overflow-hidden">
              {liveState?.liveScreenshot ? (
                <img
                  src={liveState.liveScreenshot.startsWith('data:') ? liveState.liveScreenshot : `data:image/jpeg;base64,${liveState.liveScreenshot}`}
                  alt="Live Google Flow Screen Capture"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="p-8 text-center max-w-sm space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E2C] text-[#8B8B9A]">
                    <Laptop className="h-6 w-6 text-[#7C5CFC]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F5F5F7]">
                      {isAgentConnected ? 'Waiting for Active Frame' : 'Local Agent Disconnected'}
                    </h4>
                    <p className="text-xs text-[#8B8B9A] mt-1">
                      {isAgentConnected
                        ? 'Connected to local browser. The screenshot updates continuously as the AI navigates and interacts.'
                        : 'Please start the local FlowBridge Agent to transmit live browser frames.'}
                    </p>
                  </div>
                  {!isAgentConnected && (
                    <button
                      onClick={onOpenPairing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6847ea] transition"
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>Pair Agent</span>
                    </button>
                  )}
                </div>
              )}

              {/* Real-Time Action Overlay */}
              <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-[#08080D]/90 backdrop-blur-md border border-[#1E1E2C] p-3 shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <RefreshCw className={`h-4 w-4 text-[#00E5FF] shrink-0 ${currentTask?.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">CURRENT ACTION</p>
                    <p className="text-xs font-bold text-[#F5F5F7] truncate">{currentAction}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold">PROGRESS</p>
                  <p className="text-xs font-mono font-bold text-[#00E5FF]">{progress}%</p>
                </div>
              </div>
            </div>

            {/* Task Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-[#8B8B9A] font-mono">
                <span>TASK PROGRESS</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#1E1E2C] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#00E5FF] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(3, progress)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Current Task & Connected AI Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CONNECTED AI */}
            <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-[#8B8B9A] font-semibold flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-[#7C5CFC]" />
                <span>CONNECTED AI</span>
              </span>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC] font-bold text-xs">
                  AI
                </div>
                <div>
                  <p className="text-sm font-bold text-[#F5F5F7]">{connectedAI}</p>
                  <p className="text-[11px] text-emerald-400 font-medium">● ACTIVE MCP SESSION</p>
                </div>
              </div>
            </div>

            {/* CURRENT TASK */}
            <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-[#8B8B9A] font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#00E5FF]" />
                <span>CURRENT TASK</span>
              </span>
              <div className="mt-2">
                <p className="text-sm font-bold text-[#F5F5F7] truncate">
                  {currentTask ? currentTask.command : 'None (System Idle)'}
                </p>
                <p className="text-[11px] text-[#8B8B9A] font-mono mt-0.5">
                  Status: <span className="text-[#00E5FF]">{currentTask ? currentTask.status : 'IDLE'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: System Status & Event Log */}
        <div className="space-y-6">
          {/* Status Panel */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#F5F5F7] border-b border-[#1E1E2C] pb-2">
              System Operational States
            </h3>

            {/* BROWSER STATUS */}
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-[#8B8B9A]" />
                <span className="text-xs font-semibold text-[#F5F5F7]">BROWSER STATUS</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                liveState?.browserStatus === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {liveState?.browserStatus || 'DISCONNECTED'}
              </span>
            </div>

            {/* GOOGLE FLOW STATUS */}
            <div className="flex items-center justify-between py-1.5 border-t border-[#1E1E2C]">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#8B8B9A]" />
                <span className="text-xs font-semibold text-[#F5F5F7]">GOOGLE FLOW STATUS</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                liveState?.googleFlowStatus === 'GENERATING'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse'
                  : (liveState?.googleFlowStatus === 'WORKSPACE_OPEN'
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30'
                    : 'bg-[#1E1E2C] text-[#8B8B9A]')
              }`}>
                {liveState?.googleFlowStatus || 'STANDBY'}
              </span>
            </div>

            {/* LOCAL AGENT */}
            <div className="flex items-center justify-between py-1.5 border-t border-[#1E1E2C]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#8B8B9A]" />
                <span className="text-xs font-semibold text-[#F5F5F7]">LOCAL AGENT</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                isAgentConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {liveState?.agentStatus || 'DISCONNECTED'}
              </span>
            </div>
          </div>

          {/* EVENT LOG */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E2C]">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-[#F5F5F7]">EVENT LOG</h3>
              </div>
              <span className="text-[10px] font-mono text-[#8B8B9A]">Live Stream</span>
            </div>

            {/* Scrollable Event Feed */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {activityLogs.length === 0 ? (
                <div className="p-6 text-center text-[#8B8B9A] text-xs">
                  Awaiting operational events...
                </div>
              ) : (
                activityLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isFailed = log.status === 'FAILED';
                  const time = new Date(log.timestamp).toLocaleTimeString();

                  return (
                    <div
                      key={log.id}
                      className="rounded border border-[#1E1E2C] bg-[#08080D] p-2.5 space-y-1 hover:border-[#7C5CFC]/40 transition"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#8B8B9A]">
                        <span className="text-[#00E5FF]">{time}</span>
                        <span className={`font-bold ${
                          isSuccess ? 'text-emerald-400' : (isFailed ? 'text-rose-400' : 'text-amber-300')
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 text-[#F5F5F7]">
                        <span className="text-[#7C5CFC] font-semibold">{log.aiClient}</span>
                        <span className="text-[#8B8B9A]">→</span>
                        <span className="text-[#00E5FF] font-semibold">{log.mcpTool}</span>
                      </div>
                      {log.browserAction && (
                        <p className="text-[#8B8B9A] text-[10px]">
                          Action: <span className="text-[#F5F5F7]">{log.browserAction}</span>
                        </p>
                      )}
                      {log.error && (
                        <p className="text-rose-400 text-[10px] bg-rose-950/20 p-1 rounded">
                          Error: {log.error}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
