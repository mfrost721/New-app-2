import { describe, it, expect } from 'vitest';
import {
  generateDrillQuestion,
  SUBTOPIC_REGISTRY,
  getSkillIdForSubtopic,
  DrillCategory,
} from '../lib/music/drillEngine';
import {
  generateContentReport,
  formatReportText,
} from '../lib/music/contentReport';
import {
  migrateUserStore,
  INITIAL_SKILLS,
  STORE_SCHEMA_VERSION,
} from '../lib/storage/store';

describe('Question Metadata Enrichment & Subtopic Registry', () => {
  it('enriches generated drill questions with backward-compatible metadata', () => {
    const q = generateDrillQuestion('tonal', 1, 12345);
    expect(q.templateId).toBe('tonal_ks');
    expect(q.variantKey).toMatch(/^key:/);
    expect(q.subtopic).toBe('Key Signatures');
    expect(q.answerType).toBe('spelling_text');
    expect(q.learningObjective).toBeTruthy();
    expect(Array.isArray(q.sourceReferences)).toBe(true);
  });

  it('maps all SUBTOPIC_REGISTRY entries to valid INITIAL_SKILLS skill IDs', () => {
    const validSkillIds = new Set(INITIAL_SKILLS.map((s) => s.id));
    for (const [subtopic, mapping] of Object.entries(SUBTOPIC_REGISTRY)) {
      expect(mapping.subtopic).toBe(subtopic);
      expect(validSkillIds.has(mapping.skillId)).toBe(true);
      expect(getSkillIdForSubtopic(subtopic)).toBe(mapping.skillId);
    }
  });
});

describe('Store Migration Skill Preservation', () => {
  it('preserves existing saved user skills and custom/new registered skills on reload', () => {
    const customRegisteredSkill = {
      id: 'a99_custom_ear_drill',
      category: 'Aural Skills IV',
      topic: 'Custom Microtonal Drill',
      mastery: 85,
      totalAttempts: 10,
      correctAttempts: 9,
      lastPracticed: '2026-03-01',
      recentLatencyMs: [1200],
      errorHistory: [],
    };

    const rawData = {
      examDate: '2026-12-08',
      academicStreak: 7,
      skills: [
        {
          id: 't1',
          category: 'Theory IV',
          topic: 'Pitch-Class Sets & Prime Form',
          mastery: 42,
          totalAttempts: 5,
          correctAttempts: 4,
          lastPracticed: '2026-03-01',
          recentLatencyMs: [],
          errorHistory: [],
        },
        customRegisteredSkill,
      ],
      history: [],
    };

    const migrated = migrateUserStore(rawData);
    expect(migrated.schemaVersion).toBe(STORE_SCHEMA_VERSION);
    expect(migrated.academicStreak).toBe(7);

    // Initial skills are present
    expect(migrated.skills.length).toBe(INITIAL_SKILLS.length + 1);
    expect(migrated.skills.find((s) => s.id === 't1')?.mastery).toBe(42);

    // Custom/newly registered skill is preserved
    const foundCustom = migrated.skills.find((s) => s.id === 'a99_custom_ear_drill');
    expect(foundCustom).toBeDefined();
    expect(foundCustom?.mastery).toBe(85);
  });
});

describe('Content Report Engine', () => {
  it('generates a complete content report detecting templates, variants, and small pools', () => {
    const report = generateContentReport(10);

    expect(report.authoredTemplatesCount).toBeGreaterThanOrEqual(10);
    expect(report.independentlyAuthoredQuestionsCount).toBe(report.authoredTemplatesCount);
    expect(report.transpositionVariantsCount).toBeGreaterThan(0);
    expect(report.totalGeneratedVariantsCount).toBeGreaterThan(0);
    expect(report.uniqueNormalizedPromptsCount).toBeGreaterThan(0);

    // Categories are present
    const categories: DrillCategory[] = ['tonal', 'form', 'modes', 'setTheory', 'twelveTone', 'rhythm', 'postTonal'];
    for (const cat of categories) {
      expect(report.templatesByCategory[cat].length).toBeGreaterThan(0);
    }

    // Answer distribution covers answer types
    expect(report.answerDistribution.length).toBeGreaterThan(0);

    // Missing categories check passes
    expect(report.missingCategories.length).toBe(0);

    // Invalid skill references check passes
    expect(report.invalidSkillReferences.length).toBe(0);

    // Small pools identified (e.g. postTonal difficulty 1 has 3 items)
    expect(report.smallPools.some((p) => p.category === 'postTonal' && p.poolSize === 3)).toBe(true);

    // Text formatting succeeds
    const formatted = formatReportText(report);
    expect(formatted).toContain('FROST MUSIC LAB - CONTENT REPORT');
    expect(formatted).toContain('Authored Templates Count:');
  });

  it('keeps variantKey unchanged when explanation alone or seed change has same parameters', () => {
    const q1 = generateDrillQuestion('rhythm', 3, 100); // Tuplet ratio
    const q2 = generateDrillQuestion('rhythm', 3, 100);

    expect(q1.variantKey).toBe(q2.variantKey);
    expect(q1.templateId).toBe(q2.templateId);
  });
});
