/**
 * Practice Prescription Engine
 * Generates "Next Best 20 Minutes" and customizable time-based study plans.
 */

import { SkillItem } from './mastery';

export interface PracticeRecommendation {
  skillId?: string;
  topic: string;
  category: string;
  allocatedMinutes: number;
  reason: string;
  href: string;
}

export function hrefForSkill(skillId: string, category: string): string {
  if (category.startsWith('Class Piano')) return `/piano?skill=${encodeURIComponent(skillId)}`;
  if (category === 'Aural Skills IV' || skillId.startsWith('a')) return `/aural?skill=${encodeURIComponent(skillId)}`;
  return `/theory?skill=${encodeURIComponent(skillId)}`;
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
  const normalizedTotalMinutes = Math.max(0, Math.floor(totalMinutes));

  // Filter out piano technique if in Road Mode
  let eligibleSkills = isRoadMode
    ? skills.filter(s => s.category !== 'Class Piano IV' && s.category !== 'Class Piano III')
    : [...skills];

  if (eligibleSkills.length === 0) {
    eligibleSkills = [...skills];
  }

  // Sort by lowest mastery score first
  const sortedWeakest = [...eligibleSkills].sort((a, b) => a.mastery - b.mastery);
  const selectedSkills = sortedWeakest.slice(0, Math.min(3, sortedWeakest.length));

  if (selectedSkills.length === 0) {
    return {
      totalMinutes: normalizedTotalMinutes,
      recommendations: [
        {
          skillId: 't1',
          topic: 'Pitch-Class Set Theory',
          category: 'Theory IV',
          allocatedMinutes: normalizedTotalMinutes,
          reason: 'Initial baseline setup',
          href: hrefForSkill('t1', 'Theory IV'),
        },
      ],
    };
  }

  const selectedCount = selectedSkills.length;
  const minutesPerTopic = normalizedTotalMinutes >= selectedCount * 3
    ? Math.max(3, Math.floor(normalizedTotalMinutes / selectedCount))
    : Math.floor(normalizedTotalMinutes / selectedCount);
  const remainder = normalizedTotalMinutes - minutesPerTopic * selectedCount;

  const recommendations: PracticeRecommendation[] = selectedSkills.map((s, idx) => {
    const extra = normalizedTotalMinutes >= selectedCount * 3
      ? (idx === 0 ? remainder : 0)
      : (idx < remainder ? 1 : 0);
    return {
      skillId: s.id,
      topic: s.topic,
      category: s.category,
      allocatedMinutes: minutesPerTopic + extra,
      reason: s.mastery < 60
        ? `Low mastery (${s.mastery}%) - needs immediate focus`
        : `Spaced repetition retention check (Mastery ${s.mastery}%)`,
      href: hrefForSkill(s.id, s.category),
    };
  });

  return { totalMinutes: normalizedTotalMinutes, recommendations };
}
