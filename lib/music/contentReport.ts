/**
 * Content Analysis & Reporting Engine
 * Analyzes authored question templates, generated variants, transposition variants,
 * answer distribution, small pools, duplicate IDs, invalid skill references, and missing categories.
 */

import {
  DrillCategory,
  DrillDifficulty,
  generateDrillQuestion,
  SUBTOPIC_REGISTRY,
} from './drillEngine';
import { getCandidatePool, normalizePrompt } from '../practice/questionBank';
import { INITIAL_SKILLS } from '../storage/store';

export interface AnswerTypeDistribution {
  inputType: string;
  count: number;
  percentage: number;
}

export interface SmallPoolInfo {
  category: DrillCategory;
  difficulty: DrillDifficulty;
  poolSize: number;
  topic?: string;
}

export interface ContentReportData {
  authoredTemplatesCount: number;
  templatesByCategory: Record<DrillCategory, string[]>;
  independentlyAuthoredQuestionsCount: number;
  transpositionVariantsCount: number;
  totalGeneratedVariantsCount: number;
  uniqueNormalizedPromptsCount: number;
  answerDistribution: AnswerTypeDistribution[];
  smallPools: SmallPoolInfo[];
  missingCategories: DrillCategory[];
  invalidSkillReferences: { source: string; skillId: string }[];
  duplicateIds: string[];
}

const ALL_CATEGORIES: DrillCategory[] = [
  'tonal',
  'form',
  'modes',
  'setTheory',
  'twelveTone',
  'rhythm',
  'postTonal',
];

const ALL_DIFFICULTIES: DrillDifficulty[] = [1, 2, 3, 4];

/**
 * Generates a comprehensive content analysis report.
 */
export function generateContentReport(sampleSeedsCount: number = 50): ContentReportData {
  const registeredSkillIds = new Set(INITIAL_SKILLS.map((s) => s.id));
  const templatesByCategory: Record<DrillCategory, Set<string>> = {
    tonal: new Set(),
    form: new Set(),
    modes: new Set(),
    setTheory: new Set(),
    twelveTone: new Set(),
    rhythm: new Set(),
    postTonal: new Set(),
  };

  const allTemplates = new Set<string>();
  const variantKeysSeen = new Set<string>();
  const normalizedPromptsSeen = new Set<string>();

  const inputTypeCounts: Record<string, number> = {};
  let totalSampledQuestions = 0;

  const invalidSkillReferences: { source: string; skillId: string }[] = [];
  const duplicateIdsSet = new Set<string>();
  const questionIdsSeen = new Set<string>();

  let transpositionVariantsCount = 0;

  // Validate Subtopic Registry Skill References
  for (const [subtopicName, mapping] of Object.entries(SUBTOPIC_REGISTRY)) {
    if (!registeredSkillIds.has(mapping.skillId)) {
      invalidSkillReferences.push({
        source: `SUBTOPIC_REGISTRY[${subtopicName}]`,
        skillId: mapping.skillId,
      });
    }
  }

  // Sample questions across all categories, difficulties, and seeds
  for (const cat of ALL_CATEGORIES) {
    for (const diff of ALL_DIFFICULTIES) {
      for (let s = 1; s <= sampleSeedsCount; s += 1) {
        const seed = s * 10007 + (diff * 101) + cat.length;
        const q = generateDrillQuestion(cat, diff, seed);
        totalSampledQuestions += 1;

        if (q.templateId) {
          templatesByCategory[cat].add(q.templateId);
          allTemplates.add(q.templateId);
        }

        if (q.variantKey) {
          variantKeysSeen.add(`${q.templateId ?? cat}:${q.variantKey}`);
          if (q.variantKey.startsWith('key:') || q.variantKey.startsWith('root:') || q.variantKey.includes('tonic:')) {
            transpositionVariantsCount += 1;
          }
        }

        const normPrompt = normalizePrompt(q.prompt);
        normalizedPromptsSeen.add(normPrompt);

        // Track answer type
        const typeKey = q.answerType || q.inputType;
        inputTypeCounts[typeKey] = (inputTypeCounts[typeKey] || 0) + 1;

        // Check skill reference
        if (!registeredSkillIds.has(q.skillId)) {
          invalidSkillReferences.push({
            source: `DrillQuestion[id=${q.id}]`,
            skillId: q.skillId,
          });
        }

        // Check for duplicate question IDs generated for different prompts
        if (questionIdsSeen.has(q.id)) {
          duplicateIdsSet.add(q.id);
        } else {
          questionIdsSeen.add(q.id);
        }
      }
    }
  }

  // Check missing categories
  const missingCategories: DrillCategory[] = ALL_CATEGORIES.filter(
    (cat) => templatesByCategory[cat].size === 0
  );

  // Analyze candidate pools for small pools
  const smallPools: SmallPoolInfo[] = [];
  for (const cat of ALL_CATEGORIES) {
    for (const diff of ALL_DIFFICULTIES) {
      const candidates = getCandidatePool(cat, diff);
      if (candidates.length < 10) {
        smallPools.push({
          category: cat,
          difficulty: diff,
          poolSize: candidates.length,
        });
      }
    }
  }

  // Answer distribution calculation
  const answerDistribution: AnswerTypeDistribution[] = Object.entries(inputTypeCounts).map(
    ([inputType, count]) => ({
      inputType,
      count,
      percentage: Math.round((count / Math.max(1, totalSampledQuestions)) * 1000) / 10,
    })
  );

  const formattedTemplatesByCategory: Record<DrillCategory, string[]> = {
    tonal: Array.from(templatesByCategory.tonal),
    form: Array.from(templatesByCategory.form),
    modes: Array.from(templatesByCategory.modes),
    setTheory: Array.from(templatesByCategory.setTheory),
    twelveTone: Array.from(templatesByCategory.twelveTone),
    rhythm: Array.from(templatesByCategory.rhythm),
    postTonal: Array.from(templatesByCategory.postTonal),
  };

  return {
    authoredTemplatesCount: allTemplates.size,
    templatesByCategory: formattedTemplatesByCategory,
    independentlyAuthoredQuestionsCount: allTemplates.size,
    transpositionVariantsCount,
    totalGeneratedVariantsCount: variantKeysSeen.size,
    uniqueNormalizedPromptsCount: normalizedPromptsSeen.size,
    answerDistribution,
    smallPools,
    missingCategories,
    invalidSkillReferences,
    duplicateIds: Array.from(duplicateIdsSet),
  };
}

