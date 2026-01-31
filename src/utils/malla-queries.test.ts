import { describe, expect, test } from 'vitest';
import type { CurricularPieceRef, CurricularPieceSnapshot } from '../types/curricular';
import { createDefaultProjectTheme, MALLA_SCHEMA_VERSION, type MallaExport } from './malla-io';
import {
  getCellAt,
  getColumnCells,
  getRowCells,
  isPieceRef,
  isPieceSnapshot,
  normalizeCellContent,
} from './malla-queries';

const buildSampleMalla = (): MallaExport => {
  const snapshot: CurricularPieceSnapshot = {
    kind: 'snapshot',
    id: 'snapshot-1',
    template: [[{ active: true }]],
    visual: {},
    aspect: '1/1',
    x: 0,
    y: 0,
  };

  const refPiece: CurricularPieceRef = {
    kind: 'ref',
    id: 'ref-1',
    ref: {
      sourceId: 'master-1',
      bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
      aspect: '1/1',
    },
    x: 1,
    y: 0,
  };

  return {
    version: MALLA_SCHEMA_VERSION,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [snapshot, refPiece],
    values: {},
    theme: createDefaultProjectTheme(),
  };
};

describe('getCellAt', () => {
  test('returns snapshot, ref, or null for empty cells', () => {
    const malla = buildSampleMalla();

    const snapshot = getCellAt(malla, { rowIndex: 0, colIndex: 0 });
    const refPiece = getCellAt(malla, { rowIndex: 0, colIndex: 1 });
    const empty = getCellAt(malla, { rowIndex: 1, colIndex: 1 });

    expect(snapshot?.kind).toBe('snapshot');
    expect(refPiece?.kind).toBe('ref');
    expect(empty).toBeNull();
  });

  test('returns null for out-of-range coordinates', () => {
    const malla = buildSampleMalla();

    expect(getCellAt(malla, { rowIndex: -1, colIndex: 0 })).toBeNull();
    expect(getCellAt(malla, { rowIndex: 0, colIndex: 3 })).toBeNull();
  });
});

describe('column and row queries', () => {
  test('enumerates only present cells in a column', () => {
    const malla = buildSampleMalla();

    const column = getColumnCells(malla, 0);

    expect(column).toHaveLength(1);
    expect(column[0]?.coord).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(column[0]?.content.kind).toBe('snapshot');
  });

  test('enumerates only present cells in a row', () => {
    const malla = buildSampleMalla();

    const row = getRowCells(malla, 0);

    expect(row).toHaveLength(2);
    expect(row[0]?.coord).toEqual({ rowIndex: 0, colIndex: 0 });
    expect(row[1]?.coord).toEqual({ rowIndex: 0, colIndex: 1 });
  });

  test('returns empty arrays for out-of-range indices', () => {
    const malla = buildSampleMalla();

    expect(getColumnCells(malla, 4)).toEqual([]);
    expect(getRowCells(malla, -2)).toEqual([]);
  });
});

describe('normalization helpers', () => {
  test('discriminates ref vs snapshot', () => {
    const malla = buildSampleMalla();
    const snapshot = getCellAt(malla, { rowIndex: 0, colIndex: 0 });
    const refPiece = getCellAt(malla, { rowIndex: 0, colIndex: 1 });

    if (!snapshot || !refPiece) {
      throw new Error('Fixture missing expected pieces');
    }

    expect(isPieceSnapshot(snapshot)).toBe(true);
    expect(isPieceRef(refPiece)).toBe(true);
  });

  test('normalizes empty vs content', () => {
    const malla = buildSampleMalla();
    const empty = getCellAt(malla, { rowIndex: 1, colIndex: 1 });
    const snapshot = getCellAt(malla, { rowIndex: 0, colIndex: 0 });

    expect(normalizeCellContent(empty).kind).toBe('empty');
    expect(normalizeCellContent(snapshot).kind).toBe('snapshot');
  });
});
