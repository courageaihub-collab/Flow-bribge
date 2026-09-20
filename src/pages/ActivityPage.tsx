/**
 * FlowBridge - Activity Log Page
 * Real chronological log tracking: timestamp, AI client, MCP tool, task,
 * browser action, result, status, duration, error.
 */

import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Bot,
  Terminal,
  Laptop
} from 'lucide-react';
import { ActivityLogItem } from '../types';

interface ActivityPageProps {
  logs: ActivityLogItem[];
  onRefresh: () => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ logs, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.aiClient.toLowerCase().includes(q) ||
        log.mcpTool.toLowerCase().includes(q) ||
        (log.task && log.task.toLowerCase().includes(q)) ||
        (log.browserAction && log.browserAction.toLowerCase().includes(q)) ||
        (log.error && log.error.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportCsv = () => {
    const headers = ['Timestamp', 'AI Client', 'MCP Tool', 'Task', 'Browser Action', 'Status', 'Duration (ms)', 'Error'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${l.aiClient}"`,
      `"${l.mcpTool}"`,
      `"${l.task || ''}"`,
      `"${l.browserAction || ''}"`,
      l.status,
      l.durationMs || 0,
      `"${l.error || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flowbridge_activity_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E5FF]/20 text-[#00E5FF]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Audit Activity Log</h1>
            <p className="text-xs text-[#8B8B9A]">Chronological record of every AI request, browser dispatch, and Flow render</p>
          </div>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-lg border border-[#1E1E2C] bg-[#08080D] px-3.5 py-2 text-xs font-semibold text-[#F5F5F7] hover:bg-[#1E1E2C] transition"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B8B9A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AI client, tool, action, or error..."
            className="w-full rounded-lg border border-[#1E1E2C] bg-[#101018] pl-9 pr-3 py-2 text-xs text-[#F5F5F7] placeholder-[#8B8B9A] focus:border-[#7C5CFC] focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'SUCCESS', 'FAILED', 'IN_PROGRESS', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#7C5CFC] text-white font-bold'
                  : 'bg-[#101018] border border-[#1E1E2C] text-[#8B8B9A] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#08080D] border-b border-[#1E1E2C] text-[#8B8B9A] font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">AI Client</th>
                <th className="px-4 py-3">MCP Tool</th>
                <th className="px-4 py-3">Task Command</th>
                <th className="px-4 py-3">Browser Action</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2C]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#8B8B9A]">
                    No activity entries found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isFailed = log.status === 'FAILED';

                  return (
                    <tr key={log.id} className="hover:bg-[#141422] transition font-mono">
                      <td className="px-4 py-3 text-[#8B8B9A] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-[#7C5CFC] font-semibold whitespace-nowrap">
                        {log.aiClient}
                      </td>
                      <td className="px-4 py-3 text-[#00E5FF] font-bold whitespace-nowrap">
                        {log.mcpTool}
                      </td>
                      <td className="px-4 py-3 text-[#F5F5F7] max-w-xs truncate font-sans">
                        {log.task || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#8B8B9A] max-w-xs truncate font-sans">
                        {log.browserAction || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : (isFailed ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300')
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8B8B9A] whitespace-nowrap">
                        {log.durationMs ? `${log.durationMs}ms` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
