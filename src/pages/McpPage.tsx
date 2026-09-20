/**
 * FlowBridge - MCP Server Documentation & Interactive Tool Tester
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  Play, 
  Shield, 
  Layers, 
  Bot, 
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { McpToolDefinition } from '../types';

export const McpPage: React.FC = () => {
  const [tools, setTools] = useState<McpToolDefinition[]>([]);
  const [selectedTool, setSelectedTool] = useState<McpToolDefinition | null>(null);
  const [toolArgsJson, setToolArgsJson] = useState<string>('{}');
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mcp/tools')
      .then(res => res.json())
      .then(data => {
        setTools(data);
        if (data.length > 0) {
          setSelectedTool(data[0]);
          setDefaultArgs(data[0]);
        }
      })
      .catch(console.error);
  }, []);

  const setDefaultArgs = (tool: McpToolDefinition) => {
    const props = tool.inputSchema?.properties || {};
    const defaultObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(props)) {
      if ((val as any).type === 'string') {
        if (key === 'url') defaultObj[key] = 'https://labs.google/flow';
        else if (key === 'prompt') defaultObj[key] = 'An ethereal cinematic mountain pass at golden hour';
        else if (key === 'selector') defaultObj[key] = 'button';
        else defaultObj[key] = 'test';
      } else if ((val as any).type === 'number') {
        defaultObj[key] = 1000;
      } else if ((val as any).type === 'boolean') {
        defaultObj[key] = true;
      }
    }
    setToolArgsJson(JSON.stringify(defaultObj, null, 2));
  };

  const handleSelectTool = (tool: McpToolDefinition) => {
    setSelectedTool(tool);
    setDefaultArgs(tool);
    setExecutionOutput(null);
  };

  const handleRunTool = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setExecutionOutput('Executing MCP tool call...');

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsJson);
      } catch (e: any) {
        setExecutionOutput(`Invalid JSON input: ${e.message}`);
        setIsExecuting(false);
        return;
      }

      const res = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer flowbridge_secret_key'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `req_${Date.now()}`,
          method: 'tools/call',
          params: {
            name: selectedTool.name,
            arguments: parsedArgs
          }
        })
      });

      const data = await res.json();
      setExecutionOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setExecutionOutput(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const claudeConfigSnippet = JSON.stringify({
    mcpServers: {
      flowbridge: {
        command: "npx",
        args: [
          "-y",
          "@modelcontextprotocol/server-everything"
        ],
        url: `${window.location.origin}/mcp`,
        headers: {
          Authorization: "Bearer fb_key_primary_user"
        }
      }
    }
  }, null, 2);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E5FF]/20 text-[#00E5FF]">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Model Context Protocol (MCP) Server</h1>
            <p className="text-xs text-[#8B8B9A]">23 Real computer-control tools exposed over streamable HTTP JSON-RPC</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#8B8B9A]">
          <span>Endpoint:</span>
          <code className="rounded bg-[#08080D] px-2.5 py-1 text-[#00E5FF] border border-[#1E1E2C]">/mcp</code>
        </div>
      </div>

      {/* Main 2-Column: Tools Navigator + Interactive Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Tools List */}
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-4 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E1E2C]">
            <span className="text-xs font-bold text-[#F5F5F7] uppercase tracking-wider">Available Tools ({tools.length})</span>
            <span className="text-[10px] font-mono text-[#00E5FF]">v2024-11-05</span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-1.5 pr-1">
            {tools.map((tool) => {
              const isSelected = selectedTool?.name === tool.name;

              return (
                <button
                  key={tool.name}
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full rounded-lg p-2.5 text-left transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-[#7C5CFC] text-white font-bold'
                      : 'bg-[#08080D] border border-[#1E1E2C] text-[#F5F5F7] hover:border-[#7C5CFC]/50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-mono block truncate">{tool.name}</span>
                    <span className={`text-[10px] truncate block ${isSelected ? 'text-white/80' : 'text-[#8B8B9A]'}`}>
                      {tool.description}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                    tool.permission === 'EXECUTE' ? 'bg-rose-500/20 text-rose-300' : (tool.permission === 'CONTROL' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300')
                  }`}>
                    {tool.permission}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Interactive Tool Invoker */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTool ? (
            <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-[#1E1E2C] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#00E5FF]">{selectedTool.name}</span>
                    <span className="rounded bg-[#1E1E2C] px-2 py-0.5 text-[10px] font-mono text-[#8B8B9A]">
                      Permission: {selectedTool.permission}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8B9A] mt-1">{selectedTool.description}</p>
                </div>

                <button
                  onClick={handleRunTool}
                  disabled={isExecuting}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7C5CFC] to-[#00E5FF] px-4 py-2 text-xs font-bold text-[#08080D] hover:opacity-90 transition disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isExecuting ? 'Calling...' : 'Call Tool'}</span>
                </button>
              </div>

              {/* Arguments Editor */}
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] mb-1 block">
                  Tool Arguments (JSON)
                </label>
                <textarea
                  value={toolArgsJson}
                  onChange={(e) => setToolArgsJson(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#1E1E2C] bg-[#08080D] p-3 font-mono text-xs text-[#00E5FF] focus:border-[#7C5CFC] focus:outline-none transition resize-none"
                />
              </div>

              {/* Output Response */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#F5F5F7]">MCP JSON-RPC Output</span>
                  {executionOutput && (
                    <button
                      onClick={() => copyToClipboard(executionOutput, 'output')}
                      className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1"
                    >
                      {copiedSection === 'output' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>Copy Output</span>
                    </button>
                  )}
                </div>
                <div className="h-48 overflow-y-auto rounded-lg border border-[#1E1E2C] bg-[#08080D] p-3 font-mono text-[11px] text-[#F5F5F7]">
                  {executionOutput ? (
                    <pre className="whitespace-pre-wrap">{executionOutput}</pre>
                  ) : (
                    <span className="text-[#8B8B9A]">Click &quot;Call Tool&quot; to execute this MCP tool against your local browser session.</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Client Setup Snippet */}
          <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5F5F7]">Connect Claude Desktop / AI Chatbot</h3>
              <button
                onClick={() => copyToClipboard(claudeConfigSnippet, 'claude')}
                className="flex items-center gap-1 text-xs text-[#00E5FF] hover:underline"
              >
                {copiedSection === 'claude' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Copy Config</span>
              </button>
            </div>
            <p className="text-xs text-[#8B8B9A]">
              Add this block to your <code className="text-[#F5F5F7]">claude_desktop_config.json</code> to enable full computer-control of Google Flow inside Claude.
            </p>
            <pre className="rounded-lg bg-[#08080D] border border-[#1E1E2C] p-3 text-[11px] font-mono text-[#00E5FF] overflow-x-auto">
              {claudeConfigSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
