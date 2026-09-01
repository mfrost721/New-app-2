'use client';

import React, { useState, useEffect, useRef } from 'react';
import { loadUserStore, exportUserStoreData, importUserStoreData, UserStoreState } from '@/lib/storage/store';
import { BarChart3, Download, Upload, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const [store, setStore] = useState<UserStoreState | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setStore(loadUserStore());
    });
  }, []);

  if (!store) return <div className="p-8 text-center text-slate-400">Loading analytics...</div>;

  const exportDataJson = () => {
    const exportPayload = exportUserStoreData(store);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `frost_music_lab_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const updatedState = importUserStoreData(content);
        setStore(updatedState);
        setImportStatus({ type: 'success', message: 'Practice data restored successfully!' });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to parse or import backup file.';
        setImportStatus({ type: 'error', message: errorMsg });
      }
    };
    reader.readAsText(file);

    // Reset file input so re-selecting the same file works
    if (e.target) e.target.value = '';
  };

  const weakestSkills = [...store.skills].sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>Error Analytics & Weakness Diagnostics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detailed breakdown of error patterns, latency spikes, and exportable study logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
            aria-label="Upload Backup JSON File"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Import Data</span>
          </button>

          <button
            onClick={exportDataJson}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Practice Data (JSON)</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
            importStatus.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Weakness Queue */}
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Priority Personal Weakness Queue</span>
        </h2>

        <div className="space-y-3">
          {weakestSkills.map((skill, idx) => (
            <div key={skill.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-amber-400 font-mono">#{idx + 1}</span>
                  <span className="font-bold text-slate-100 text-sm">{skill.topic}</span>
                </div>
                <span className="text-xs text-slate-400">{skill.category}</span>
                {skill.errorHistory.length > 0 && (
                  <p className="text-xs text-rose-400 mt-1">
                    Known pattern: &quot;{skill.errorHistory[skill.errorHistory.length - 1]}&quot;
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-amber-400 font-mono">{skill.mastery}%</div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Mastery</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
