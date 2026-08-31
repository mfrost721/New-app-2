/**
 * LocalStorage State Store & Persistence Layer
 * Manages user state, skills mastery, practice logs, streaks, and settings.
 */

import { SkillItem, PracticeAttempt, updateSkillMastery } from '../adaptive/mastery';

export interface UserStoreState {
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

const STORAGE_KEY = 'frost_music_lab_user_store_v1';

function normalizeDateOnly(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return dateStr.split('T')[0];
}

function getDayDifference(previousDate: string | null, currentDate: string): number | null {
  const prev = normalizeDateOnly(previousDate);
  if (!prev) return null;
  const previousTs = new Date(`${prev}T00:00:00Z`).getTime();
  const currentTs = new Date(`${currentDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(previousTs) || !Number.isFinite(currentTs)) return null;
  return Math.floor((currentTs - previousTs) / (1000 * 60 * 60 * 24));
}

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

  // Class Piano IV
  { id: 'p1', category: 'Class Piano IV', topic: 'Major & Minor 2-Octave Scales', mastery: 82, totalAttempts: 25, correctAttempts: 21, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p2', category: 'Class Piano IV', topic: 'Tonic Arpeggios', mastery: 78, totalAttempts: 20, correctAttempts: 16, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p3', category: 'Class Piano IV', topic: 'Diminished 7th Resolutions', mastery: 68, totalAttempts: 14, correctAttempts: 9, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p4', category: 'Class Piano IV', topic: 'Melody Harmonization & Transposition', mastery: 61, totalAttempts: 10, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p5', category: 'Class Piano IV', topic: 'Happy Birthday Harmonization', mastery: 75, totalAttempts: 8, correctAttempts: 6, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p6', category: 'Class Piano IV', topic: 'Sight-Reading Exam Simulation', mastery: 66, totalAttempts: 12, correctAttempts: 8, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
  { id: 'p7', category: 'Class Piano IV', topic: 'The Star-Spangled Banner', mastery: 84, totalAttempts: 16, correctAttempts: 14, lastPracticed: '', recentLatencyMs: [], errorHistory: [] },
];

export const INITIAL_STATE: UserStoreState = {
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

export function loadUserStore(): UserStoreState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveUserStore(state: UserStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
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

  const today = new Date().toISOString().split('T')[0];
  let academicStreak = currentState.academicStreak;
  let pianoStreak = currentState.pianoStreak;

  if (currentState.lastAcademicDate !== today) {
    const gap = getDayDifference(currentState.lastAcademicDate, today);
    if (gap === 1) {
      academicStreak += 1;
    } else if (gap === null || gap > 1) {
      academicStreak = 1;
    }
  }

  if (targetSkill.category === 'Class Piano IV' && currentState.lastPianoDate !== today) {
    const gap = getDayDifference(currentState.lastPianoDate, today);
    if (gap === 1) {
      pianoStreak += 1;
    } else if (gap === null || gap > 1) {
      pianoStreak = 1;
    }
  }

  const updatedState: UserStoreState = {
    ...currentState,
    academicStreak,
    pianoStreak,
    lastAcademicDate: today,
    lastPianoDate: targetSkill.category === 'Class Piano IV' ? today : currentState.lastPianoDate,
    totalMinutesStudied: currentState.totalMinutesStudied + durationMinutes,
    skills: newSkills,
    history: newHistory,
  };

  saveUserStore(updatedState);
  return updatedState;
}
