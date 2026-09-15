'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, ArrowRight } from 'lucide-react';

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  commonMistakes: string;
  workedExample: string;
  drillUrl: string;
}

const ARTICLES: KnowledgeArticle[] = [
  {
    id: 'k1',
    title: 'How to Calculate Pitch-Class Set Normal Order',
    category: 'Theory IV',
    summary: 'Step-by-step algorithm for finding the most compact left-to-right pitch class arrangement in mod 12.',
    body: 'Normal order is the rotation of a pitch-class set that packs the notes into the smallest span from first to last, then prefers the most compact left side when spans tie. Write the distinct pitch classes in ascending order, wrap one extra copy of the first class an octave higher, and measure every adjacent span of the same cardinality. Keep the rotation whose outer interval is smallest. If two rotations share that outer interval, compare the interval from the first pitch to the next-to-last pitch, then continue leftward until one rotation wins. University Theory IV exams expect you to show that comparison, not just name Forte numbers from memory.',
    commonMistakes: 'Forgetting to remove duplicate pitch classes before rotating, or stopping after the first tight span without checking left-packing.',
    workedExample: 'Set {0, 1, 4, 6}: rotations span 6, 11, 10, and 8. The span-6 ordering [0, 1, 4, 6] is normal order.',
    drillUrl: '/theory?skill=t1',
  },
  {
    id: 'k2',
    title: 'Interval-Class Vector Calculation <ic1..ic6>',
    category: 'Theory IV',
    summary: 'Counting interval class content (semitone distances 1 through 6) across all pair combinations in a set.',
    body: 'An interval-class vector has six slots: unordered distances 1 through 6. Every pair of pitch classes contributes one count to the smaller of d and 12-d. The tritone (6) is its own inverse, so it is not doubled. Exam prompts usually want the angle-bracket form <ic1 ic2 ic3 ic4 ic5 ic6>. After you compute normal order or prime form, list every pair once. For a trichord there are three pairs; for a tetrachord there are six. Check the arithmetic against a known set such as the major triad, which must produce <001110>.',
    commonMistakes: 'Counting directed intervals instead of interval classes, or doubling the tritone.',
    workedExample: '{0, 4, 7} pairs are 4, 7→5, and 3, so the vector is <001110>.',
    drillUrl: '/theory?skill=t2',
  },
  {
    id: 'k3',
    title: 'Constructing a Twelve-Tone Matrix (P, I, R, RI)',
    category: 'Theory IV',
    summary: 'Arranging P0 horizontally and I0 vertically to generate all 48 row transformations.',
    body: 'Place P0 across the top row. Fill the left column with the inversion of that row starting on the same pitch class; that column is I0. Each remaining row is the transposition of P0 that begins with the left-column pitch. Retrogrades are rows read right to left. Retrograde inversions are columns read bottom to top, or RI rows read right to left. Exam questions often ask only for the first three pitch classes of a labeled form such as RI7. Compute that form from the source row instead of hunting the whole matrix if time is short.',
    commonMistakes: 'Transposing the prime form but forgetting to invert the first column, or swapping R with RI.',
    workedExample: 'If P0 begins 0, 11, 7, then I0 begins 0, 1, 5 because each interval of P0 is negated mod 12.',
    drillUrl: '/theory?skill=t3',
  },
  {
    id: 'k4',
    title: 'Distinguishing Cadential, Passing, and Pedal 6/4 Chords',
    category: 'Aural Skills IV',
    summary: 'Aural and visual recognition of second-inversion triad harmonic functions.',
    body: 'A cadential 6/4 is a dominant with the tonic pitch in the bass, resolving to V. A passing 6/4 fills a stepwise bass between two root-position or first-inversion chords, usually I–V6/4–I6. A pedal 6/4 keeps a static bass while the upper voices neighbor and return. On the exam, listen first for the bass: if it stands still, suspect pedal; if it walks by step and the 6/4 is unaccented, suspect passing; if the 6/4 is accented and moves to V–I, it is cadential.',
    commonMistakes: 'Calling every second-inversion triad cadential because the figure is 6/4.',
    workedExample: 'Bass C–G–C with G–C–E over the middle bass is a passing 6/4, not a cadence.',
    drillUrl: '/aural?skill=a3',
  },
  {
    id: 'k5',
    title: 'Eastman vs Takadimi vs 1-e-&-a Counting Languages',
    category: 'Aural Skills IV',
    summary: 'Comparative guide to rhythmic subdivision counting systems for simple and compound meters.',
    body: 'Simple-meter syllables 1-e-&-a mark four sixteenth pulses per beat. Takadimi uses ta-di for the beat and its midpoint, then ta-ka-di-mi for sixteenths. Eastman counting keeps beat numbers and adds “te” on the second eighth in compound meters. Dictation errors usually come from mixing systems mid-measure. Pick one language and stick with it for the exam. Asymmetric meters such as 7/8 should be grouped 2+2+3 or 3+2+2 before you assign syllables.',
    commonMistakes: 'Switching syllable systems inside a bar, or treating 7/8 as an even four-beat measure.',
    workedExample: 'A 2+2+3 bar of 7/8 counts 1-& 2-& 3-&-a if you keep the last group as three eighths.',
    drillUrl: '/aural?skill=a6',
  },
  {
    id: 'k6',
    title: 'Class Piano IV Two-Octave Scale Fingering Charts',
    category: 'Class Piano IV',
    summary: 'Standard university fingering patterns for all 12 major and minor 2-octave scales hands together.',
    body: 'Class Piano IV expects two-octave scales and arpeggios at 100 bpm, hands together, with standard conservatory fingerings. Right-hand major scales that start on white keys generally use 1231234 and cross thumb under after 3 or 4. Left hand mirrors with 5432132. Black-key tonics keep the thumb on white notes. Harmonic minor raises only the leading tone; melodic minor raises 6 and 7 ascending and returns to natural minor descending. The proficiency jury listens for even tone at the thumb crossings more than raw speed.',
    commonMistakes: 'Using the same fingering for harmonic and melodic minor, or rushing the thumb-cross and dropping tempo below 100.',
    workedExample: 'Eb major RH begins 3 on Eb, then 1234123 so the thumb lands on F and Bb.',
    drillUrl: '/piano?skill=p4_scale_eb_maj',
  },
];

export default function KnowledgeBasePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = ARTICLES.filter((article) => {
    const haystack = [
      article.title,
      article.summary,
      article.body,
      article.commonMistakes,
      article.workedExample,
      article.category,
    ].join(' ').toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <span>Searchable Music Theory & Aural Knowledge Base</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            University-level micro-lessons with worked examples, common errors, and direct drill links.
          </p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label="Search topics in knowledge base"
          placeholder="Search topics or article body, e.g. prime form, cadential 6/4, Eb fingering..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((article) => (
          <article key={article.id} className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                {article.category}
              </span>
              <h2 className="text-base font-bold text-slate-100 mt-2">{article.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{article.body}</p>
              <p className="text-xs text-slate-300"><span className="font-bold text-amber-400">Worked example:</span> {article.workedExample}</p>
              <p className="text-xs text-slate-300"><span className="font-bold text-rose-400">Common mistake:</span> {article.commonMistakes}</p>
            </div>

            <Link
              href={article.drillUrl}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors pt-2 min-h-[44px]"
            >
              <span>Practice This Concept</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
