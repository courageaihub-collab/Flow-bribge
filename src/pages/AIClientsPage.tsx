/**
 * FlowBridge - AI Clients Page
 * Display and manage connected MCP AI clients: ChatGPT, Gemini, Claude, Custom MCP clients.
 * For each: Client ID, connection status, permissions (READ, CONTROL, EXECUTE),
 * last activity, active task, connected date, API keys.
 */

import React, { useState } from 'react';
import { 
  Bot, 
  Shield, 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AIClient, PermissionLevel } from '../types';

interface AIClientsPageProps {
  clients: AIClient[];
  onRefresh: () => void;
}

export const AIClientsPage: React.FC<AIClientsPageProps> = ({ clients, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState<'chatgpt' | 'gemini' | 'claude' | 'custom'>('chatgpt');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          type: newClientType,
          permissions: ['READ', 'CONTROL', 'EXECUTE']
        })
      });
      setShowAddModal(false);
      setNewClientName('');
      onRefresh();
    } catch (err) {
      console.error('Failed to create AI client:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Connected AI Clients</h1>
            <p className="text-xs text-[#8B8B9A]">Autonomous chatbots commanding FlowBridge through Model Context Protocol</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6847ea] transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Connect AI Client</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => {
          const isConnected = client.status === 'CONNECTED';

          return (
            <div
              key={client.id}
              className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4 hover:border-[#7C5CFC]/40 transition relative group"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#08080D] border border-[#1E1E2C] text-[#00E5FF]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F5F7]">{client.name}</h3>
                    <span className="text-[11px] font-mono text-[#8B8B9A] uppercase">{client.type}</span>
                  </div>
                </div>

                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#1E1E2C] text-[#8B8B9A]'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  <span>{client.status}</span>
                </span>
              </div>

              {/* Client ID */}
              <div className="rounded-lg bg-[#08080D] p-2.5 border border-[#1E1E2C] text-[11px] font-mono">
                <span className="text-[#8B8B9A] text-[10px] block">CLIENT ID</span>
                <span className="text-[#00E5FF] select-all">{client.id}</span>
              </div>

              {/* Permissions */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#8B8B9A] font-semibold flex items-center gap-1">
                  <Shield className="h-3 w-3 text-[#7C5CFC]" />
                  <span>PERMISSIONS</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['READ', 'CONTROL', 'EXECUTE'] as PermissionLevel[]).map((p) => {
                    const hasPerm = client.permissions.includes(p);
                    return (
                      <span
                        key={p}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${
                          hasPerm
                            ? 'bg-[#7C5CFC]/20 text-[#00E5FF] border border-[#7C5CFC]/40'
                            : 'bg-[#1E1E2C]/50 text-[#8B8B9A] line-through'
                        }`}
                      >
                        {p}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Meta: Activity, Active Task, Connected Date */}
              <div className="space-y-2 border-t border-[#1E1E2C] pt-3 text-xs">
                <div className="flex items-center justify-between text-[#8B8B9A]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Last Activity:</span>
                  </span>
                  <span className="text-[#F5F5F7] font-mono text-[11px]">
                    {new Date(client.lastActivity).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#8B8B9A]">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>Active Task:</span>
                  </span>
                  <span className="text-[#00E5FF] font-medium text-[11px] truncate max-w-[140px]">
                    {client.activeTaskId ? client.activeTaskId : 'None (Idle)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#8B8B9A]">
                  <span>Connected Date:</span>
                  <span className="text-[#F5F5F7] font-mono text-[11px]">
                    {new Date(client.connectedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* API Key Box */}
              {client.apiKey && (
                <div className="pt-2 border-t border-[#1E1E2C]">
                  <div className="flex items-center justify-between rounded bg-[#08080D] p-2 border border-[#1E1E2C] text-[11px]">
                    <span className="font-mono text-[#8B8B9A] truncate max-w-[170px]">
                      {client.apiKey.slice(0, 10)}••••••••
                    </span>
                    <button
                      onClick={() => copyToClipboard(client.apiKey!, client.id)}
                      className="flex items-center gap-1 text-[#00E5FF] hover:underline"
                    >
                      {copiedKey === client.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === client.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1E1E2C] bg-[#101018] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-[#F5F5F7]">Register New MCP AI Client</h2>
            <p className="text-xs text-[#8B8B9A] mt-0.5">
              Generates an API key and MCP connection configuration for ChatGPT, Claude, or Gemini.
            </p>

            <form onSubmit={handleCreateClient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#F5F5F7] mb-1">Client Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. ChatGPT Creative Director"
                  className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 text-xs text-[#F5F5F7] focus:border-[#7C5CFC] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F5F7] mb-1">AI Architecture</label>
                <select
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value as any)}
                  className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 text-xs text-[#F5F5F7] focus:border-[#7C5CFC] focus:outline-none"
                >
                  <option value="chatgpt">ChatGPT (OpenAI Custom Action / MCP)</option>
                  <option value="claude">Claude Desktop / Anthropic MCP</option>
                  <option value="gemini">Google Gemini / AI Studio</option>
                  <option value="custom">Custom Agent (Cursor, Windsurf, LangChain)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E1E2C]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-[#8B8B9A] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#7C5CFC] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#6a48ea]"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
