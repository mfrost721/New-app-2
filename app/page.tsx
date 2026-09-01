'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadUserStore, UserStoreState } from '@/lib/storage/store';
import { calculateExamReadiness } from '@/lib/adaptive/mastery';
import { generatePracticePrescription } from '@/lib/adaptive/practicePrescription';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function HomeDashboard() {
  const [store, setStore] = useState<UserStoreState | null>(null);

  useEffect(() => {
    const loaded = loadUserStore();
    setStore(loaded);
  }, []);

  const theoryReadiness = React.useMemo(
    () => (store ? calculateExamReadiness(store.skills, 'Theory IV') : null),
    [store]
  );
  const auralReadiness = React.useMemo(
    () => (store ? calculateExamReadiness(store.skills, 'Aural Skills IV') : null),
    [store]
  );
  const pianoReadiness = React.useMemo(
    () => (store ? calculateExamReadiness(store.skills, 'Class Piano IV') : null),
    [store]
  );

  const prescription = React.useMemo(
    () => (store ? generatePracticePrescription(store.skills, 20, store.isRoadMode) : null),
    [store]
  );

  const daysLeft = store
    ? Math.max(0, Math.ceil((new Date(store.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (!store || !theoryReadiness || !auralReadiness || !pianoReadiness || !prescription) {
    return <div className="p-8 text-center text-slate-400">Loading Frost Music Lab...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Exam Countdown & Mode Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Clock className="w-4 h-4" />
            <span>Target Exam Date: {store.examDate}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {daysLeft} Days Until Examination
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Target Pace: <span className="text-emerald-400 font-semibold">+2.1 mastery pts / week</span> required for 90%+ pass guarantee.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/theory"
            className="flex items-center space-x-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg hover:shadow-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <Zap className="w-4 h-4" />
            <span>Start Drill</span>
          </Link>
        </div>
      </div>

      {/* Main Readiness Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Theory IV */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Music Theory IV</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                theoryReadiness.readinessLabel === 'EXAM READY'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {theoryReadiness.readinessLabel}
              </span>
            </div>
            <div className="text-4xl font-black text-slate-100">{theoryReadiness.masteryPercentage}%</div>
            <p className="text-xs text-slate-400 mt-1">Est. Pass Probability: {theoryReadiness.passingProbability}%</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Weakest Area:</div>
            <div className="text-amber-400 truncate">{theoryReadiness.weakestTopics[0] || 'None'}</div>
          </div>
        </div>

        {/* Aural Skills IV */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aural Skills IV</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                auralReadiness.readinessLabel === 'EXAM READY'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {auralReadiness.readinessLabel}
              </span>
            </div>
            <div className="text-4xl font-black text-slate-100">{auralReadiness.masteryPercentage}%</div>
            <p className="text-xs text-slate-400 mt-1">Est. Pass Probability: {auralReadiness.passingProbability}%</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Weakest Area:</div>
            <div className="text-amber-400 truncate">{auralReadiness.weakestTopics[0] || 'None'}</div>
          </div>
        </div>

        {/* Class Piano IV */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class Piano IV</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                pianoReadiness.readinessLabel === 'EXAM READY'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {pianoReadiness.readinessLabel}
              </span>
            </div>
            <div className="text-4xl font-black text-slate-100">{pianoReadiness.masteryPercentage}%</div>
            <p className="text-xs text-slate-400 mt-1">Est. Pass Probability: {pianoReadiness.passingProbability}%</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Weakest Area:</div>
            <div className="text-amber-400 truncate">{pianoReadiness.weakestTopics[0] || 'None'}</div>
          </div>
        </div>
      </div>

      {/* Recommended Practice prescription: "Next Best 20 Minutes" */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">Next Best 20 Minutes Practice Recommendation</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {store.isRoadMode ? '📱 ROAD MODE ACTIVE' : '🎹 HOME MODE ACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prescription.recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 uppercase font-semibold">{rec.category}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">{rec.allocatedMinutes} min</span>
              </div>
              <div className="font-bold text-slate-100 text-sm">{rec.topic}</div>
              <p className="text-xs text-slate-400">{rec.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Readiness Matrix Overview */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Curriculum Readiness Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold">
              <tr>
                <th className="p-3 rounded-l-lg">Topic</th>
                <th className="p-3">Category</th>
                <th className="p-3">Mastery</th>
                <th className="p-3 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.skills.slice(0, 8).map((skill) => (
                <tr key={skill.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-200">{skill.topic}</td>
                  <td className="p-3 text-slate-400">{skill.category}</td>
                  <td className="p-3 font-mono font-bold text-amber-400">{skill.mastery}%</td>
                  <td className="p-3">
                    {skill.mastery >= 75 ? (
                      <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Exam Ready</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">Developing</span>
                    )}
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
