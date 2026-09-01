/**
 * LocalStorage State Store & Persistence Layer
 * Manages user state, skills mastery, practice logs, streaks, and settings with
 * schema versioning, deterministic migration, sanitization, and corrupt data recovery.
 */

import { SkillItem, PracticeAttempt, updateSkillMastery } from '../adaptive/mastery';

export const CURRENT_SCHEMA_VERSION = 2;

export interface UserStoreState {
  version: number;
  examDate: string; // ISO date format, default 2026-12-08
  isRoadMode: boolean; // Phone-only / Road mode flag
  academicStreak: number;
  pianoStreak: number;
  lastAcademicDate: string | null;
  lastPianoDate: string | null;
  totalMinutesStudied: number;
  skills: SkillItem[];
  history: PracticeAttempt[];
  [key: string]: unknown; // Retain unrecognized top-level fields added by future versions
}

export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  app: string;
  state: UserStoreState;
}

export interface ImportResult {
  success: boolean;
  state?: UserStoreState;
  error?: string;
}

const STORAGE_KEY = 'frost_music_lab_user_store_v1';
const CORRUPT_BACKUP_KEY_PREFIX = 'frost_music_lab_corrupt_backup';

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

/**
 * Sanitizes and migrates raw data to a valid, current UserStoreState.
 * Deterministically upgrades older schema versions and handles partial/corrupted fields.
 */
