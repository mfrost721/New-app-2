'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { loadUserStore, saveUserStore, UserStoreState } from '@/lib/storage/store';
import { Music, Mic, Piano, BookOpen, BarChart3, Smartphone, Home, Menu, X, WifiOff } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Theory IV', href: '/theory', icon: BookOpen },
  { name: 'Aural Skills IV', href: '/aural', icon: Mic },
  { name: 'Class Piano IV', href: '/piano', icon: Piano },
  { name: 'Knowledge Base', href: '/knowledgebase', icon: Music },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<UserStoreState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const loaded = loadUserStore();
    setStore(loaded);

    // Online/offline status detection
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker registration
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('SW registration failed:', err));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleRoadMode = () => {
    if (!store) return;
    const updated = { ...store, isRoadMode: !store.isRoadMode };
    setStore(updated);
    saveUserStore(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Network Offline / Status Banner */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOnline ? 'Network online. Offline cache active.' : 'You are currently offline. Local drills remain functional.'}
      </div>

      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode Active — Practice drills, theory algorithms, and local scores remain fully functional.</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              ❄
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Frost Music Lab
            </span>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleRoadMode}
            aria-label={`Toggle practice mode, currently ${store?.isRoadMode ? 'Road Mode' : 'Home Mode'}`}
            aria-pressed={!!store?.isRoadMode}
            className={`flex items-center space-x-1.5 px-3 py-2 min-h-[44px] rounded-full text-xs font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              store?.isRoadMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{store?.isRoadMode ? 'ROAD MODE' : 'HOME MODE'}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar / Mobile Nav Drawer */}
        <nav
          aria-label="Main Navigation"
          className={`${
            isMenuOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 shrink-0 transition-all`}
        >
          <div className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Streak Info */}
          {store && (
            <div className="mt-6 md:mt-8 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
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
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
