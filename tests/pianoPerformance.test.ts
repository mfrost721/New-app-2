import { describe, it, expect } from 'vitest';
import { INITIAL_SKILLS } from '../lib/storage/store';
import { CURRICULUM_EXERCISES } from '../lib/music/pianoCurriculum';

describe('Piano page skills lookup performance', () => {
  it('measures array.find() vs Map.get() performance for skills lookup', () => {
    // Generate scaled up mock data to accurately measure algorithmic scale (O(N^2) vs O(N))
    const mockSkills = Array.from({ length: 5000 }, (_, i) => ({
      ...INITIAL_SKILLS[0],
      id: `skill_${i}`,
    }));

    const mockExercises = Array.from({ length: 5000 }, (_, i) => ({
      ...CURRICULUM_EXERCISES[0],
      id: `skill_${i}`,
    }));

    // Array.find iteration (Baseline O(N^2))
    const startFind = performance.now();
    let findMatches = 0;
    for (let iter = 0; iter < 10; iter++) {
      mockExercises.forEach(ex => {
        const skill = mockSkills.find(s => s.id === ex.id);
        if (skill) findMatches++;
      });
    }
    const endFind = performance.now();
    const durationFindMs = endFind - startFind;

    // Map.get iteration (Optimized O(N))
    const startMap = performance.now();
    let mapMatches = 0;
    for (let iter = 0; iter < 10; iter++) {
      const skillsById = new Map(mockSkills.map(s => [s.id, s]));
      mockExercises.forEach(ex => {
        const skill = skillsById.get(ex.id);
        if (skill) mapMatches++;
      });
    }
    const endMap = performance.now();
    const durationMapMs = endMap - startMap;

    expect(findMatches).toBe(mapMatches);
    console.log(`\n--- BENCHMARK RESULTS ---`);
    console.log(`Array .find() (O(N^2)): ${durationFindMs.toFixed(2)}ms`);
    console.log(`Map .get() (O(N)):     ${durationMapMs.toFixed(2)}ms`);
    console.log(`Speedup Factor: ${(durationFindMs / durationMapMs).toFixed(2)}x`);
  });
});
