'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, ArrowRight } from 'lucide-react';

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  drillUrl: string;
}

const ARTICLES: KnowledgeArticle[] = [
  {
    id: 'k1',
    title: 'How to Calculate Pitch-Class Set Normal Order',
    category: 'Theory IV',
    summary: 'Step-by-step algorithm for finding the most compact left-to-right pitch class arrangement in mod 12.',
    drillUrl: '/theory',
  },
  {
    id: 'k2',
    title: 'Interval-Class Vector Calculation <ic1..ic6>',
    category: 'Theory IV',
    summary: 'Counting interval class content (semitone distances 1 through 6) across all pair combinations in a set.',
    drillUrl: '/theory',
  },
  {
    id: 'k3',
    title: 'Constructing a Twelve-Tone Matrix (P, I, R, RI)',
    category: 'Theory IV',
    summary: 'Arranging P0 horizontally and I0 vertically to generate all 48 row transformations.',
    drillUrl: '/theory',
  },
  {
    id: 'k4',
    title: 'Distinguishing Cadential, Passing, and Pedal 6/4 Chords',
    category: 'Aural Skills IV',
    summary: 'Aural and visual recognition of second-inversion triad harmonic functions.',
    drillUrl: '/aural',
  },
  {
    id: 'k5',
    title: 'Eastman vs Takadimi vs 1-e-&-a Counting Languages',
    category: 'Aural Skills IV',
    summary: 'Comparative guide to rhythmic subdivision counting systems for simple and compound meters.',
    drillUrl: '/aural',
  },
  {
    id: 'k6',
    title: 'Class Piano IV Two-Octave Scale Fingering Charts',
    category: 'Class Piano IV',
    summary: 'Standard university fingering patterns for all 12 major and minor 2-octave scales hands together.',
    drillUrl: '/piano',
  },
];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = ARTICLES.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <span>Searchable Music Theory & Aural Knowledge Base</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Concise university-level micro-lessons linked directly to interactive practice drills.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-xl">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search topics, e.g. pitch-class vector, 6/4 chord, fingering..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((article) => (
          <div key={article.id} className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                {article.category}
              </span>
              <h2 className="text-base font-bold text-slate-100 mt-2">{article.title}</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{article.summary}</p>
            </div>

            <Link
              href={article.drillUrl}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors pt-2"
            >
              <span>Practice This Concept</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
