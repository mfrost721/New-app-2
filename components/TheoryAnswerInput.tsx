'use client';

import React from 'react';

export interface TheoryAnswerInputProps {
  options?: string[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (inputToValidate?: string) => void;
}

export function TheoryAnswerInput({
  options,
  value,
  onChange,
  onSubmit,
}: TheoryAnswerInputProps) {
  if (options) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => {
              onChange(opt);
              onSubmit(opt);
            }}
            className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
              value === opt
                ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex space-x-3 pt-2">
      <input
        type="text"
        placeholder="Enter answer (e.g. notes, prime form, ratio)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <button
        onClick={() => onSubmit()}
        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
      >
        Submit
      </button>
    </div>
  );
}

export default TheoryAnswerInput;
