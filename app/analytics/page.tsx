'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { exportUserStore, importUserStore, loadUserStore, UserStoreState } from '@/lib/storage/store';
import { hrefForSkill } from '@/lib/adaptive/practicePrescription';
import { BarChart3, Download, Upload, AlertTriangle, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react';

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
    const jsonStr = exportUserStore(store);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `frost_music_lab_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const updated = importUserStore(text, store.skills);
        setStore(updated);
        setImportStatus({ type: 'success', message: 'User store successfully imported and merged.' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import store file.';
        setImportStatus({ type: 'error', message: `Import rejected: ${message}` });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const weakestSkills = [...store.skills].sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  const getAvgLatency = (latencies: number[]) => {
    if (!latencies || latencies.length === 0) return 'N/A';
    const sum = latencies.reduce((acc, curr) => acc + curr, 0);
    return `${Math.round(sum / latencies.length)} ms`;
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>Error Analytics & Weakness Diagnostics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detailed breakdown of EWMA skill mastery, latency metrics, last-seen activity, and lossless JSON backup.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Import Practice Data (JSON)</span>
          </button>

          <button
            onClick={exportDataJson}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Practice Data (JSON)</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
            importStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Weakness Queue */}
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Priority Personal Weakness Queue (Weakest 5)</span>
        </h2>

        <div className="space-y-3">
          {weakestSkills.map((skill, idx) => {
            const href = hrefForSkill(skill.id, skill.category);
            return (
              <div
                key={skill.id}
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">#{idx + 1}</span>
                    <span className="font-bold text-slate-100 text-sm">{skill.topic}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{skill.category}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Last seen: {formatDate(skill.lastPracticed)}</span>
                    </span>
                    <span>•</span>
                    <span>Avg latency: {getAvgLatency(skill.recentLatencyMs)}</span>
                  </div>
                  {skill.errorHistory.length > 0 && (
                    <p className="text-xs text-rose-400 mt-1">
                      Known pattern: &quot;{skill.errorHistory[skill.errorHistory.length - 1]}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400 font-mono">{skill.mastery}%</div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">EWMA Mastery</span>
                  </div>

                  <Link
                    href={href}
                    className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors min-h-[44px]"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Per-Skill EWMA Mastery & Latency Table */}
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>Complete Skill Mastery & Latency Breakdown</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-lg">Topic</th>
                <th className="p-3">Category</th>
                <th className="p-3">EWMA Mastery</th>
                <th className="p-3">Last-Seen</th>
                <th className="p-3">Avg Latency</th>
                <th className="p-3 rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-200">{skill.topic}</td>
                  <td className="p-3 text-slate-400">{skill.category}</td>
                  <td className="p-3 font-mono font-bold text-amber-400">{skill.mastery}%</td>
                  <td className="p-3 text-slate-400">{formatDate(skill.lastPracticed)}</td>
                  <td className="p-3 font-mono text-slate-300">{getAvgLatency(skill.recentLatencyMs)}</td>
                  <td className="p-3">
                    <Link
                      href={hrefForSkill(skill.id, skill.category)}
                      className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center space-x-1"
                    >
                      <span>Drill</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
