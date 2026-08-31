/**
 * Twelve-Tone Matrix & Serialism Engine
 * Generates 12-tone row transformations (P, I, R, RI) and full 12x12 matrices.
 */

export type RowForm = 'P' | 'I' | 'R' | 'RI';

export interface RowTransformation {
  form: RowForm;
  index: number;
  row: number[];
}

/**
 * Validates whether an array of 12 integers is a valid twelve-tone row (permutation of 0..11).
 */
export function isValidTwelveToneRow(row: number[]): boolean {
  if (row.length !== 12) return false;
  const unique = new Set(row.map(n => ((n % 12) + 12) % 12));
  return unique.size === 12;
}

/**
 * Generates a full 12x12 Twelve-Tone Matrix given a Prime Row (P0).
 * Matrix layout:
 * - Rows left to right: Prime forms P0..P11
 * - Columns top to bottom: Inversion forms I0..I11
 * - Rows right to left: Retrograde forms R0..R11
 * - Columns bottom to top: Retrograde Inversion forms RI0..RI11
 */
export function generateTwelveToneMatrix(p0Row: number[]): number[][] {
  const normalizedP0 = p0Row.map(n => ((n % 12) + 12) % 12);
  const matrix: number[][] = Array.from({ length: 12 }, () => Array(12).fill(0));

  const p0First = normalizedP0[0];

  for (let row = 0; row < 12; row++) {
    // Inversion difference for column 0 note relative to P0[0]
    // The top-to-bottom column is Inversion of P0
    const invNote = ((2 * p0First - normalizedP0[row]) % 12 + 12) % 12;
    const diff = (invNote - p0First + 12) % 12;

    for (let col = 0; col < 12; col++) {
      matrix[row][col] = (normalizedP0[col] + diff) % 12;
    }
  }

  return matrix;
}

/**
 * Returns a specific transformation (P, I, R, RI) at index n from a prime row p0.
 */
export function getRowTransformation(p0Row: number[], form: RowForm, index: number): number[] {
  const normP0 = p0Row.map(n => ((n % 12) + 12) % 12);
  const p0First = normP0[0];
  const targetIndex = ((index % 12) + 12) % 12;

  switch (form) {
    case 'P': {
      // P_n is P_0 transposed such that its first note is (p0First + n) mod 12
      return normP0.map(n => (n + targetIndex) % 12);
    }
    case 'R': {
      const pRow = getRowTransformation(normP0, 'P', targetIndex);
      return [...pRow].reverse();
    }
    case 'I': {
      // I_n is inverted relative to P_0 such that its first note is (p0First + n) mod 12
      // Formula: I_n[i] = (p0First + targetIndex + p0First - normP0[i]) mod 12 = (2 * p0First + targetIndex - normP0[i]) mod 12
      return normP0.map(n => ((2 * p0First + targetIndex - n) % 12 + 12) % 12);
    }
    case 'RI': {
      const iRow = getRowTransformation(normP0, 'I', targetIndex);
      return [...iRow].reverse();
    }
  }
}

/**
 * Identifies which transformation (form and index) converted P0 into a given target row segment/row.
 */
export function identifyRowTransformation(p0Row: number[], targetRow: number[]): RowTransformation | null {
  const normP0 = p0Row.map(n => ((n % 12) + 12) % 12);
  const normTarget = targetRow.map(n => ((n % 12) + 12) % 12);

  const forms: RowForm[] = ['P', 'I', 'R', 'RI'];
  for (const form of forms) {
    for (let idx = 0; idx < 12; idx++) {
      const candidate = getRowTransformation(normP0, form, idx);
      if (normTarget.length <= candidate.length) {
        const matches = normTarget.every((val, i) => val === candidate[i]);
        if (matches) {
          return { form, index: idx, row: candidate };
        }
      }
    }
  }

  return null;
}
