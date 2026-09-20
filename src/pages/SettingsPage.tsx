/**
 * FlowBridge - Settings & Security Page
 * Permissions controls (READ, CONTROL, EXECUTE), CDP browser config, and agent pairing.
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Laptop, 
  Save, 
  Check, 
  AlertTriangle,
  Lock,
  Key,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { FlowBridgeSettings } from '../types';

interface SettingsPageProps {
  onOpenPairing: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenPairing }) => {
  const [settings, setSettings] = useState<FlowBridgeSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);
  }, []);

  const handleTogglePerm = (perm: 'READ' | 'CONTROL' | 'EXECUTE') => {
    if (!settings) return;
    setSettings({
      ...settings,
      permissionLevels: {
        ...settings.permissionLevels,
        [perm]: !settings.permissionLevels[perm]
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const updated = await res.json();
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-12 text-center text-[#8B8B9A] text-xs">
        Loading FlowBridge configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Settings & Security Guardrails</h1>
            <p className="text-xs text-[#8B8B9A]">Autonomous permissions, browser targets, and agent pairing</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-4 py-2 text-xs font-bold text-white hover:bg-[#6948ea] transition shadow-sm disabled:opacity-50"
        >
          {savedSuccess ? <Check className="h-4 w-4 text-emerald-300" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'Saved' : (isSaving ? 'Saving...' : 'Save Changes')}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Permission Levels Matrix */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#00E5FF]" />
              <h2 className="text-sm font-bold text-[#F5F5F7]">Permission Enforcement Tiers</h2>
            </div>
            <span className="text-[10px] font-mono text-[#8B8B9A]">Zero-Trust MCP</span>
          </div>

          <p className="text-xs text-[#8B8B9A]">
            Enforce granular capability bounds on all incoming AI model instructions before physical browser execution.
          </p>

          <div className="space-y-3">
            {/* READ */}
            <div className="flex items-center justify-between rounded-lg border border-[#1E1E2C] bg-[#08080D] p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#00E5FF]">READ</span>
                  <span className="text-[10px] text-[#8B8B9A] font-mono">Telemetry & Vision</span>
                </div>
                <p className="text-[11px] text-[#8B8B9A]">
                  Allows AI clients to capture screenshots, inspect DOM states, query viewport dimensions, and read status.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.permissionLevels.READ}
                  onChange={() => handleTogglePerm('READ')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#1E1E2C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00E5FF]"></div>
              </label>
            </div>

            {/* CONTROL */}
            <div className="flex items-center justify-between rounded-lg border border-[#1E1E2C] bg-[#08080D] p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#7C5CFC]">CONTROL</span>
                  <span className="text-[10px] text-[#8B8B9A] font-mono">Physical Interaction</span>
                </div>
                <p className="text-[11px] text-[#8B8B9A]">
                  Allows AI clients to click elements, type characters into inputs, press keyboard keys, and scroll the viewport.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.permissionLevels.CONTROL}
                  onChange={() => handleTogglePerm('CONTROL')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#1E1E2C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7C5CFC]"></div>
              </label>
            </div>

            {/* EXECUTE */}
            <div className="flex items-center justify-between rounded-lg border border-[#1E1E2C] bg-[#08080D] p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-rose-400">EXECUTE</span>
                  <span className="text-[10px] text-[#8B8B9A] font-mono">Generations & Downloads</span>
                </div>
                <p className="text-[11px] text-[#8B8B9A]">
                  Allows AI clients to initiate new Flow projects, trigger video renders, regenerate scenes, and download rendered media files.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.permissionLevels.EXECUTE}
                  onChange={() => handleTogglePerm('EXECUTE')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#1E1E2C] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Browser Automation Settings */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E1E2C] pb-3">
            <div className="flex items-center gap-2">
              <Laptop className="h-4 w-4 text-[#7C5CFC]" />
              <h2 className="text-sm font-bold text-[#F5F5F7]">Chrome DevTools Protocol (CDP) Configuration</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#F5F5F7] mb-1">CDP Endpoint</label>
              <input
                type="text"
                value={settings.browserConfig.defaultCdpEndpoint}
                onChange={(e) => setSettings({
                  ...settings,
                  browserConfig: { ...settings.browserConfig, defaultCdpEndpoint: e.target.value }
                })}
                className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 font-mono text-xs text-[#00E5FF] focus:border-[#7C5CFC] focus:outline-none"
              />
              <p className="text-[10px] text-[#8B8B9A] mt-1">Chrome default remote debugging endpoint</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F5F5F7] mb-1">Max Action Timeout (ms)</label>
              <input
                type="number"
                value={settings.browserConfig.defaultTimeoutMs}
                onChange={(e) => setSettings({
                  ...settings,
                  browserConfig: { ...settings.browserConfig, defaultTimeoutMs: parseInt(e.target.value) || 30000 }
                })}
                className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2.5 font-mono text-xs text-[#F5F5F7] focus:border-[#7C5CFC] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Local Agent Pairing Link */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F7]">Local Agent Session Pairing</h3>
            <p className="text-xs text-[#8B8B9A]">
              Connect or regenerate pairing keys for the FlowBridge Local Agent daemon on your desktop.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPairing}
            className="rounded-lg bg-[#1E1E2C] px-4 py-2 text-xs font-semibold text-[#00E5FF] hover:bg-[#28283c] transition shrink-0"
          >
            Open Pairing Manager
          </button>
        </div>
      </form>
    </div>
  );
};
