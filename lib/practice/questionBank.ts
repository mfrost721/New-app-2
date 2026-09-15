/**
 * Shared question pool with selection without replacement within
 * category, difficulty, and subtopic, shuffled queue for finite banks,
 * explicit candidate pools for generated exercises, persistence with
 * in-memory fallback, and metadata reporting (poolSize, isReview).
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

export interface PoolQueueState {
  category: DrillCategory;
  difficulty: DrillDifficulty;
  topic?: string;
  queuePrints: string[];
  seenPrints: string[];
  lastServedPrint?: string;
  cycleCount: number;
}

export interface QuestionBankStoreData {
  pools: Record<string, PoolQueueState>;
  fingerprints: string[];
  updatedAt: string;
}

export interface UniqueQuestionOptions {
  category: DrillCategory;
  difficulty?: DrillDifficulty;
  topic?: string;
  seed?: number;
  recentLimit?: number;
  maxAttempts?: number;
}

export interface PoolStatus {
  key: string;
  poolSize: number;
  remainingInCycle: number;
  cycleCount: number;
  isReview: boolean;
}

const CANDIDATE_POOL_CACHE = new Map<string, DrillQuestion[]>();

let inMemoryStore: QuestionBankStoreData = {
  pools: {},
  fingerprints: [],
  updatedAt: new Date(0).toISOString(),
};

export function fingerprintQuestion(question: Pick<DrillQuestion, 'category' | 'prompt' | 'correctAnswer'>): string {
  const raw = `${question.category}|${normalizePrompt(question.prompt)}|${normalizePrompt(question.correctAnswer)}`;
  return fnv1a(raw);
}

export function normalizePrompt(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getPoolKey(category: DrillCategory, difficulty: DrillDifficulty = 1, topic?: string): string {
  const cleanTopic = topic ? normalizePrompt(topic) : 'all';
  return `${category}|${difficulty}|${cleanTopic}`;
}

export function clearPoolCache(): void {
  CANDIDATE_POOL_CACHE.clear();
}

/**
 * Generates and caches the candidate pool for a given category, difficulty, and subtopic.
 */
export function getCandidatePool(category: DrillCategory, difficulty: DrillDifficulty = 1, topic?: string): DrillQuestion[] {
  const key = getPoolKey(category, difficulty, topic);
  if (CANDIDATE_POOL_CACHE.has(key)) {
    return CANDIDATE_POOL_CACHE.get(key)!;
  }

  const seenPrints = new Set<string>();
  const pool: DrillQuestion[] = [];
  const MAX_GENERATED_POOL_SIZE = 36;
  const MAX_CONSECUTIVE_MISSES = 35;

  let consecutiveMisses = 0;
  let seedAttempt = 0;

  while (consecutiveMisses < MAX_CONSECUTIVE_MISSES && pool.length < MAX_GENERATED_POOL_SIZE) {
    const seed = seedAttempt * 10007 + 13;
    const q = generateDrillQuestion(category, difficulty, seed);

    if (topic && normalizePrompt(q.topic) !== normalizePrompt(topic)) {
      seedAttempt += 1;
      continue;
    }

    const print = fingerprintQuestion(q);
    if (!seenPrints.has(print)) {
      seenPrints.add(print);
      pool.push(q);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses += 1;
    }
    seedAttempt += 1;
  }

  CANDIDATE_POOL_CACHE.set(key, pool);
  return pool;
}

export function loadQuestionBankStore(): QuestionBankStoreData {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return inMemoryStore;
  }
  try {
    const raw = localStorage.getItem(QUESTION_BANK_STORAGE_KEY);
    if (!raw) return inMemoryStore;
    const parsed = JSON.parse(raw);

    const fingerprints = Array.isArray(parsed?.fingerprints)
      ? parsed.fingerprints.filter((item: unknown) => typeof item === 'string')
      : [];

    const pools: Record<string, PoolQueueState> = {};
    if (typeof parsed?.pools === 'object' && parsed.pools !== null) {
      for (const [k, v] of Object.entries(parsed.pools)) {
        if (v && typeof v === 'object') {
          const pState = v as Partial<PoolQueueState>;
          pools[k] = {
            category: (pState.category || 'tonal') as DrillCategory,
            difficulty: (pState.difficulty || 1) as DrillDifficulty,
            topic: pState.topic,
            queuePrints: Array.isArray(pState.queuePrints) ? pState.queuePrints.filter(item => typeof item === 'string') : [],
            seenPrints: Array.isArray(pState.seenPrints) ? pState.seenPrints.filter(item => typeof item === 'string') : [],
            lastServedPrint: typeof pState.lastServedPrint === 'string' ? pState.lastServedPrint : undefined,
            cycleCount: typeof pState.cycleCount === 'number' ? pState.cycleCount : 0,
          };
        }
      }
    }

    inMemoryStore = {
      pools,
      fingerprints,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
    return inMemoryStore;
  } catch {
    return inMemoryStore;
  }
}

