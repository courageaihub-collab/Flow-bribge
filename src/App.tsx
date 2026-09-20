/**
 * FlowBridge - Main Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PairingModal } from './components/PairingModal';
import { DashboardPage } from './pages/DashboardPage';
import { LiveControlPage } from './pages/LiveControlPage';
import { GoogleFlowPage } from './pages/GoogleFlowPage';
import { AIClientsPage } from './pages/AIClientsPage';
import { TasksPage } from './pages/TasksPage';
import { ResultsPage } from './pages/ResultsPage';
import { McpPage } from './pages/McpPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { LiveStateSnapshot, AIClient, TaskItem, ResultItem, ActivityLogItem } from './types';
import { AlertOctagon } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [liveState, setLiveState] = useState<LiveStateSnapshot | null>(null);
  const [clients, setClients] = useState<AIClient[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const [emergencyNotification, setEmergencyNotification] = useState<string | null>(null);

  // Fetch core data
  const refreshAllData = useCallback(async () => {
    try {
      const [snapshotRes, clientsRes, tasksRes, resultsRes, activityRes] = await Promise.all([
        fetch('/api/snapshot').then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/results').then(r => r.json()),
        fetch('/api/activity').then(r => r.json())
      ]);

      setLiveState(snapshotRes);
      setClients(clientsRes);
      setTasks(tasksRes.tasks || []);
      setResults(resultsRes);
      setActivityLogs(activityRes);
    } catch (e) {
      console.error('Failed to sync FlowBridge state:', e);
    }
  }, []);

  // Set up live telemetry via SSE stream or fallback polling
  useEffect(() => {
    refreshAllData();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/live/stream');
      eventSource.onmessage = (event) => {
        try {
          const snapshot: LiveStateSnapshot = JSON.parse(event.data);
          setLiveState(snapshot);
          if (snapshot.recentLogs) {
            setActivityLogs(snapshot.recentLogs);
          }
        } catch {}
      };
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // Fallback to polling
    }

    const interval = setInterval(refreshAllData, 3000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [refreshAllData]);

  // Real Emergency Stop Handler
  const handleEmergencyStop = async () => {
    try {
      await fetch('/api/agent/emergency-stop', { method: 'POST' });
      setEmergencyNotification('EMERGENCY STOP TRIGGERED: Active and queued actions halted.');
      refreshAllData();
      setTimeout(() => setEmergencyNotification(null), 5000);
    } catch (err: any) {
      console.error('Emergency stop error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080D] text-[#F5F5F7] selection:bg-[#7C5CFC]/30 selection:text-[#00E5FF]">
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        liveState={liveState}
        onOpenPairing={() => setIsPairingOpen(true)}
        onEmergencyStop={handleEmergencyStop}
      />

      {/* Emergency Stop Alert Banner */}
      {emergencyNotification && (
        <div className="bg-rose-600 px-4 py-3 text-white text-center text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg animate-bounce">
          <AlertOctagon className="h-4 w-4" />
          <span>{emergencyNotification}</span>
        </div>
      )}

      {/* Main Page Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        {currentPage === 'dashboard' && (
          <DashboardPage
            liveState={liveState}
            onOpenPairing={() => setIsPairingOpen(true)}
            onNavigate={setCurrentPage}
            onEmergencyStop={handleEmergencyStop}
            results={results}
          />
        )}

        {currentPage === 'live-control' && (
          <LiveControlPage
            liveState={liveState}
            onEmergencyStop={handleEmergencyStop}
            onOpenPairing={() => setIsPairingOpen(true)}
            activityLogs={activityLogs}
          />
        )}

        {currentPage === 'google-flow' && (
          <GoogleFlowPage
            liveState={liveState}
            onOpenPairing={() => setIsPairingOpen(true)}
            onEmergencyStop={handleEmergencyStop}
          />
        )}

        {currentPage === 'ai-clients' && (
          <AIClientsPage
            clients={clients}
            onRefresh={refreshAllData}
          />
        )}

        {currentPage === 'tasks' && (
          <TasksPage
            tasks={tasks}
            activeTask={liveState?.currentTask || null}
            queue={tasks.filter(t => t.status === 'QUEUED')}
            onRefresh={refreshAllData}
          />
        )}

        {currentPage === 'results' && (
          <ResultsPage
            results={results}
            onRefresh={refreshAllData}
          />
        )}

        {currentPage === 'mcp' && (
          <McpPage />
        )}

        {currentPage === 'activity' && (
          <ActivityPage
            logs={activityLogs}
            onRefresh={refreshAllData}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        )}
      </main>

      {/* Pairing Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        agentStatus={liveState?.agentStatus || 'DISCONNECTED'}
      />
    </div>
  );
}
