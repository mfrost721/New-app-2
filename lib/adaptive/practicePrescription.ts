/**
 * Practice Prescription Engine
 * Generates "Next Best 20 Minutes" and customizable time-based study plans.
 */

import { SkillItem } from './mastery';

export interface PracticeRecommendation {
  topic: string;
  category: string;
  allocatedMinutes: number;
  reason: string;
}

export interface SessionPrescription {
  totalMinutes: number;
  recommendations: PracticeRecommendation[];
}

export function generatePracticePrescription(
  skills: SkillItem[],
  totalMinutes: number = 20,
  isRoadMode: boolean = false
): SessionPrescription {
  // Filter out piano technique if in Road Mode
  let eligibleSkills = isRoadMode
    ? skills.filter(s => s.category !== 'Class Piano IV')
    : [...skills];

  if (eligibleSkills.length === 0) {
    eligibleSkills = [...skills];
  }

  // Sort by lowest mastery score first
  const sortedWeakest = [...eligibleSkills].sort((a, b) => a.mastery - b.mastery);
  const selectedSkills = sortedWeakest.slice(0, Math.min(3, sortedWeakest.length));

  if (selectedSkills.length === 0) {
    return {
      totalMinutes,
      recommendations: [
        {
          topic: 'Pitch-Class Set Theory',
          category: 'Theory IV',
          allocatedMinutes: totalMinutes,
          reason: 'Initial baseline setup',
        },
      ],
    };
  }

  const minutesPerTopic = Math.max(3, Math.floor(totalMinutes / selectedSkills.length));

  const recommendations: PracticeRecommendation[] = selectedSkills.map((s, idx) => {
    // Add leftover minutes to the first/weakest topic
    const extra = idx === 0 ? totalMinutes - minutesPerTopic * selectedSkills.length : 0;
    return {
      topic: s.topic,
      category: s.category,
      allocatedMinutes: minutesPerTopic + extra,
      reason: s.mastery < 60
        ? `Low mastery (${s.mastery}%) - needs immediate focus`
        : `Spaced repetition retention check (Mastery ${s.mastery}%)`,
    };
  });

  return { totalMinutes, recommendations };
}
