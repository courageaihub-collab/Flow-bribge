/**
 * FlowBridge - Top Navigation Bar
 */

import React from 'react';
import { 
  Radio, 
  Bot, 
  Globe, 
  Tv, 
  ListOrdered, 
  Film, 
  Terminal, 
  Activity, 
  Settings, 
  AlertOctagon, 
  Laptop,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { LiveStateSnapshot } from '../types';

interface NavbarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
  liveState: LiveStateSnapshot | null;
  onOpenPairing: () => void;
  onEmergencyStop: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onSelectPage,
  liveState,
  onOpenPairing,
  onEmergencyStop
}) => {
  const isAgentConnected = liveState?.agentStatus === 'CONNECTED' || liveState?.agentStatus === 'IDLE' || liveState?.agentStatus === 'BUSY';
  const isFlowActive = liveState?.googleFlowStatus === 'WORKSPACE_OPEN' || liveState?.googleFlowStatus === 'GENERATING';

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: Radio },
    { id: 'live-control', label: 'Live Control', icon: Tv, badge: liveState?.activeTaskId ? 'ACTIVE' : undefined },
    { id: 'google-flow', label: 'Google Flow', icon: Globe },
    { id: 'ai-clients', label: 'AI Clients', icon: Bot },
    { id: 'tasks', label: 'Tasks', icon: ListOrdered },
    { id: 'results', label: 'Results', icon: Film },
    { id: 'mcp', label: 'MCP Tools', icon: Terminal },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1E1E2C] bg-[#08080D]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onSelectPage('dashboard')}
            className="flex items-center gap-2.5 text-left transition hover:opacity-90"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#00E5FF] p-[1px]">
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#101018]">
                <Radio className="h-5 w-5 text-[#00E5FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-[#F5F5F7]">FlowBridge</span>
                <span className="rounded bg-[#7C5CFC]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#7C5CFC]">MCP</span>
              </div>
              <p className="text-[11px] text-[#8B8B9A] hidden sm:block">AI Browser Orchestration</p>
            </div>
          </button>

          {/* Quick Telemetry Pills */}
          <div className="hidden lg:flex items-center gap-2.5 pl-2 border-l border-[#1E1E2C]/80">
            {/* Agent Status */}
            <button
              onClick={onOpenPairing}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                isAgentConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
              title={isAgentConnected ? 'Local Agent Connected' : 'Click to Pair Local Agent'}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>{isAgentConnected ? 'Agent: Connected' : 'Agent: Pair Now'}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${isAgentConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            {/* Flow Status */}
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
              isFlowActive
                ? 'border-[#00E5FF]/30 bg-[#00E5FF]/10 text-[#00E5FF]'
                : 'border-[#1E1E2C] bg-[#101018] text-[#8B8B9A]'
            }`}>
              <Globe className="h-3.5 w-3.5" />
              <span>{isFlowActive ? 'Flow: Active' : 'Flow: Standby'}</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Emergency Stop Button */}
          <button
            onClick={onEmergencyStop}
            id="emergency-stop-header-btn"
            className="group flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-600 hover:text-white active:scale-95 shadow-sm shadow-rose-950/50"
            title="Emergency Stop: Abort current task and stop all browser operations"
          >
            <AlertOctagon className="h-4 w-4 text-rose-400 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">EMERGENCY STOP</span>
            <span className="sm:hidden">STOP</span>
          </button>

          {/* Connect Local Agent Button */}
          {!isAgentConnected && (
            <button
              onClick={onOpenPairing}
              className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#6847ea]"
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Connect Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-t border-[#1E1E2C]/60 bg-[#0c0c14] overflow-x-auto">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 py-1.5">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#1E1E2C] text-[#F5F5F7] font-semibold shadow-inner'
                    : 'text-[#8B8B9A] hover:bg-[#161622] hover:text-[#F5F5F7]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#00E5FF]' : 'text-[#8B8B9A]'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-400 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
