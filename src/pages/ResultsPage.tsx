/**
 * FlowBridge - Results Page
 * Media gallery for real generated outputs: Images, Videos, Screenshots.
 * Supports direct download, full-screen player, prompt review, and AI analysis notes.
 */

import React, { useState } from 'react';
import { 
  Film, 
  Download, 
  Eye, 
  Maximize2, 
  Clock, 
  Sparkles, 
  Layers, 
  ExternalLink,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { ResultItem } from '../types';

interface ResultsPageProps {
  results: ResultItem[];
  onRefresh: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ results, onRefresh }) => {
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredResults = results.filter((r) => {
    if (filterType === 'ALL') return true;
    return r.type === filterType;
  });

  const handleDownload = (res: ResultItem) => {
    const a = document.createElement('a');
    a.href = res.mediaUrl.startsWith('data:') ? res.mediaUrl : `data:image/jpeg;base64,${res.mediaUrl}`;
    a.download = `flowbridge_${res.id}.${res.type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1E1E2C] bg-[#101018] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7C5CFC]/20 text-[#7C5CFC]">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7]">Generation Results & Media Storage</h1>
            <p className="text-xs text-[#8B8B9A]">Media captured directly from Google Flow render canvases</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'video', 'image', 'screenshot'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono capitalize transition ${
                filterType === t
                  ? 'bg-[#7C5CFC] text-white font-bold'
                  : 'bg-[#08080D] border border-[#1E1E2C] text-[#8B8B9A] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={onRefresh}
            className="rounded-lg border border-[#1E1E2C] bg-[#08080D] p-2 text-[#8B8B9A] hover:text-white transition ml-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredResults.length === 0 ? (
        <div className="rounded-xl border border-[#1E1E2C] bg-[#101018] p-16 text-center text-[#8B8B9A] text-xs space-y-2">
          <Film className="mx-auto h-10 w-10 text-[#7C5CFC]/40" />
          <p className="font-semibold text-sm text-[#F5F5F7]">No Media Captured Yet</p>
          <p>
            When Google Flow completes video generation or a screenshot is captured, results will automatically sync here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#1E1E2C] bg-[#101018] overflow-hidden shadow-sm flex flex-col group hover:border-[#7C5CFC]/50 transition"
            >
              {/* Media Preview Box */}
              <div 
                onClick={() => setSelectedResult(item)}
                className="relative aspect-video w-full bg-[#08080D] overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl.startsWith('data:') ? item.thumbnailUrl : `data:image/jpeg;base64,${item.thumbnailUrl}`}
                    alt="Generation Result"
                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <Film className="h-10 w-10 text-[#8B8B9A]" />
                )}

                <div className="absolute top-2 left-2 rounded bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-[#00E5FF] border border-white/10">
                  {item.type}
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <span className="rounded-full bg-[#7C5CFC] p-2 text-white shadow-lg">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </div>
              </div>

              {/* Details Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#F5F5F7] line-clamp-2">
                    {item.prompt || 'Google Flow scene generation'}
                  </p>
                  <p className="text-[10px] font-mono text-[#8B8B9A] mt-1">
                    Captured: {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#1E1E2C] pt-3">
                  <span className="font-mono text-[10px] text-[#00E5FF]">ID: {item.id}</span>
                  <button
                    onClick={() => handleDownload(item)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#7C5CFC] hover:text-[#00E5FF] transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Media Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl rounded-xl border border-[#1E1E2C] bg-[#101018] overflow-hidden shadow-2xl">
            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-4 right-4 z-10 rounded-lg bg-black/60 p-2 text-white hover:bg-black/90 transition"
            >
              ✕
            </button>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <img
                src={selectedResult.mediaUrl.startsWith('data:') ? selectedResult.mediaUrl : `data:image/jpeg;base64,${selectedResult.mediaUrl}`}
                alt="Full View"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#00E5FF] font-bold">
                    {selectedResult.type} output
                  </span>
                  <h3 className="text-sm font-bold text-[#F5F5F7] mt-0.5">{selectedResult.prompt}</h3>
                </div>
                <button
                  onClick={() => handleDownload(selectedResult)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#7C5CFC] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#6847ea] transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Media</span>
                </button>
              </div>

              <div className="text-[11px] text-[#8B8B9A] font-mono border-t border-[#1E1E2C] pt-2">
                Task Reference: {selectedResult.taskId} | Created: {new Date(selectedResult.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
