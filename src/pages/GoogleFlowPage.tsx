/**
 * FlowBridge - Google Flow Management Page
 */

import React, { useState } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Film,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { LiveStateSnapshot } from '../types';

interface GoogleFlowPageProps {
  liveState: LiveStateSnapshot | null;
  onOpenPairing: () => void;
  onEmergencyStop: () => void;
}

export const GoogleFlowPage: React.FC<GoogleFlowPageProps> = ({
  liveState,
  onOpenPairing,
  onEmergencyStop
}) => {
  const [testPrompt, setTestPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isAgentConnected = liveState?.agentStatus === 'CONNECTED' || liveState?.agentStatus === 'IDLE' || liveState?.agentStatus === 'BUSY';
  const browser = liveState?.agentInfo?.currentBrowser;
  const isFlowActive = liveState?.googleFlowStatus === 'WORKSPACE_OPEN' || liveState?.googleFlowStatus === 'GENERATING';

  const handleOpenFlow = async () => {
    setIsExecuting(true);
    setActionMessage('Navigating browser to Google Flow...');
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'flow_open',
          params: { url: 'https://labs.google/flow' }
        })
      });
      setActionMessage('Google Flow navigation triggered.');
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConnectBrowser = async () => {
    setIsExecuting(true);
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'flow_connect', params: {} })
      });
      setActionMessage('Browser connection handshake initiated.');
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDisconnectBrowser = async () => {
    setIsExecuting(true);
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'flow_disconnect', params: {} })
      });
      setActionMessage('Browser disconnected.');
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNewProject = async () => {
    setIsExecuting(true);
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'flow_new_project', params: {} })
      });
      setActionMessage('New project creation triggered in Flow.');
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEnterPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;
    setIsExecuting(true);
    try {
      await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'flow_enter_prompt',
          params: { prompt: testPrompt }
        })
      });
      setActionMessage(`Entered prompt: "${testPrompt.slice(0, 30)}..."`);
      setTestPrompt('');
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E5FF]/20 text-[#00E5FF]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Google Flow Browser Controller</h1>
            <p className="text-xs text-[#8B8B9A]">Direct computer-control interaction with Google Flow interface</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenFlow}
            disabled={isExecuting}
            className="flex items-center gap-1.5 rounded-lg bg-[#00E5FF] px-3.5 py-2 text-xs font-bold text-[#08080D] hover:bg-[#33ebff] transition disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Open Flow</span>
          </button>

          <button
            onClick={handleConnectBrowser}
            disabled={isExecuting}
            className="flex items-center gap-1.5 rounded-lg bg-[#1E1E2C] px-3.5 py-2 text-xs font-semibold text-[#F5F5F7] hover:bg-[#28283c] transition disabled:opacity-50"
          >
            <Laptop className="h-3.5 w-3.5 text-[#00E5FF]" />
            <span>Connect</span>
          </button>

          <button
            onClick={handleDisconnectBrowser}
            disabled={isExecuting}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E1E2C] px-3.5 py-2 text-xs font-semibold text-[#8B8B9A] hover:text-white transition disabled:opacity-50"
          >
            <span>Disconnect</span>
          </button>

          <button
            onClick={onEmergencyStop}
            className="flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-500/50 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
          >
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#7C5CFC]/10 p-3 text-xs text-[#00E5FF] font-mono flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-[#8B8B9A] hover:text-white">✕</button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4">
          <span className="text-xs uppercase tracking-wider text-[#8B8B9A] font-semibold">CONNECTION STATUS</span>
          <div className="mt-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isFlowActive ? 'bg-[#00E5FF]' : (isAgentConnected ? 'bg-emerald-400' : 'bg-amber-400')}`} />
            <span className="text-base font-bold text-[#F5F5F7]">
              {isFlowActive ? 'FLOW ACTIVE' : (isAgentConnected ? 'AGENT CONNECTED' : 'DISCONNECTED')}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4">
          <span className="text-xs uppercase tracking-wider text-[#8B8B9A] font-semibold">CURRENT URL</span>
          <p className="mt-2 text-xs font-mono text-[#00E5FF] truncate" title={browser?.currentUrl || 'flow.google.com'}>
            {browser?.currentUrl || 'flow.google.com'}
          </p>
        </div>

        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4">
          <span className="text-xs uppercase tracking-wider text-[#8B8B9A] font-semibold">CURRENT FLOW PROJECT</span>
          <p className="mt-2 text-xs font-semibold text-[#F5F5F7] truncate">
            {liveState?.googleFlowStatus === 'WORKSPACE_OPEN' ? 'Active Workspace' : 'Default Canvas Project'}
          </p>
        </div>

        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4">
          <span className="text-xs uppercase tracking-wider text-[#8B8B9A] font-semibold">CURRENT TASK</span>
          <p className="mt-2 text-xs font-semibold text-[#F5F5F7] truncate">
            {liveState?.currentTask ? liveState.currentTask.command : 'System Idle'}
          </p>
        </div>
      </div>

      {/* Center 2-Column: Live Screenshot & Direct Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Screenshot */}
        <div className="lg:col-span-2 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E1E2C]">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-[#F5F5F7]">Live Google Flow Screenshot Stream</h3>
            </div>
            <span className="text-[10px] font-mono text-[#8B8B9A]">Real viewport stream</span>
          </div>

          <div className="mt-4 relative aspect-video w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] flex items-center justify-center overflow-hidden">
            {liveState?.liveScreenshot ? (
              <img
                src={liveState.liveScreenshot.startsWith('data:') ? liveState.liveScreenshot : `data:image/jpeg;base64,${liveState.liveScreenshot}`}
                alt="Live Flow Viewport"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="p-8 text-center max-w-sm space-y-3">
                <Globe className="mx-auto h-12 w-12 text-[#8B8B9A]" />
                <p className="text-xs text-[#8B8B9A]">
                  Click &ldquo;Open Flow&rdquo; above to launch Google Flow in your local browser and start live streaming.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Manual Actions & Test Form */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#F5F5F7] pb-2 border-b border-[#1E1E2C]">
              Flow Interface Actions
            </h3>

            <div className="space-y-2">
              <button
                onClick={handleNewProject}
                disabled={isExecuting}
                className="w-full flex items-center justify-between rounded-lg border border-[#1E1E2C] bg-[#08080D] p-3 text-xs text-[#F5F5F7] hover:border-[#7C5CFC] transition text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="h-4 w-4 text-[#7C5CFC]" />
                  <div>
                    <p className="font-semibold">Create New Project</p>
                    <p className="text-[10px] text-[#8B8B9A]">Clicks &quot;New project&quot; button in Flow</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Test Prompt Input */}
            <form onSubmit={handleEnterPrompt} className="pt-2 border-t border-[#1E1E2C] space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7]">Type Prompt into Flow Interface</label>
                <p className="text-[10px] text-[#8B8B9A]">Locates prompt box and enters text character-by-character</p>
              </div>
              <textarea
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter prompt to type into Flow..."
                rows={3}
                className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 text-xs text-[#F5F5F7] focus:border-[#00E5FF] focus:outline-none transition resize-none"
              />
              <button
                type="submit"
                disabled={isExecuting || !testPrompt.trim()}
                className="w-full rounded-lg bg-[#7C5CFC] py-2 text-xs font-bold text-white hover:bg-[#6a47ea] transition disabled:opacity-50"
              >
                Type Prompt
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
