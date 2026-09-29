/**
 * LocalStorage State Store & Persistence Layer
 * Manages user state, skills mastery, practice logs, streaks, and settings.
 */

import { SkillItem, PracticeAttempt, updateSkillMastery } from '../adaptive/mastery';

export interface UserStoreState {
  schemaVersion: number;
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

export const STORE_SCHEMA_VERSION = 3;
const STORAGE_KEY_V3 = 'frost_music_lab_user_store_v3';
const STORAGE_KEY_V2 = 'frost_music_lab_user_store_v2';

export const INITIAL_SKILLS: SkillItem[] = [
  // Theory IV
  { id: 't1', category: 'Theory IV', topic: 'Pitch-Class Sets & Prime Form', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't2', category: 'Theory IV', topic: 'Interval-Class Vectors', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't3', category: 'Theory IV', topic: 'Twelve-Tone Matrix & Transformations', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't4', category: 'Theory IV', topic: 'Modes & Symmetrical Scales', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't5', category: 'Theory IV', topic: 'Score Analysis & Formal Structures', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 't6', category: 'Theory IV', topic: '20th Century Rhythm & Mixed Meter', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Aural Skills IV
  { id: 'a1', category: 'Aural Skills IV', topic: 'Scale-Degree Recognition & Solfege', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a2', category: 'Aural Skills IV', topic: 'Seventh-Chord Quality & Inversions', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a3', category: 'Aural Skills IV', topic: 'Second-Inversion (6/4) Functions', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a4', category: 'Aural Skills IV', topic: 'Secondary Dominants by Ear', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a5', category: 'Aural Skills IV', topic: 'Non-Harmonic Tone Aural ID', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a6', category: 'Aural Skills IV', topic: 'Melodic Dictation', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'a7', category: 'Aural Skills IV', topic: 'Sight Singing Accuracy', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Class Piano III
  { id: 'p3_scale_c_maj', category: 'Class Piano III', topic: 'C Major Scale (2 Octaves)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_g_maj', category: 'Class Piano III', topic: 'G Major Scale (2 Octaves)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_d_maj', category: 'Class Piano III', topic: 'D Major Scale (2 Octaves)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_a_min_harm', category: 'Class Piano III', topic: 'A Harmonic Minor Scale', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_scale_e_min_mel', category: 'Class Piano III', topic: 'E Melodic Minor Scale', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_arp_c_maj', category: 'Class Piano III', topic: 'C Major Tonic Arpeggio', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3_cadence_c', category: 'Class Piano III', topic: 'C Major Primary Cadence', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },

  // Class Piano IV
  { id: 'p4_scale_eb_maj', category: 'Class Piano IV', topic: 'Eb Major Scale (100bpm)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_fs_min_harm', category: 'Class Piano IV', topic: 'F# Harmonic Minor Scale (100bpm)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_ab_maj', category: 'Class Piano IV', topic: 'Ab Major Scale (100bpm)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_scale_cs_min_mel', category: 'Class Piano IV', topic: 'C# Melodic Minor Scale (100bpm)', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_arp_d_dim7', category: 'Class Piano IV', topic: 'D Diminished 7th & Resolution', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_harm_trans_g_to_a', category: 'Class Piano IV', topic: 'Melody Harmonization & Transposition', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_sight_reading_lvl3', category: 'Class Piano IV', topic: 'Level III Sight-Reading Exam', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4_project_happy_birthday', category: 'Class Piano IV', topic: 'Happy Birthday Project', mastery: 0, totalAttempts: 0, correctAttempts: 0, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
];

export const INITIAL_STATE: UserStoreState = {
  schemaVersion: STORE_SCHEMA_VERSION,
  examDate: '2026-12-08',
  isRoadMode: false,
  academicStreak: 0,
  pianoStreak: 0,
  lastAcademicDate: null,
  lastPianoDate: null,
  totalMinutesStudied: 0,
  skills: INITIAL_SKILLS,
  history: [],
};

export function exportUserStore(state?: UserStoreState): string {
  const targetState = state ?? loadUserStore();
  return JSON.stringify(targetState, null, 2);
}

export function migrateUserStore(raw: unknown, baseSkills: SkillItem[] = INITIAL_SKILLS): UserStoreState {
  const parsed = (raw && typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
  const incomingSkills = Array.isArray(parsed.skills) ? parsed.skills as SkillItem[] : [];
  const byId = new Map(incomingSkills.filter((skill) => skill && typeof skill.id === 'string').map((skill) => [skill.id, skill]));

  // Combine INITIAL_SKILLS and baseSkills to ensure all registered/current skills are preserved
  const registrySkillsMap = new Map<string, SkillItem>();
  for (const s of INITIAL_SKILLS) registrySkillsMap.set(s.id, s);
  for (const s of baseSkills) registrySkillsMap.set(s.id, s);

  const preservedSkillIds = new Set(registrySkillsMap.keys());

  // First: map registered skills, restoring imported skill data if found in file, or keeping registered skill
  const skills: SkillItem[] = Array.from(registrySkillsMap.values()).map(
    (regSkill) => byId.get(regSkill.id) ?? regSkill
  );

  // Second: preserve any additional custom skills in incomingSkills that are not in registry
  for (const skill of incomingSkills) {
    if (skill && typeof skill.id === 'string' && !preservedSkillIds.has(skill.id)) {
      skills.push(skill);
    }
  }

  const history = Array.isArray(parsed.history) ? parsed.history as PracticeAttempt[] : [];

  return {
    ...INITIAL_STATE,
    ...parsed,
    schemaVersion: STORE_SCHEMA_VERSION,
    skills,
    history,
  };
}

export function importUserStore(jsonInput: string, currentSkills: SkillItem[] = INITIAL_SKILLS): UserStoreState {
  if (typeof jsonInput !== 'string') {
    throw new Error('Invalid store JSON input: must be a string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonInput);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid store JSON: expected an object');
  }

  const obj = parsed as Record<string, unknown>;

  const storeKeys = [
    'schemaVersion',
    'examDate',
    'isRoadMode',
    'academicStreak',
    'pianoStreak',
    'lastAcademicDate',
    'lastPianoDate',
    'totalMinutesStudied',
    'skills',
    'history',
  ];
  const hasStoreKey = storeKeys.some((k) => Object.prototype.hasOwnProperty.call(obj, k));

  if (!hasStoreKey) {
    throw new Error('Invalid store JSON: missing store structure');
  }

  if (obj.skills !== undefined && !Array.isArray(obj.skills)) {
    throw new Error('Invalid store JSON: skills must be an array');
  }
  if (obj.history !== undefined && !Array.isArray(obj.history)) {
    throw new Error('Invalid store JSON: history must be an array');
  }

  const migrated = migrateUserStore(parsed, currentSkills);
  saveUserStore(migrated);
  return migrated;
}

export function loadUserStore(): UserStoreState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const rawV3 = localStorage.getItem(STORAGE_KEY_V3);
    const rawV2 = rawV3 ? null : localStorage.getItem(STORAGE_KEY_V2);
    const raw = rawV3 ?? rawV2;
    if (!raw) return INITIAL_STATE;
    const migrated = migrateUserStore(JSON.parse(raw));
    if (!rawV3) saveUserStore(migrated);
    return migrated;
  } catch {
    return INITIAL_STATE;
  }
}

export function saveUserStore(state: UserStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify({ ...state, schemaVersion: STORE_SCHEMA_VERSION }));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function updateExamDate(state: UserStoreState, examDate: string): UserStoreState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return state;
  }
  const newState = { ...state, examDate };
  saveUserStore(newState);
  return newState;
}

export function recordPracticeAttemptInStore(
  currentState: UserStoreState,
  attempt: PracticeAttempt,
  durationMinutes: number = 2
): UserStoreState {
  const targetSkill = currentState.skills.find(s => s.id === attempt.skillId);
  if (!targetSkill) return currentState;

  const countsTowardMastery = attempt.countsTowardMastery ?? !currentState.isRoadMode;

  if (!countsTowardMastery) {
    const loggedAttempt = {
      ...attempt,
      countsTowardMastery: false,
    };
    const loggedState: UserStoreState = {
      ...currentState,
      schemaVersion: STORE_SCHEMA_VERSION,
      history: [loggedAttempt, ...currentState.history.slice(0, 99)],
    };
    saveUserStore(loggedState);
    return loggedState;
  }

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
    schemaVersion: STORE_SCHEMA_VERSION,
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
