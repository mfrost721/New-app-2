/**
 * Spaced Repetition & Adaptive Mastery Engine
 * Tracks mastery %, latency, confidence, error patterns, and estimates exam readiness.
 */

export type ExamCategory = 'Theory IV' | 'Aural Skills IV' | 'Class Piano III' | 'Class Piano IV';

export interface SkillItem {
  id: string;
  category: ExamCategory;
  topic: string; // e.g., 'Pitch-Class Sets', 'Seventh-Chord Inversions', 'Descending Melodic Minor'
  mastery: number; // 0 to 100
  totalAttempts: number;
  correctAttempts: number;
  lastPracticed: string; // ISO date string
  recentLatencyMs: number[];
  errorHistory: string[];
}

export interface PracticeAttempt {
  skillId: string;
  isCorrect: boolean;
  confidenceRating?: number; // 1 to 5
  responseTimeMs: number;
  errorType?: string;
  date: string;
}

export interface ExamReadiness {
  category: ExamCategory;
  masteryPercentage: number;
  readinessLabel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXAM READY';
  passingProbability: number; // 0 to 100
  weakestTopics: string[];
  strongestTopics: string[];
}

/**
 * Calculates updated mastery score using standard spaced repetition EWMA weighting.
 */
export function updateSkillMastery(
  currentSkill: SkillItem,
  attempt: PracticeAttempt
): SkillItem {
  const { isCorrect, confidenceRating = 3, responseTimeMs, errorType } = attempt;

  let delta = 0;
  if (isCorrect) {
    // Reward depends on confidence: higher reward if low confidence turns out correct,
    // bonus if quick answer
    const speedBonus = responseTimeMs < 4000 ? 2 : 0;
    const confidenceBonus = confidenceRating <= 2 ? 3 : 1;
    delta = 5 + speedBonus + confidenceBonus;
  } else {
    // Penalty is higher if user was overconfident (wrong + confident = high penalty)
    const overconfidencePenalty = confidenceRating >= 4 ? 6 : 2;
    delta = -(8 + overconfidencePenalty);
  }

  const newMastery = Math.min(100, Math.max(0, Math.round(currentSkill.mastery + delta)));
  const newLatency = [...(currentSkill.recentLatencyMs || []).slice(-9), responseTimeMs];
  const newErrors = errorType && !isCorrect
    ? [...(currentSkill.errorHistory || []).slice(-19), errorType]
    : (currentSkill.errorHistory || []);

  return {
    ...currentSkill,
    mastery: newMastery,
    totalAttempts: currentSkill.totalAttempts + 1,
    correctAttempts: currentSkill.correctAttempts + (isCorrect ? 1 : 0),
    lastPracticed: attempt.date,
    recentLatencyMs: newLatency,
    errorHistory: newErrors,
  };
}

/**
 * Computes readiness assessment for a specific exam category.
 */
export function calculateExamReadiness(skills: SkillItem[], category: ExamCategory): ExamReadiness {
  const categorySkills = skills.filter(s => s.category === category);
  if (categorySkills.length === 0) {
    return {
      category,
      masteryPercentage: 0,
      readinessLabel: 'LOW',
      passingProbability: 25,
      weakestTopics: [],
      strongestTopics: [],
    };
  }

  const avgMastery = categorySkills.reduce((acc, s) => acc + s.mastery, 0) / categorySkills.length;
  const sorted = [...categorySkills].sort((a, b) => b.mastery - a.mastery);

  const strongestTopics = sorted.slice(0, 3).map(s => s.topic);
  const weakestTopics = sorted.slice(-3).reverse().map(s => s.topic);

  let readinessLabel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXAM READY' = 'LOW';
  if (avgMastery >= 85) readinessLabel = 'EXAM READY';
  else if (avgMastery >= 70) readinessLabel = 'HIGH';
  else if (avgMastery >= 50) readinessLabel = 'MODERATE';

  // Passing probability formula based on average mastery and consistency
  const passingProbability = Math.min(99, Math.max(10, Math.round(avgMastery * 0.95 + 5)));

  return {
    category,
    masteryPercentage: Math.round(avgMastery),
    readinessLabel,
    passingProbability,
    weakestTopics,
    strongestTopics,
  };
}