export function migrateAndSanitizeStore(rawData: unknown): UserStoreState {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return { ...INITIAL_STATE };
  }

  const rawObj = rawData as Record<string, unknown>;

  // Check if rawData is wrapped in an export payload wrapper (e.g. { version, state: {...} })
  let stateData: Record<string, unknown> = rawObj;
  if (rawObj.state && typeof rawObj.state === 'object' && !Array.isArray(rawObj.state)) {
    stateData = rawObj.state as Record<string, unknown>;
  }

  // Determine schema version (unversioned legacy / v1 -> default to version 1)
  const inputVersion = typeof stateData.version === 'number' && Number.isInteger(stateData.version) && stateData.version > 0
    ? stateData.version
    : 1;

  // Step 1: Deterministic migration from legacy schema versions
  const migrated = { ...stateData };

  if (inputVersion < 2) {
    // Migration v1 -> v2: Add explicit schema version
    migrated.version = CURRENT_SCHEMA_VERSION;
  }

  // Step 2: Validate and sanitize state fields

  // version
  const version = typeof migrated.version === 'number' && migrated.version > 0
    ? Math.floor(migrated.version)
    : CURRENT_SCHEMA_VERSION;

  // examDate
  const examDate = typeof migrated.examDate === 'string' && migrated.examDate.trim().length > 0
    ? migrated.examDate.trim()
    : INITIAL_STATE.examDate;

  // isRoadMode
  const isRoadMode = typeof migrated.isRoadMode === 'boolean'
    ? migrated.isRoadMode
    : Boolean(migrated.isRoadMode);

  // academicStreak
  const academicStreak = typeof migrated.academicStreak === 'number' && !isNaN(migrated.academicStreak) && migrated.academicStreak >= 0
    ? Math.floor(migrated.academicStreak)
    : INITIAL_STATE.academicStreak;

  // pianoStreak
  const pianoStreak = typeof migrated.pianoStreak === 'number' && !isNaN(migrated.pianoStreak) && migrated.pianoStreak >= 0
    ? Math.floor(migrated.pianoStreak)
    : INITIAL_STATE.pianoStreak;

  // lastAcademicDate
  const lastAcademicDate = typeof migrated.lastAcademicDate === 'string'
    ? migrated.lastAcademicDate
    : migrated.lastAcademicDate === null
      ? null
      : INITIAL_STATE.lastAcademicDate;

  // lastPianoDate
  const lastPianoDate = typeof migrated.lastPianoDate === 'string'
    ? migrated.lastPianoDate
    : migrated.lastPianoDate === null
      ? null
      : INITIAL_STATE.lastPianoDate;

  // totalMinutesStudied
  const totalMinutesStudied = typeof migrated.totalMinutesStudied === 'number' && !isNaN(migrated.totalMinutesStudied) && migrated.totalMinutesStudied >= 0
    ? Math.round(migrated.totalMinutesStudied)
    : INITIAL_STATE.totalMinutesStudied;

  // skills sanitization and default merging
  const userSkills: SkillItem[] = [];
  const existingSkillIds = new Set<string>();

  if (Array.isArray(migrated.skills)) {
    for (const rawSkill of migrated.skills) {
      if (rawSkill && typeof rawSkill === 'object' && !Array.isArray(rawSkill)) {
        const skObj = rawSkill as Record<string, unknown>;
        const id = typeof skObj.id === 'string' ? skObj.id.trim() : '';
        if (!id) continue;

        existingSkillIds.add(id);

        const category = typeof skObj.category === 'string' ? (skObj.category as SkillItem['category']) : 'Theory IV';
        const topic = typeof skObj.topic === 'string' ? skObj.topic : id;
        const rawMastery = typeof skObj.mastery === 'number' && !isNaN(skObj.mastery) ? skObj.mastery : 50;
        const mastery = Math.min(100, Math.max(0, Math.round(rawMastery)));

        const totalAttempts = typeof skObj.totalAttempts === 'number' && !isNaN(skObj.totalAttempts) && skObj.totalAttempts >= 0
          ? Math.floor(skObj.totalAttempts)
          : 0;
        const correctAttempts = typeof skObj.correctAttempts === 'number' && !isNaN(skObj.correctAttempts) && skObj.correctAttempts >= 0
          ? Math.min(totalAttempts, Math.floor(skObj.correctAttempts))
          : 0;

        const lastPracticed = typeof skObj.lastPracticed === 'string' ? skObj.lastPracticed : '';

        const recentLatencyMs = Array.isArray(skObj.recentLatencyMs)
          ? skObj.recentLatencyMs.filter((lat): lat is number => typeof lat === 'number' && !isNaN(lat) && lat >= 0)
          : [];

        const errorHistory = Array.isArray(skObj.errorHistory)
          ? skObj.errorHistory.filter((err): err is string => typeof err === 'string')
          : [];

        // Preserve any custom or unknown skill fields
        const sanitizedSkill: SkillItem = {
          ...skObj,
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

        userSkills.push(sanitizedSkill);
      }
    }
  }

  // Merge missing initial skills (so new app versions add new default skills without overwriting existing progress)
  for (const initSkill of INITIAL_SKILLS) {
    if (!existingSkillIds.has(initSkill.id)) {
      userSkills.push({ ...initSkill });
    }
  }

  // history sanitization & capping
  const history: PracticeAttempt[] = [];
  if (Array.isArray(migrated.history)) {
    for (const rawAttempt of migrated.history) {
      if (rawAttempt && typeof rawAttempt === 'object' && !Array.isArray(rawAttempt)) {
        const attObj = rawAttempt as Record<string, unknown>;
        const skillId = typeof attObj.skillId === 'string' ? attObj.skillId : '';
        if (!skillId) continue;

        const isCorrect = Boolean(attObj.isCorrect);
        const responseTimeMs = typeof attObj.responseTimeMs === 'number' && !isNaN(attObj.responseTimeMs) && attObj.responseTimeMs >= 0
          ? Math.round(attObj.responseTimeMs)
          : 0;
        const date = typeof attObj.date === 'string' ? attObj.date : new Date().toISOString();

        const confidenceRating = typeof attObj.confidenceRating === 'number' && !isNaN(attObj.confidenceRating)
          ? Math.min(5, Math.max(1, Math.round(attObj.confidenceRating)))
          : undefined;

        const errorType = typeof attObj.errorType === 'string' ? attObj.errorType : undefined;

        history.push({
          skillId,
          isCorrect,
          responseTimeMs,
          date,
          ...(confidenceRating !== undefined && { confidenceRating }),
          ...(errorType !== undefined && { errorType }),
        });
      }
    }
  }

  // Cap history at 100 entries max
  const cappedHistory = history.slice(0, 100);

  // Return clean state preserving any unknown top-level keys from future versions
  const sanitizedState: UserStoreState = {
    ...migrated,
    version,
    examDate,
    isRoadMode,
    academicStreak,
    pianoStreak,
    lastAcademicDate,
    lastPianoDate,
    totalMinutesStudied,
    skills: userSkills.length > 0 ? userSkills : [...INITIAL_SKILLS],
    history: cappedHistory,
  };

  return sanitizedState;
}

