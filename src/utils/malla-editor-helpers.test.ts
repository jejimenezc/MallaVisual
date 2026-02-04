import { describe, expect, test } from 'vitest';
import type {
  BlockTemplate,
  CurricularPieceRef,
  MasterBlockData,
} from '../types/curricular';
import type { BlockAspect, VisualTemplate } from '../types/visual';
import {
  createDefaultProjectTheme,
  MALLA_SCHEMA_VERSION,
  type MallaExport,
} from './malla-io';
import {
  boundsEqual,
  buildNormalizedInitialMalla,
  findFirstFreeCell,
  formatMasterDisplayName,
} from './malla-editor-helpers';

describe('formatMasterDisplayName', () => {
  test('prefers metadata name when available', () => {
    const name = formatMasterDisplayName(
      { name: 'Bloque A', projectId: 'p', uuid: 'u', updatedAt: 'now' },
      'fallback-id',
    );
    expect(name).toBe('Bloque A');
  });

  test('shortens fallback ids when name is missing', () => {
    const name = formatMasterDisplayName(
      { name: '', projectId: 'p', uuid: 'u', updatedAt: 'now' },
      'abcdefghijklmno',
    );
    expect(name).toBe('abcd...mno');
  });
});

describe('boundsEqual', () => {
  test('compares all bounds fields', () => {
    const a = { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1, rows: 2, cols: 2 };
    const b = { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1, rows: 2, cols: 2 };
    const c = { minRow: 0, maxRow: 2, minCol: 0, maxCol: 1, rows: 3, cols: 2 };
    expect(boundsEqual(a, b)).toBe(true);
    expect(boundsEqual(a, c)).toBe(false);
  });
});

describe('findFirstFreeCell', () => {
  test('returns the first empty cell in row-major order', () => {
    const piece: CurricularPieceRef = {
      kind: 'ref',
      id: 'piece-1',
      ref: {
        sourceId: 'master-1',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
        aspect: '1/1',
      },
      x: 0,
      y: 0,
    };

    expect(findFirstFreeCell(2, 1, [piece])).toEqual({ x: 1, y: 0 });
  });
});

describe('buildNormalizedInitialMalla', () => {
  test('hydrates repo master and active id when repoId is provided', () => {
    const template: BlockTemplate = [[{ active: true }]];
    const visual: VisualTemplate = {};
    const aspect: BlockAspect = '1/1';
    const repoId = 'repo-1';
    const masters: Record<string, MasterBlockData> = {};
    const initialMalla: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters,
      grid: { cols: 4, rows: 3 },
      pieces: [],
      values: {},
      floatingPieces: [],
      activeMasterId: 'legacy',
      repository: {},
      theme: createDefaultProjectTheme(),
    };

    const result = buildNormalizedInitialMalla({
      initialMalla,
      repoId,
      template,
      visual,
      aspect,
    });

    expect(result).not.toBeNull();
    expect(result?.activeMasterId).toBe(repoId);
    expect(result?.masters[repoId]).toEqual({ template, visual, aspect });
    expect(result?.project.version).toBe(MALLA_SCHEMA_VERSION);
  });
});
