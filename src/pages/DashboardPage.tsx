/**
 * FlowBridge - Dashboard Page
 * High-level command overview of AI Clients, Local Agent, Google Flow, and Active Tasks.
 */

import React, { useState } from 'react';
import { 
  Radio, 
  Laptop, 
  Globe, 
  Bot, 
  Play, 
  Pause, 
  XSquare, 
  Terminal, 
  Film, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { LiveStateSnapshot, ResultItem } from '../types';

interface DashboardProps {
  liveState: LiveStateSnapshot | null;
  onOpenPairing: () => void;
  onNavigate: (page: string) => void;
  onEmergencyStop: () => void;
  results: ResultItem[];
}

export const DashboardPage: React.FC<DashboardProps> = ({
  liveState,
  onOpenPairing,
  onNavigate,
  onEmergencyStop,
  results
}) => {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAgentConnected = liveState?.agentStatus === 'CONNECTED' || liveState?.agentStatus === 'IDLE' || liveState?.agentStatus === 'BUSY';
  const isFlowConnected = liveState?.googleFlowStatus === 'WORKSPACE_OPEN' || liveState?.googleFlowStatus === 'GENERATING' || liveState?.googleFlowStatus === 'RESULT_DETECTED';
  const activeTask = liveState?.currentTask;

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'flow_generate',
          params: { prompt: quickPrompt }
        })
      });
      setQuickPrompt('');
      onNavigate('live-control');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero System Status Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MCP SERVER */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-16 w-16 bg-[#7C5CFC]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B9A]">MCP SERVER</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#F5F5F7]">ONLINE</span>
            <span className="text-xs text-[#00E5FF] font-mono">Streamable HTTP</span>
          </div>
          <p className="mt-1 text-xs text-[#8B8B9A] truncate">
            Endpoint: <code className="text-[#F5F5F7]">/mcp</code>
          </p>
        </div>

        {/* LOCAL AGENT */}
        <div className={`rounded-xl border p-4 shadow-sm relative overflow-hidden transition ${
          isAgentConnected
            ? 'border-emerald-500/30 bg-[#101018]'
            : 'border-amber-500/30 bg-[#101018]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B9A]">LOCAL AGENT</span>
            <span className={`h-2 w-2 rounded-full ${isAgentConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-xl font-bold ${isAgentConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
              {isAgentConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
            {!isAgentConnected && (
              <button
                onClick={onOpenPairing}
                className="rounded bg-[#7C5CFC] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#6b4ae0] transition"
              >
                Pair Agent
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-[#8B8B9A] truncate">
            {liveState?.agentInfo?.platform ? `Platform: ${liveState.agentInfo.platform}` : 'Chrome DevTools Protocol (9222)'}
          </p>
        </div>

        {/* GOOGLE FLOW */}
        <div className={`rounded-xl border p-4 shadow-sm relative overflow-hidden transition ${
          isFlowConnected
            ? 'border-[#00E5FF]/30 bg-[#101018]'
            : 'border-[#1E1E2C] bg-[#101018]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B9A]">GOOGLE FLOW</span>
            <span className={`h-2 w-2 rounded-full ${isFlowConnected ? 'bg-[#00E5FF]' : 'bg-[#8B8B9A]'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-xl font-bold ${isFlowConnected ? 'text-[#00E5FF]' : 'text-[#8B8B9A]'}`}>
              {isFlowConnected ? 'CONNECTED' : (isAgentConnected ? 'STANDBY' : 'DISCONNECTED')}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8B8B9A] truncate">
            {liveState?.agentInfo?.currentBrowser?.currentUrl || 'flow.google.com'}
          </p>
        </div>

        {/* CHATGPT / AI CLIENTS */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B8B9A]">AI CLIENTS</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#F5F5F7]">3 ACTIVE</span>
            <span className="text-xs text-[#8B8B9A]">ChatGPT, Claude, Gemini</span>
          </div>
          <p className="mt-1 text-xs text-[#8B8B9A] truncate">
            Active: <span className="text-[#00E5FF] font-medium">{liveState?.connectedAI || 'ChatGPT'}</span>
          </p>
        </div>
      </div>

      {/* Active Task Banner (When task is in progress) */}
      {activeTask && (
        <div className="rounded-xl border border-[#7C5CFC]/40 bg-gradient-to-r from-[#101018] to-[#17142b] p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 animate-pulse">
                  ACTIVE TASK IN PROGRESS
                </span>
                <span className="text-xs text-[#8B8B9A] font-mono">ID: {activeTask.id}</span>
                <span className="text-xs font-medium text-[#7C5CFC]">Client: {activeTask.clientName || 'ChatGPT'}</span>
              </div>
              <h3 className="text-base font-bold text-[#F5F5F7] tracking-tight">
                {activeTask.command}
              </h3>
              <p className="text-xs text-[#00E5FF] font-mono flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Current action: {activeTask.currentAction || 'Executing browser control steps...'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('live-control')}
                className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6744f4] transition shadow-sm"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Open Live Cockpit</span>
              </button>
              <button
                onClick={onEmergencyStop}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition"
              >
                <XSquare className="h-3.5 w-3.5" />
                <span>Abort</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[#8B8B9A] font-mono mb-1">
              <span>Execution progress</span>
              <span>{liveState?.taskProgress || activeTask.progress || 10}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#1E1E2C] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#00E5FF] transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, liveState?.taskProgress || activeTask.progress || 15)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Viewport & Quick Dispatch */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Browser Screen Viewport */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E2C]">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-[#F5F5F7]">Real Browser Viewport</h3>
                <span className="rounded bg-[#1E1E2C] px-2 py-0.5 text-[10px] font-mono text-[#8B8B9A]">
                  {liveState?.agentInfo?.currentBrowser?.currentUrl || 'flow.google.com'}
                </span>
              </div>
              <button
                onClick={() => onNavigate('live-control')}
                className="text-xs text-[#7C5CFC] hover:text-[#00E5FF] font-medium flex items-center gap-1 transition"
              >
                <span>Full Cockpit</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Screen Container */}
            <div className="mt-4 relative aspect-video w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] flex items-center justify-center overflow-hidden">
              {liveState?.liveScreenshot ? (
                <img
                  src={liveState.liveScreenshot.startsWith('data:') ? liveState.liveScreenshot : `data:image/jpeg;base64,${liveState.liveScreenshot}`}
                  alt="Live Google Flow Screen"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="p-6 text-center max-w-sm space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1E1E2C] text-[#8B8B9A]">
                    <Laptop className="h-6 w-6 text-[#7C5CFC]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F5F5F7]">
                      {isAgentConnected ? 'Waiting for Active Browser Screen' : 'Local Agent Not Connected'}
                    </h4>
                    <p className="text-xs text-[#8B8B9A] mt-1">
                      {isAgentConnected
                        ? 'The browser agent is connected. Open Google Flow or trigger an AI generation to view live stream.'
                        : 'Connect the local agent running on your computer to transmit real screen frames and receive computer control.'}
                    </p>
                  </div>
                  {!isAgentConnected && (
                    <button
                      onClick={onOpenPairing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6a47ea] transition"
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      <span>Pair Local Agent</span>
                    </button>
                  )}
                </div>
              )}

              {/* Status badge overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-white border border-white/10">
                <span className={`h-2 w-2 rounded-full ${isAgentConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isAgentConnected ? 'STREAM ACTIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>

          {/* Direct Generation Launcher (Simulating MCP or testing pipeline) */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F7]">Trigger Google Flow Pipeline</h3>
                <p className="text-xs text-[#8B8B9A]">
                  Executes the full 15-step computer control observation loop directly.
                </p>
              </div>
              <span className="rounded bg-[#7C5CFC]/20 px-2 py-0.5 text-[10px] font-semibold text-[#7C5CFC]">
                Live Browser Automation
              </span>
            </div>

            <form onSubmit={handleQuickGenerate} className="space-y-3">
              <div className="relative">
                <textarea
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="e.g. A cinematic overhead shot of a futuristic cyberpunk metropolis illuminated in neon violet and cyan rain..."
                  rows={3}
                  className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-3 text-xs text-[#F5F5F7] placeholder-[#8B8B9A]/60 focus:border-[#7C5CFC] focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#8B8B9A]">
                  Step sequence: <span className="text-[#F5F5F7]">Inspect → Open Flow → Focus Prompt → Type → Trigger Generate → Observe State → Capture Media</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickPrompt.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7C5CFC] to-[#00E5FF] px-4 py-2 text-xs font-bold text-[#08080D] hover:opacity-90 transition disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isSubmitting ? 'Starting...' : 'Dispatch Generation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: AI Loop Flowchart & Recent Results */}
        <div className="space-y-6">
          {/* Loop Workflow Card */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#F5F5F7] mb-1">Autonomous AI Loop</h3>
            <p className="text-xs text-[#8B8B9A] mb-4">
              How FlowBridge connects AI thinking to browser control:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2.5 rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C]">
                <Bot className="h-4 w-4 text-[#7C5CFC] shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-[#F5F5F7]">1. AI Chatbot Plan</span>
                  <p className="text-[11px] text-[#8B8B9A]">Formulates prompt via MCP</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C]">
                <Radio className="h-4 w-4 text-[#00E5FF] shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-[#F5F5F7]">2. FlowBridge Dispatch</span>
                  <p className="text-[11px] text-[#8B8B9A]">Queues task & enforces permissions</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C]">
                <Laptop className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-[#F5F5F7]">3. Local Agent Action</span>
                  <p className="text-[11px] text-[#8B8B9A]">Types & clicks in real Chrome browser</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C]">
                <Film className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-[#F5F5F7]">4. State Observation</span>
                  <p className="text-[11px] text-[#8B8B9A]">Monitors DOM completion & captures media</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C]">
                <Bot className="h-4 w-4 text-[#7C5CFC] shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-[#F5F5F7]">5. AI Multimodal Review</span>
                  <p className="text-[11px] text-[#8B8B9A]">Inspects video & issues next command</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Generations Box */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#F5F5F7]">Recent Media Results</h3>
              <button
                onClick={() => onNavigate('results')}
                className="text-xs text-[#7C5CFC] hover:text-[#00E5FF] font-medium"
              >
                View all ({results.length})
              </button>
            </div>

            {results.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#1E1E2C] p-6 text-center text-[#8B8B9A] text-xs">
                No generated media yet. When Google Flow completes a generation, real videos and captures appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {results.slice(0, 3).map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onNavigate('results')}
                    className="flex items-center gap-3 rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 hover:border-[#7C5CFC]/50 transition cursor-pointer"
                  >
                    <div className="h-12 w-16 shrink-0 rounded bg-[#101018] overflow-hidden flex items-center justify-center">
                      {res.thumbnailUrl ? (
                        <img
                          src={res.thumbnailUrl.startsWith('data:') ? res.thumbnailUrl : `data:image/jpeg;base64,${res.thumbnailUrl}`}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="h-5 w-5 text-[#8B8B9A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#F5F5F7] truncate">{res.prompt || 'Generated Output'}</p>
                      <p className="text-[10px] text-[#8B8B9A]">{new Date(res.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[#8B8B9A] shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
