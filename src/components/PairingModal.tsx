/**
 * FlowBridge - Pairing Modal
 * Real pairing code generation and connection guide for the Local Agent.
 */

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, Laptop, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AgentStatus } from '../types';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentStatus: AgentStatus;
}

export const PairingModal: React.FC<PairingModalProps> = ({ isOpen, onClose, agentStatus }) => {
  const [pairingCode, setPairingCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchPairingCode = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/pair', { method: 'POST' });
      const data = await res.json();
      setPairingCode(data.code);
    } catch (e) {
      console.error('Failed to generate pairing code:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (!pairingCode || agentStatus === 'DISCONNECTED')) {
      fetchPairingCode();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = agentStatus === 'CONNECTED' || agentStatus === 'IDLE' || agentStatus === 'BUSY';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const cliCommand = `npm run agent -- --pair=${pairingCode || 'FB-XXXX-XX'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-[#1E1E2C] bg-[#101018] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[#8B8B9A] hover:bg-[#1E1E2C] hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC]">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F5F5F7]">Connect Local FlowBridge Agent</h2>
            <p className="text-xs text-[#8B8B9A]">Secure computer-control link to your actual browser</p>
          </div>
        </div>

        {isConnected ? (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h3 className="mt-3 text-base font-semibold text-emerald-300">Local Agent Successfully Connected!</h3>
            <p className="mt-1 text-xs text-emerald-400/80">
              The agent is linked to your FlowBridge session and ready to accept browser commands from AI clients.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Pairing Code Box */}
            <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#08080D] p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-[#8B8B9A] font-semibold">
                One-Time Secure Pairing Code
              </span>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-black tracking-widest text-[#00E5FF]">
                  {loading ? '••••-••••' : (pairingCode || 'GENERATING')}
                </span>
                <button
                  onClick={fetchPairingCode}
                  disabled={loading}
                  className="rounded p-1.5 text-[#8B8B9A] hover:bg-[#1E1E2C] hover:text-white transition disabled:opacity-50"
                  title="Generate new pairing code"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#8B8B9A]">
                Valid for 15 minutes. Single-use cryptographic exchange.
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E1E2C] font-mono text-[10px] font-bold text-[#7C5CFC]">1</span>
                <div>
                  <p className="font-medium text-[#F5F5F7]">Open Chrome with Remote Debugging (Port 9222)</p>
                  <p className="text-[#8B8B9A] text-[11px] mt-0.5">
                    Start Chrome with <code className="bg-[#1E1E2C] px-1 py-0.5 rounded text-[#00E5FF]">--remote-debugging-port=9222</code> so the agent can control your session.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E1E2C] font-mono text-[10px] font-bold text-[#7C5CFC]">2</span>
                <div className="w-full">
                  <p className="font-medium text-[#F5F5F7]">Run the Local Agent CLI</p>
                  <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 font-mono text-[11px]">
                    <span className="text-[#00E5FF] truncate mr-2">{cliCommand}</span>
                    <button
                      onClick={() => copyToClipboard(cliCommand, 'cli')}
                      className="shrink-0 flex items-center gap-1 rounded bg-[#1E1E2C] px-2 py-1 text-[10px] text-white hover:bg-[#2A2A3E] transition"
                    >
                      {copied === 'cli' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied === 'cli' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E1E2C] font-mono text-[10px] font-bold text-[#7C5CFC]">3</span>
                <div>
                  <p className="font-medium text-[#F5F5F7]">Automatic Handshake</p>
                  <p className="text-[#8B8B9A] text-[11px] mt-0.5">
                    The local agent will verify this code with FlowBridge, establish the secure WebSocket tunnel, and change status to <span className="text-emerald-400 font-semibold">CONNECTED</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 rounded-lg bg-[#1E1E2C]/50 p-3 text-[11px] text-[#8B8B9A]">
              <ShieldCheck className="h-4 w-4 text-[#7C5CFC] shrink-0" />
              <span>Zero-trust pairing. Permanent secrets are never exposed in the browser.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
