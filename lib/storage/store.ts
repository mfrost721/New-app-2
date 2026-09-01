/**
 * LocalStorage State Store & Persistence Layer
 * Manages user state, skills mastery, practice logs, streaks, and settings with
 * schema versioning, deterministic migrations, corruption recovery, and safe import/export.
 */

import { SkillItem, PracticeAttempt, updateSkillMastery } from '../adaptive/mastery';

export const CURRENT_SCHEMA_VERSION = 2;

export interface UserStoreState {
  version?: number;
  examDate: string; // ISO date format, default 2026-12-08
  isRoadMode: boolean; // Phone-only / Road mode flag
  academicStreak: number;
  pianoStreak: number;
  lastAcademicDate: string | null;
  lastPianoDate: string | null;
  totalMinutesStudied: number;
  skills: SkillItem[];
  history: PracticeAttempt[];
}

export interface UserStoreExportPayload {
  app: 'frost_music_lab';
  version: number;
  exportedAt: string;
  data: UserStoreState;
}

const STORAGE_KEY = 'frost_music_lab_user_store_v1';
const CORRUPT_BACKUP_PREFIX = 'frost_music_lab_corrupt_backup_';

export const INITIAL_SKILLS: SkillItem[] = [
  // Theory IV
  { id: 't1', category: 'Theory IV', topic: 'Pitch-Class Sets & Prime Form', mastery: 55, totalAttempts: 10, correctAttempts: 5, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't2', category: 'Theory IV', topic: 'Interval-Class Vectors', mastery: 62, totalAttempts: 8, correctAttempts: 5, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't3', category: 'Theory IV', topic: 'Twelve-Tone Matrix & Transformations', mastery: 48, totalAttempts: 12, correctAttempts: 5, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't4', category: 'Theory IV', topic: 'Modes & Symmetrical Scales', mastery: 75, totalAttempts: 15, correctAttempts: 12, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't5', category: 'Theory IV', topic: 'Score Analysis & Formal Structures', mastery: 70, totalAttempts: 6, correctAttempts: 4, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't6', category: 'Theory IV', topic: '20th Century Rhythm & Mixed Meter', mastery: 58, totalAttempts: 9, correctAttempts: 5, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Aural Skills IV
  { id: 'a1', category: 'Aural Skills IV', topic: 'Scale-Degree Recognition & Solfege', mastery: 80, totalAttempts: 20, correctAttempts: 16, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a2', category: 'Aural Skills IV', topic: 'Seventh-Chord Quality & Inversions', mastery: 52, totalAttempts: 18, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: ['Confused 2nd and 3rd inversion'] },
  { id: 'a3', category: 'Aural Skills IV', topic: 'Second-Inversion (6/4) Functions', mastery: 60, totalAttempts: 10, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a4', category: 'Aural Skills IV', topic: 'Secondary Dominants by Ear', mastery: 58, totalAttempts: 14, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a5', category: 'Aural Skills IV', topic: 'Non-Harmonic Tone Aural ID', mastery: 64, totalAttempts: 11, correctAttempts: 7, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a6', category: 'Aural Skills IV', topic: 'Melodic Dictation', mastery: 65, totalAttempts: 12, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a7', category: 'Aural Skills IV', topic: 'Sight Singing Accuracy', mastery: 72, totalAttempts: 15, correctAttempts: 11, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Class Piano III
  { id: 'p3_scale_c_maj', category: 'Class Piano III', topic: 'C Major Scale (2 Octaves)', mastery: 85, totalAttempts: 15, correctAttempts: 13, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_g_maj', category: 'Class Piano III', topic: 'G Major Scale (2 Octaves)', mastery: 80, totalAttempts: 12, correctAttempts: 10, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_d_maj', category: 'Class Piano III', topic: 'D Major Scale (2 Octaves)', mastery: 75, totalAttempts: 10, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_a_min_harm', category: 'Class Piano III', topic: 'A Harmonic Minor Scale', mastery: 72, totalAttempts: 11, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_e_min_mel', category: 'Class Piano III', topic: 'E Melodic Minor Scale', mastery: 70, totalAttempts: 9, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_arp_c_maj', category: 'Class Piano III', topic: 'C Major Tonic Arpeggio', mastery: 78, totalAttempts: 14, correctAttempts: 11, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_cadence_c', category: 'Class Piano III', topic: 'C Major Primary Cadence', mastery: 74, totalAttempts: 10, correctAttempts: 7, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Class Piano IV
  { id: 'p4_scale_eb_maj', category: 'Class Piano IV', topic: 'Eb Major Scale (100bpm)', mastery: 82, totalAttempts: 25, correctAttempts: 21, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_fs_min_harm', category: 'Class Piano IV', topic: 'F# Harmonic Minor Scale (100bpm)', mastery: 68, totalAttempts: 18, correctAttempts: 12, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_ab_maj', category: 'Class Piano IV', topic: 'Ab Major Scale (100bpm)', mastery: 78, totalAttempts: 20, correctAttempts: 16, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_cs_min_mel', category: 'Class Piano IV', topic: 'C# Melodic Minor Scale (100bpm)', mastery: 65, totalAttempts: 15, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_arp_d_dim7', category: 'Class Piano IV', topic: 'D Diminished 7th & Resolution', mastery: 68, totalAttempts: 14, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_harm_trans_g_to_a', category: 'Class Piano IV', topic: 'Melody Harmonization & Transposition', mastery: 61, totalAttempts: 10, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_sight_reading_lvl3', category: 'Class Piano IV', topic: 'Level III Sight-Reading Exam', mastery: 66, totalAttempts: 12, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_project_happy_birthday', category: 'Class Piano IV', topic: 'Happy Birthday Project', mastery: 75, totalAttempts: 8, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
];

export const INITIAL_STATE: UserStoreState = {
  version: CURRENT_SCHEMA_VERSION,
  examDate: '2026-12-08',
  isRoadMode: false,
  academicStreak: 5,
  pianoStreak: 3,
  lastAcademicDate: new Date().toISOString().split('T')[0],
  lastPianoDate: new Date().toISOString().split('T')[0],
  totalMinutesStudied: 340,
  skills: INITIAL_SKILLS,
  history: [],
};

function backupCorruptData(rawContent: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const backupKey = `${CORRUPT_BACKUP_PREFIX}${Date.now()}`;
    window.localStorage.setItem(backupKey, rawContent);
  } catch (err) {
    console.error('Failed to write corrupt store backup to localStorage:', err);
  }
}

function sanitizeNumber(val: unknown, fallback: number, min: number = 0, max: number = Infinity): number {
  if (typeof val !== 'number' || isNaN(val)) return fallback;
  return Math.min(max, Math.max(min, Math.round(val)));
}

function sanitizeString(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  return val;
}

function sanitizeSkillItem(rawSkill: unknown, defaultSkill?: SkillItem): SkillItem | null {
  if (!rawSkill || typeof rawSkill !== 'object') {
    return defaultSkill ? { ...defaultSkill } : null;
  }
  const s = rawSkill as Record<string, unknown>;

  const id = sanitizeString(s.id, defaultSkill?.id || '');
  if (!id) return null;

  const topic = sanitizeString(s.topic, defaultSkill?.topic || 'Unknown Topic');
  const category = (['Theory IV', 'Aural Skills IV', 'Class Piano III', 'Class Piano IV'].includes(s.category as string)
    ? s.category
    : defaultSkill?.category || 'Theory IV') as SkillItem['category'];

  const mastery = sanitizeNumber(s.mastery, defaultSkill?.mastery ?? 50, 0, 100);
  const totalAttempts = sanitizeNumber(s.totalAttempts, defaultSkill?.totalAttempts ?? 0, 0);
  const correctAttempts = sanitizeNumber(s.correctAttempts, defaultSkill?.correctAttempts ?? 0, 0, totalAttempts);
  const lastPracticed = sanitizeString(s.lastPracticed, defaultSkill?.lastPracticed || '');

  const recentLatencyMs = Array.isArray(s.recentLatencyMs)
    ? s.recentLatencyMs.filter((n): n is number => typeof n === 'number' && !isNaN(n) && n >= 0).slice(-10)
    : defaultSkill?.recentLatencyMs || [];

  const errorHistory = Array.isArray(s.errorHistory)
    ? s.errorHistory.filter((item): item is string => typeof item === 'string').slice(-20)
    : defaultSkill?.errorHistory || [];

  return {
    id,
    category,
    topic,
    mastery,
    totalAttempts,
    correctAttempts,
    lastPracticed,
    recentLatencyMs,
    errorHistory,
  };
}

function sanitizePracticeAttempt(raw: unknown): PracticeAttempt | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;

  const skillId = sanitizeString(a.skillId, '');
  if (!skillId) return null;

  const isCorrect = Boolean(a.isCorrect);
  const responseTimeMs = sanitizeNumber(a.responseTimeMs, 1000, 0);
  const date = sanitizeString(a.date, new Date().toISOString());

  const attempt: PracticeAttempt = {
    skillId,
    isCorrect,
    responseTimeMs,
    date,
  };

  if (typeof a.confidenceRating === 'number' && a.confidenceRating >= 1 && a.confidenceRating <= 5) {
    attempt.confidenceRating = Math.round(a.confidenceRating);
  }
  if (typeof a.errorType === 'string') {
    attempt.errorType = a.errorType;
  }

  return attempt;
}

export function migrateAndSanitizeStore(parsed: unknown): UserStoreState {
  if (!parsed || typeof parsed !== 'object') {
    return { ...INITIAL_STATE };
  }

  // Handle export payload wrapper if unwrapped directly
  let dataObj = parsed as Record<string, unknown>;
  if (dataObj.app === 'frost_music_lab' && dataObj.data && typeof dataObj.data === 'object') {
    dataObj = dataObj.data as Record<string, unknown>;
  }

  const inputVersion = typeof dataObj.version === 'number' ? dataObj.version : 1;

  // Migration logic (deterministic step-by-step)
  const workingData: Record<string, unknown> = { ...dataObj };

  if (inputVersion < 2) {
    // Version 1 -> Version 2 migration
    // Ensure all new fields have safe defaults and schema version tag is attached
    workingData.version = 2;
  }

  // Future versions (inputVersion > CURRENT_SCHEMA_VERSION) fallback gracefully:
  // We keep existing fields, set version to CURRENT_SCHEMA_VERSION, and sanitize.

  // Sanitize top-level scalar values
  const examDate = sanitizeString(workingData.examDate, INITIAL_STATE.examDate);
  const isRoadMode = Boolean(workingData.isRoadMode);
  const academicStreak = sanitizeNumber(workingData.academicStreak, INITIAL_STATE.academicStreak, 0);
  const pianoStreak = sanitizeNumber(workingData.pianoStreak, INITIAL_STATE.pianoStreak, 0);
  const lastAcademicDate = typeof workingData.lastAcademicDate === 'string' ? workingData.lastAcademicDate : null;
  const lastPianoDate = typeof workingData.lastPianoDate === 'string' ? workingData.lastPianoDate : null;
  const totalMinutesStudied = sanitizeNumber(workingData.totalMinutesStudied, INITIAL_STATE.totalMinutesStudied, 0);

  // Sanitize and merge skills
  const existingSkillsMap = new Map<string, SkillItem>();
  if (Array.isArray(workingData.skills)) {
    for (const item of workingData.skills) {
      const sanitized = sanitizeSkillItem(item);
      if (sanitized) {
        existingSkillsMap.set(sanitized.id, sanitized);
      }
    }
  }

  // Merge default skills if missing from loaded store
  const mergedSkills: SkillItem[] = [];
  for (const initSkill of INITIAL_SKILLS) {
    if (existingSkillsMap.has(initSkill.id)) {
      const existing = existingSkillsMap.get(initSkill.id)!;
      // Re-sanitize against default skill values for maximum robustness
      const merged = sanitizeSkillItem(existing, initSkill)!;
      mergedSkills.push(merged);
      existingSkillsMap.delete(initSkill.id);
    } else {
      mergedSkills.push({ ...initSkill });
    }
  }

  // Append any extra custom/future skills that were present in stored state
  for (const extraSkill of existingSkillsMap.values()) {
    mergedSkills.push(extraSkill);
  }

  // Sanitize history array
  const sanitizedHistory: PracticeAttempt[] = [];
  if (Array.isArray(workingData.history)) {
    for (const item of workingData.history) {
      const attempt = sanitizePracticeAttempt(item);
      if (attempt) {
        sanitizedHistory.push(attempt);
      }
    }
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    examDate,
    isRoadMode,
    academicStreak,
    pianoStreak,
    lastAcademicDate,
    lastPianoDate,
    totalMinutesStudied,
    skills: mergedSkills,
    history: sanitizedHistory.slice(0, 100),
  };
}

export function loadUserStore(): UserStoreState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    return migrateAndSanitizeStore(parsed);
  } catch (err) {
    console.error('Failed to parse or migrate store from localStorage:', err);
    // Backup corrupted string before resetting
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) backupCorruptData(raw);
    } catch {
      // Ignore backup read errors
    }
    return INITIAL_STATE;
  }
}

