// src/utils/malla-io.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { exportMalla, importMalla, MALLA_SCHEMA_VERSION } from './malla-io.ts';
import type { BlockMetadata } from '../types/block.ts';
import type { BlockTemplate, CurricularPieceRef, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import { BLOCK_SCHEMA_VERSION } from './block-io.ts';

test('exportMalla followed by importMalla yields same data including booleans', () => {
  const template: BlockTemplate = [[{ active: true }]];
  const visual: VisualTemplate = {};
  const aspect: BlockAspect = '1/1';
  const piece: CurricularPieceRef = {
    kind: 'ref',
    id: 'p1',
    ref: {
      sourceId: 'm1',
      bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
      aspect,
    },
    x: 0,
    y: 0,
  };

  const masters: Record<string, MasterBlockData> = {
    m1: { template, visual, aspect },
  };

  const repository = {
    repo: {
      version: BLOCK_SCHEMA_VERSION,
      template,
      visual,
      aspect,
    },
  };

  const metadata: Record<string, BlockMetadata> = {
    repo: {
      projectId: 'project',
      uuid: 'repo',
      name: 'Repo',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
  };

  const json = exportMalla({
    masters,
    repository,
    repositoryMetadata: metadata,
    grid: { cols: 1, rows: 1 },
    pieces: [piece],
    values: { p1: { done: true } },
    floatingPieces: ['p1'],
    activeMasterId: 'm1',
  });

  const result = importMalla(json);

  assert.deepEqual(result.masters, masters);
  assert.deepEqual(result.repository, repository);
  assert.deepEqual(result.repositoryMetadata, metadata);
  assert.deepEqual(result.grid, { cols: 1, rows: 1 });
  assert.deepEqual(result.pieces, [piece]);
  assert.deepEqual(result.values, { p1: { done: true } });
  assert.deepEqual(result.floatingPieces, ['p1']);
  assert.equal(result.activeMasterId, 'm1');
});

test('importMalla accepts schema v2 without repository data', () => {
  const template: BlockTemplate = [[{ active: true }]];
  const visual: VisualTemplate = {};
  const aspect: BlockAspect = '1/1';
  const masters: Record<string, MasterBlockData> = {
    m1: { template, visual, aspect },
  };

  const legacyPayload = {
    version: 2,
    masters,
    grid: { cols: 1, rows: 1 },
    pieces: [],
    values: {},
    floatingPieces: [],
    activeMasterId: 'm1',
  };

  const result = importMalla(JSON.stringify(legacyPayload));

  assert.equal(result.version, MALLA_SCHEMA_VERSION);
  assert.deepEqual(result.repository, {});
  assert.deepEqual(result.masters, masters);
});