export function saveQuestionBankStore(store: QuestionBankStoreData): void {
  inMemoryStore = store;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota or blocked storage errors; in-memory store keeps running
  }
}

export function resetPools(): void {
  inMemoryStore = { pools: {}, fingerprints: [], updatedAt: new Date(0).toISOString() };
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(QUESTION_BANK_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

export function loadRecentPromptStore(): RecentPromptStore {
  const data = loadQuestionBankStore();
  return {
    fingerprints: data.fingerprints,
    updatedAt: data.updatedAt,
  };
}

export function saveRecentPromptStore(store: RecentPromptStore): void {
  const current = loadQuestionBankStore();
  saveQuestionBankStore({
    ...current,
    fingerprints: store.fingerprints,
    updatedAt: store.updatedAt,
  });
}

export function rememberFingerprint(fingerprint: string, recentLimit: number = DEFAULT_RECENT_LIMIT): RecentPromptStore {
  const current = loadQuestionBankStore();
  const fingerprints = [fingerprint, ...current.fingerprints.filter((item) => item !== fingerprint)].slice(0, recentLimit);
  const nextStore = {
    ...current,
    fingerprints,
    updatedAt: new Date().toISOString(),
  };
  saveQuestionBankStore(nextStore);
  return { fingerprints: nextStore.fingerprints, updatedAt: nextStore.updatedAt };
}

/**
 * Shuffles an array of fingerprints using Fisher-Yates and a PRNG seed.
 */
function shufflePrints(prints: string[], seed?: number): string[] {
  const arr = [...prints];
  const rng = createSeededRandom(seed ?? Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Returns current pool status metadata for inspection or testing.
 */
export function getPoolStatus(category: DrillCategory, difficulty: DrillDifficulty = 1, topic?: string): PoolStatus {
  const key = getPoolKey(category, difficulty, topic);
  const candidates = getCandidatePool(category, difficulty, topic);
  const store = loadQuestionBankStore();
  const poolState = store.pools[key];

  const poolSize = candidates.length;
  const remainingInCycle = poolState ? poolState.queuePrints.length : poolSize;
  const cycleCount = poolState ? poolState.cycleCount : 0;

  return {
    key,
    poolSize,
    remainingInCycle,
    cycleCount,
    isReview: cycleCount > 0,
  };
}

/**
 * Primary selector: selects questions without replacement within category, difficulty, and subtopic.
 * Uses a shuffled queue for finite banks and bounded explicit candidate pool for generated exercises.
 * Avoids immediate repeat when restarting a pool with more than one item.
 */
export function generateUnique(options: UniqueQuestionOptions): DrillQuestion {
  const difficulty = options.difficulty ?? 1;
  const recentLimit = options.recentLimit ?? DEFAULT_RECENT_LIMIT;
  const key = getPoolKey(options.category, difficulty, options.topic);

  const candidates = getCandidatePool(options.category, difficulty, options.topic);
  const poolSize = candidates.length;

  if (poolSize === 0) {
    const fallback = generateDrillQuestion(options.category, difficulty, options.seed ?? Date.now());
    return { ...fallback, poolSize: 1, isReview: false };
  }

  const store = loadQuestionBankStore();
  let poolState = store.pools[key];

  let isReview = false;

  // Initialize or refill pool queue when empty
  if (!poolState || poolState.queuePrints.length === 0) {
    const nextCycleCount = poolState ? poolState.cycleCount + 1 : 0;
    isReview = nextCycleCount > 0;

    const candidatePrints = candidates.map((q) => fingerprintQuestion(q));
    const newQueue = shufflePrints(candidatePrints, options.seed);

    // Rule: when restarting a pool with more than one item, avoid repeating the last item immediately
    const lastServed = poolState?.lastServedPrint;
    if (poolSize > 1 && lastServed && newQueue[0] === lastServed) {
      const swapIdx = 1;
      const tmp = newQueue[0];
      newQueue[0] = newQueue[swapIdx];
      newQueue[swapIdx] = tmp;
    }

    poolState = {
      category: options.category,
      difficulty,
      topic: options.topic,
      queuePrints: newQueue,
      seenPrints: [],
      lastServedPrint: lastServed,
      cycleCount: nextCycleCount,
    };
  } else {
    isReview = poolState.cycleCount > 0;
  }

  const nextPrint = poolState.queuePrints.shift()!;
  poolState.seenPrints.push(nextPrint);
  poolState.lastServedPrint = nextPrint;

  // Find question matching fingerprint
  let selected = candidates.find((q) => fingerprintQuestion(q) === nextPrint);
  if (!selected) {
    selected = generateDrillQuestion(options.category, difficulty, options.seed ?? Date.now());
  }

  // Update store
  store.pools[key] = poolState;
  const updatedGlobalPrints = [nextPrint, ...store.fingerprints.filter((p) => p !== nextPrint)].slice(0, recentLimit);
  store.fingerprints = updatedGlobalPrints;
  store.updatedAt = new Date().toISOString();

  saveQuestionBankStore(store);

  return {
    ...selected,
    poolSize,
    isReview,
  };
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