export function loadUserStore(): UserStoreState {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...INITIAL_STATE };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };

    try {
      const parsed = JSON.parse(raw);
      return migrateAndSanitizeStore(parsed);
    } catch (parseErr) {
      console.error('Failed to parse localStorage user store, backing up corrupt data:', parseErr);
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        localStorage.setItem(`${CORRUPT_BACKUP_KEY_PREFIX}_${timestamp}`, raw);
      } catch (backupErr) {
        console.error('Failed to save corrupt backup in localStorage:', backupErr);
      }
      return { ...INITIAL_STATE };
    }
  } catch (err) {
    console.error('LocalStorage load error:', err);
    return { ...INITIAL_STATE };
  }
}

export function saveUserStore(state: UserStoreState): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const sanitized = migrateAndSanitizeStore(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return false;
  }
}

export function createExportPayload(state: UserStoreState): ExportDataPayload {
  const sanitized = migrateAndSanitizeStore(state);
  return {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'frost_music_lab',
    state: sanitized,
  };
}

export function importUserStore(jsonData: string | unknown): ImportResult {
  try {
    let parsed: unknown = jsonData;
    if (typeof jsonData === 'string') {
      const trimmed = jsonData.trim();
      if (!trimmed) {
        return { success: false, error: 'Import data is empty.' };
      }
      parsed = JSON.parse(trimmed);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Invalid import format. Expected a JSON object.' };
    }

    const migratedState = migrateAndSanitizeStore(parsed);

    // Save imported state immediately to localStorage
    const saved = saveUserStore(migratedState);

    return {
      success: true,
      state: migratedState,
      ...(!saved && { error: 'State was parsed successfully but could not be saved to localStorage.' }),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `Invalid JSON structure: ${err.message}` : 'Failed to parse import data.',
    };
  }
}

export function recordPracticeAttemptInStore(
  currentState: UserStoreState,
  attempt: PracticeAttempt,
  durationMinutes: number = 2
): UserStoreState {
  const sanitizedState = migrateAndSanitizeStore(currentState);
  const targetSkill = sanitizedState.skills.find(s => s.id === attempt.skillId);
  if (!targetSkill) return sanitizedState;

  const updatedSkill = updateSkillMastery(targetSkill, attempt);
  const newSkills = sanitizedState.skills.map(s => (s.id === attempt.skillId ? updatedSkill : s));
  const newHistory = [attempt, ...sanitizedState.history.slice(0, 99)];

  const today = attempt.date ? attempt.date.split('T')[0] : new Date().toISOString().split('T')[0];
  let academicStreak = sanitizedState.academicStreak;
  let pianoStreak = sanitizedState.pianoStreak;

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const past = new Date(dateStr).getTime();
    const curr = new Date(today).getTime();
    if (isNaN(past) || isNaN(curr)) return null;
    return Math.floor((curr - past) / (1000 * 60 * 60 * 24));
  };

  const isPiano = targetSkill.category === 'Class Piano IV' || targetSkill.category === 'Class Piano III';

  let newLastAcademicDate = sanitizedState.lastAcademicDate;
  let newLastPianoDate = sanitizedState.lastPianoDate;

  // Streak only advances on CORRECT answers
  if (attempt.isCorrect) {
    if (isPiano) {
      const pianoDiff = getDaysDiff(sanitizedState.lastPianoDate);
      if (pianoDiff === null || pianoDiff > 1) {
        pianoStreak = 1;
      } else if (pianoDiff === 1) {
        pianoStreak += 1;
      }
      newLastPianoDate = today;
    } else {
      const academicDiff = getDaysDiff(sanitizedState.lastAcademicDate);
      if (academicDiff === null || academicDiff > 1) {
        academicStreak = 1;
      } else if (academicDiff === 1) {
        academicStreak += 1;
      }
      newLastAcademicDate = today;
    }
  }

  const updatedState: UserStoreState = {
    ...sanitizedState,
    academicStreak,
    pianoStreak,
    lastAcademicDate: newLastAcademicDate,
    lastPianoDate: newLastPianoDate,
    totalMinutesStudied: sanitizedState.totalMinutesStudied + (attempt.isCorrect ? durationMinutes : 0),
    skills: newSkills,
    history: newHistory,
  };

  saveUserStore(updatedState);
  return updatedState;
}
