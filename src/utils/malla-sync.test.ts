// src/utils/malla-sync.test.ts
import { describe, expect, it } from 'vitest';
import { clearControlValues } from './malla-sync.ts';
import type {
  CurricularPiece,
  CurricularPieceRef,
  CurricularPieceSnapshot,
  BlockTemplate,
} from '../types/curricular.ts';
import type { VisualTemplate } from '../types/visual.ts';

const aspect = '1/1';
const singleCellTemplate: BlockTemplate = [[{ active: true }]];
const emptyVisual: VisualTemplate = {};

function buildSamplePieces(): CurricularPiece[] {
  const refPiece: CurricularPieceRef = {
    kind: 'ref',
    id: 'ref-1',
    ref: {
      sourceId: 'repo-1',
      bounds: { minRow: 2, maxRow: 4, minCol: 3, maxCol: 5, rows: 3, cols: 3 },
      aspect,
    },
    x: 0,
    y: 0,
  };

  const snapshotPiece: CurricularPieceSnapshot = {
    kind: 'snapshot',
    id: 'snap-1',
    template: singleCellTemplate,
    visual: emptyVisual,
    aspect,
    x: 1,
    y: 1,
    origin: {
      sourceId: 'repo-1',
      bounds: { minRow: 3, maxRow: 3, minCol: 4, maxCol: 4, rows: 1, cols: 1 },
      aspect,
    },
  };

  const otherRepoPiece: CurricularPieceRef = {
    kind: 'ref',
    id: 'ref-2',
    ref: {
      sourceId: 'repo-2',
      bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
      aspect,
    },
    x: 2,
    y: 2,
  };

  return [refPiece, snapshotPiece, otherRepoPiece];
}

describe('clearControlValues', () => {
  it('removes control values for pieces referencing the target repository', () => {
    const pieces = buildSamplePieces();
    const originalValues = {
      'ref-1': { 'r0c0': 'keep', 'r1c1': 'old-value' },
      'snap-1': { 'r0c0': true },
      'ref-2': { 'r0c0': 'other' },
    } satisfies Record<string, Record<string, string | number | boolean>>;

    const result = clearControlValues({
      repoId: 'repo-1',
      coordKey: '3-4',
      pieces,
      pieceValues: originalValues,
    });

    expect(result).not.toBe(originalValues);
    expect(result['ref-1']).toEqual({ 'r0c0': 'keep' });
    expect(result['snap-1']).toBeUndefined();
    expect(result['ref-2']).toBe(originalValues['ref-2']);
    expect(originalValues['ref-1']).toHaveProperty('r1c1', 'old-value');
  });

  it('is a no-op when repoId or coordKey are invalid', () => {
    const pieces = buildSamplePieces();
    const originalValues = {
      'ref-1': { 'r0c0': 'keep', 'r1c1': 'old-value' },
    } satisfies Record<string, Record<string, string | number | boolean>>;

    const withoutRepo = clearControlValues({
      repoId: null,
      coordKey: '3-4',
      pieces,
      pieceValues: originalValues,
    });
    expect(withoutRepo).toBe(originalValues);

    const withoutCoord = clearControlValues({
      repoId: 'repo-1',
      coordKey: 'invalid',
      pieces,
      pieceValues: originalValues,
    });
    expect(withoutCoord).toBe(originalValues);
  });

  it('clears stale values so reconfiguring a control starts from a clean state', () => {
    const pieces = buildSamplePieces();
    const originalValues = {
      'ref-1': { 'r0c0': 'keep', 'r1c1': 'old-value' },
    } satisfies Record<string, Record<string, string>>;

    const cleared = clearControlValues({
      repoId: 'repo-1',
      coordKey: '3-4',
      pieces,
      pieceValues: originalValues,
    });

    expect(cleared['ref-1']).toEqual({ 'r0c0': 'keep' });

    const reconfigured = {
      ...cleared,
      'ref-1': { ...(cleared['ref-1'] ?? {}), 'r1c1': 'new-value' },
    };

    expect(reconfigured['ref-1']).toEqual({ 'r0c0': 'keep', 'r1c1': 'new-value' });
  });
});