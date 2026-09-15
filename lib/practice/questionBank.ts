/**
 * Shared question pool with seeded generation, fingerprinting,
 * localStorage anti-repeat cache, and generateUnique().
 */

import {
  createSeededRandom,
  generateDrillQuestion,
  DrillCategory,
  DrillDifficulty,
  DrillQuestion,
} from '../music/drillEngine';

export const QUESTION_BANK_STORAGE_KEY = 'frost_music_lab_recent_prompts_v1';
export const DEFAULT_RECENT_LIMIT = 40;
export const DEFAULT_UNIQUE_ATTEMPTS = 24;

export interface RecentPromptStore {
  fingerprints: string[];
  updatedAt: string;
}

export interface UniqueQuestionOptions {
  category: DrillCategory;
  difficulty?: DrillDifficulty;
  seed?: number;
  recentLimit?: number;
  maxAttempts?: number;
}

export function fingerprintQuestion(question: Pick<DrillQuestion, 'category' | 'prompt' | 'correctAnswer'>): string {
  const raw = `${question.category}|${normalizePrompt(question.prompt)}|${normalizePrompt(question.correctAnswer)}`;
  return fnv1a(raw);
}

export function normalizePrompt(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function loadRecentPromptStore(): RecentPromptStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { fingerprints: [], updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    if (!raw) return { fingerprints: [], updatedAt: new Date(0).toISOString() };
    const parsed = JSON.parse(raw);
    const fingerprints = Array.isArray(parsed?.fingerprints)
      ? parsed.fingerprints.filter((item: unknown) => typeof item === 'string')
      : [];
    return {
      fingerprints,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return { fingerprints: [], updatedAt: new Date(0).toISOString() };
  }
}

export function saveRecentPromptStore(store: RecentPromptStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota / private-mode failures; generation still works without persistence.
  }
}

export function rememberFingerprint(fingerprint: string, recentLimit: number = DEFAULT_RECENT_LIMIT): RecentPromptStore {
  const current = loadRecentPromptStore();
  const fingerprints = [fingerprint, ...current.fingerprints.filter((item) => item !== fingerprint)].slice(0, recentLimit);
  const next = { fingerprints, updatedAt: new Date().toISOString() };
  saveRecentPromptStore(next);
  return next;
}

export function generateUnique(options: UniqueQuestionOptions): DrillQuestion {
  const difficulty = options.difficulty ?? 1;
  const recentLimit = options.recentLimit ?? DEFAULT_RECENT_LIMIT;
  const maxAttempts = options.maxAttempts ?? DEFAULT_UNIQUE_ATTEMPTS;
  const recent = loadRecentPromptStore();
  const seen = new Set(recent.fingerprints);
  const rng = createSeededRandom(options.seed ?? Date.now());

  let lastQuestion = generateDrillQuestion(options.category, difficulty, Math.floor(rng() * 0xffffffff));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = Math.floor(rng() * 0xffffffff);
    const question = generateDrillQuestion(options.category, difficulty, seed);
    const fingerprint = fingerprintQuestion(question);
    lastQuestion = question;
    if (!seen.has(fingerprint)) {
      rememberFingerprint(fingerprint, recentLimit);
      return question;
    }
  }

  rememberFingerprint(fingerprintQuestion(lastQuestion), recentLimit);
  return lastQuestion;
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
