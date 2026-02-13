import { describe, expect, test } from 'vitest';
import type {
  BlockTemplate,
  CurricularPiece,
  CurricularPieceRef,
  CurricularPieceSnapshot,
} from '../types/curricular.ts';
import type { MetaCellConfig, TermConfig } from '../types/meta-panel.ts';
import { computeMetaCellValueForColumn, computeTermForColumn, type MetaCalcDeps } from './meta-calc.ts';

const templateA: BlockTemplate = [[
  { active: true, type: 'number' },
  { active: true, type: 'checkbox' },
]];

const refPieceA1: CurricularPieceRef = {
  kind: 'ref',
  id: 'ref-a-1',
  ref: {
    sourceId: 'master-a',
    bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
    aspect: '1/1',
  },
  x: 0,
  y: 0,
};

const refPieceA2: CurricularPieceRef = {
  ...refPieceA1,
  id: 'ref-a-2',
  y: 1,
};

const snapshotWithOrigin: CurricularPieceSnapshot = {
  kind: 'snapshot',
  id: 'snap-with-origin',
  template: templateA,
  visual: {},
  aspect: '1/1',
  x: 1,
  y: 0,
  origin: {
    sourceId: 'master-a',
    bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
    aspect: '1/1',
  },
};

const snapshotWithoutOrigin: CurricularPieceSnapshot = {
  kind: 'snapshot',
  id: 'snap-no-origin',
  template: templateA,
  visual: {},
  aspect: '1/1',
  x: 0,
  y: 2,
};

const pieces: CurricularPiece[] = [
  refPieceA1,
  refPieceA2,
  snapshotWithOrigin,
  snapshotWithoutOrigin,
];

const malla = {
  grid: { cols: 2, rows: 3 },
  pieces,
};

const deps: MetaCalcDeps = {
  valuesByPiece: {
    [refPieceA1.id]: { r0c0: 10, r0c1: true },
    [refPieceA2.id]: { r0c0: 20, r0c1: false },
    [snapshotWithOrigin.id]: { r0c0: 30, r0c1: true },
    [snapshotWithoutOrigin.id]: { r0c0: 999, r0c1: true },
  },
  resolveTemplateForPiece: (piece) => (piece.kind === 'snapshot' ? piece.template : templateA),
};

const buildTerm = (op: TermConfig['op']): TermConfig => ({
  id: `term-${op}`,
  sign: 1,
  templateId: 'master-a',
  controlKey: 'r0c0',
  op,
});

describe('computeTermForColumn', () => {
  test('supports sum/avg/count/countIf for a column', () => {
    expect(computeTermForColumn(malla, 0, buildTerm('sum'), deps)).toBe(30);
    expect(computeTermForColumn(malla, 0, buildTerm('avg'), deps)).toBe(15);
    expect(computeTermForColumn(malla, 0, buildTerm('count'), deps)).toBe(2);
    expect(
      computeTermForColumn(
        malla,
        0,
        {
          ...buildTerm('countIf'),
          condition: { controlKey: 'r0c1', equals: true },
        },
        deps,
      ),
    ).toBe(1);
  });
});

describe('computeMetaCellValueForColumn', () => {
  test('applies signed terms', () => {
    const config: MetaCellConfig = {
      id: 'cell-0',
      terms: [
        buildTerm('sum'),
        { ...buildTerm('count'), id: 'term-subtract', sign: -1 },
      ],
    };
    expect(computeMetaCellValueForColumn(malla, 0, config, deps)).toBe(28);
  });
});
