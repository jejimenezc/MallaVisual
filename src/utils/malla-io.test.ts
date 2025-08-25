// src/utils/malla-io.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { exportMalla, importMalla } from './malla-io.ts';
import type { BlockTemplate, CurricularPieceRef } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';

test('exportMalla followed by importMalla yields same data including booleans', () => {
  const template: BlockTemplate = [[{ active: true }]];
  const visual: VisualTemplate = {};
  const aspect: BlockAspect = '1/1';
  const piece: CurricularPieceRef = {
    kind: 'ref',
    id: 'p1',
    ref: {
      sourceId: 'master',
      bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
      aspect,
    },
    x: 0,
    y: 0,
  };

  const json = exportMalla({
    master: { template, visual, aspect },
    grid: { cols: 1, rows: 1 },
    pieces: [piece],
    values: { p1: { done: true } },
    floatingPieces: ['p1'],
  });

  const result = importMalla(json);

  assert.deepEqual(result.master.template, template);
  assert.deepEqual(result.grid, { cols: 1, rows: 1 });
  assert.deepEqual(result.pieces, [piece]);
  assert.deepEqual(result.values, { p1: { done: true } });
  assert.deepEqual(result.floatingPieces, ['p1']);
});