/**
 * Formats a report object into a human-readable string for terminal output.
 */
export function formatReportText(report: ContentReportData): string {
  const lines: string[] = [];
  lines.push('====================================================');
  lines.push('       FROST MUSIC LAB - CONTENT REPORT             ');
  lines.push('====================================================');
  lines.push('');
  lines.push(`Authored Templates Count: ${report.authoredTemplatesCount}`);
  lines.push(`Independently Authored Questions: ${report.independentlyAuthoredQuestionsCount}`);
  lines.push(`Generated Transposition Instances: ${report.transpositionVariantsCount}`);
  lines.push(`Unique Variant Keys: ${report.totalGeneratedVariantsCount}`);
  lines.push(`Unique Normalized Prompts: ${report.uniqueNormalizedPromptsCount}`);
  lines.push('');
  lines.push('--- Authored Templates by Category ---');
  for (const [cat, templates] of Object.entries(report.templatesByCategory)) {
    lines.push(`  ${cat} (${templates.length}): ${templates.join(', ')}`);
  }
  lines.push('');
  lines.push('--- Answer Input Type Distribution ---');
  for (const item of report.answerDistribution) {
    lines.push(`  ${item.inputType}: ${item.count} questions (${item.percentage}%)`);
  }
  lines.push('');
  lines.push('--- Missing Categories ---');
  if (report.missingCategories.length === 0) {
    lines.push('  None (all categories have authored templates)');
  } else {
    lines.push(`  Missing: ${report.missingCategories.join(', ')}`);
  }
  lines.push('');
  lines.push('--- Invalid Skill References ---');
  if (report.invalidSkillReferences.length === 0) {
    lines.push('  None (all questions & subtopics reference valid skill IDs)');
  } else {
    for (const item of report.invalidSkillReferences) {
      lines.push(`  Invalid skillId "${item.skillId}" in ${item.source}`);
    }
  }
  lines.push('');
  lines.push('--- Small Candidate Pools (< 10 candidates) ---');
  if (report.smallPools.length === 0) {
    lines.push('  None');
  } else {
    for (const pool of report.smallPools) {
      lines.push(`  ${pool.category} (Difficulty ${pool.difficulty}): Pool Size = ${pool.poolSize}`);
    }
  }
  lines.push('');
  lines.push('--- Duplicate Question IDs ---');
  if (report.duplicateIds.length === 0) {
    lines.push('  None detected');
  } else {
    lines.push(`  Duplicates: ${report.duplicateIds.join(', ')}`);
  }
  lines.push('====================================================');

  return lines.join('\n');
}
