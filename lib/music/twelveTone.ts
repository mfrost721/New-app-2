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
  const matrix = generateTwelveToneMatrix(normP0);
  const p0First = normP0[0];

  switch (form) {
    case 'P': {
      // Find row in matrix starting with note (p0First + index) % 12
      const targetFirstNote = (p0First + index) % 12;
      const rowIdx = matrix.findIndex(r => r[0] === targetFirstNote);
      if (rowIdx !== -1) return matrix[rowIdx];
      return normP0.map(n => (n + index) % 12);
    }
    case 'R': {
      const pRow = getRowTransformation(normP0, 'P', index);
      return [...pRow].reverse();
    }
    case 'I': {
      // Find row in matrix whose top element (col index) corresponds to target Inversion
      // I_n starts at (p0First + index) % 12 at col header
      const targetFirstNote = (index) % 12;
      // Inversion col is column in matrix: matrix[0][col]
      // P_0[0] is matrix[0][0]. Inversion starting at index:
      // Note I_n first note = index
      const colIdx = matrix[0].findIndex((_, c) => matrix[0][c] === targetFirstNote);
      if (colIdx !== -1) {
        return matrix.map(row => row[colIdx]);
      }
      return normP0.map(n => ((index * 2 - n) % 12 + 12) % 12);
    }
    case 'RI': {
      const iRow = getRowTransformation(normP0, 'I', index);
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
