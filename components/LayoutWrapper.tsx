'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { loadUserStore, saveUserStore, UserStoreState } from '@/lib/storage/store';
import { Music, Mic, Piano, BookOpen, BarChart3, Smartphone, Home } from 'lucide-react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<UserStoreState | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loaded = loadUserStore();
    setStore(loaded);
  }, []);

  const toggleRoadMode = () => {
    if (!store) return;
    const updated = { ...store, isRoadMode: !store.isRoadMode };
    setStore(updated);
    saveUserStore(updated);
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Theory IV', href: '/theory', icon: BookOpen },
    { name: 'Aural Skills IV', href: '/aural', icon: Mic },
    { name: 'Class Piano IV', href: '/piano', icon: Piano },
    { name: 'Knowledge Base', href: '/knowledgebase', icon: Music },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-slate-950 focus:font-bold focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
            ❄
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
            Frost Music Lab
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleRoadMode}
            aria-label={`Toggle practice mode, currently ${store?.isRoadMode ? 'Road Mode' : 'Home Mode'}`}
            aria-pressed={!!store?.isRoadMode}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              store?.isRoadMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{store?.isRoadMode ? 'ROAD MODE' : 'HOME MODE'}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar / Mobile Nav Bar */}
        <nav aria-label="Main Navigation" className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 shrink-0">
          <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Streak Info */}
          {store && (
            <div className="hidden md:block mt-8 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Academic Streak</span>
                <span className="font-bold text-amber-400">🔥 {store.academicStreak}d</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Piano Practice</span>
                <span className="font-bold text-amber-400">🎹 {store.pianoStreak}d</span>
              </div>
            </div>
          )}
        </nav>

        {/* Content Area */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