export function saveUserStore(state: UserStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: UserStoreState = {
      ...state,
      version: CURRENT_SCHEMA_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function exportUserStoreData(state?: UserStoreState): UserStoreExportPayload {
  const currentState = state || loadUserStore();
  return {
    app: 'frost_music_lab',
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: currentState,
  };
}

export function importUserStoreData(input: string | unknown): UserStoreState {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error('Invalid JSON format in backup file.');
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Import data is empty or invalid.');
  }

  const migratedState = migrateAndSanitizeStore(parsed);
  saveUserStore(migratedState);
  return migratedState;
}

export function recordPracticeAttemptInStore(
  currentState: UserStoreState,
  attempt: PracticeAttempt,
  durationMinutes: number = 2
): UserStoreState {
  const targetSkill = currentState.skills.find(s => s.id === attempt.skillId);
  if (!targetSkill) return currentState;

  const updatedSkill = updateSkillMastery(targetSkill, attempt);
  const newSkills = currentState.skills.map(s => (s.id === attempt.skillId ? updatedSkill : s));
  const newHistory = [attempt, ...currentState.history.slice(0, 99)];

  const today = attempt.date ? attempt.date.split('T')[0] : new Date().toISOString().split('T')[0];
  let academicStreak = currentState.academicStreak;
  let pianoStreak = currentState.pianoStreak;

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const past = new Date(dateStr).getTime();
    const curr = new Date(today).getTime();
    return Math.floor((curr - past) / (1000 * 60 * 60 * 24));
  };

  const isPiano = targetSkill.category === 'Class Piano IV' || targetSkill.category === 'Class Piano III';

  let newLastAcademicDate = currentState.lastAcademicDate;
  let newLastPianoDate = currentState.lastPianoDate;

  // Streak only advances on CORRECT answers
  if (attempt.isCorrect) {
    if (isPiano) {
      const pianoDiff = getDaysDiff(currentState.lastPianoDate);
      if (pianoDiff === null || pianoDiff > 1) {
        pianoStreak = 1;
      } else if (pianoDiff === 1) {
        pianoStreak += 1;
      }
      newLastPianoDate = today;
    } else {
      const academicDiff = getDaysDiff(currentState.lastAcademicDate);
      if (academicDiff === null || academicDiff > 1) {
        academicStreak = 1;
      } else if (academicDiff === 1) {
        academicStreak += 1;
      }
      newLastAcademicDate = today;
    }
  }

  const updatedState: UserStoreState = {
    ...currentState,
    academicStreak,
    pianoStreak,
    lastAcademicDate: newLastAcademicDate,
    lastPianoDate: newLastPianoDate,
    totalMinutesStudied: currentState.totalMinutesStudied + (attempt.isCorrect ? durationMinutes : 0),
    skills: newSkills,
    history: newHistory,
  };

  saveUserStore(updatedState);
  return updatedState;
}
