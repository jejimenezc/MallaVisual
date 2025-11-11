// src/utils/malla-io.test.ts
import { afterEach, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  exportMalla,
  importMalla,
  MALLA_SCHEMA_VERSION,
  createDefaultProjectTheme,
} from './malla-io.ts';
import { buildBlockId } from '../types/block.ts';
import type { BlockTemplate, CurricularPieceRef, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import { BLOCK_SCHEMA_VERSION } from './block-io.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test('exportMalla followed by importMalla preserves repository metadata', () => {
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

  const metadata = {
    projectId: 'project',
    uuid: 'repo-uuid',
    name: 'Repo',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const repository = {
    [metadata.uuid]: {
      id: buildBlockId(metadata.projectId, metadata.uuid),
      metadata,
      data: {
        version: BLOCK_SCHEMA_VERSION,
        template,
        visual,
        aspect,
        metadata,
      },
    },
  };

  const json = exportMalla({
    masters,
    repository,
    grid: { cols: 1, rows: 1 },
    pieces: [piece],
    values: { p1: { done: true } },
    floatingPieces: ['p1'],
    activeMasterId: 'm1',
    theme: createDefaultProjectTheme(),
  });

  const result = importMalla(json);

  assert.equal(result.version, MALLA_SCHEMA_VERSION);
  assert.deepEqual(result.masters, masters);
  assert.deepEqual(result.repositoryMetadata, { [metadata.uuid]: metadata });
  assert.deepEqual(result.grid, { cols: 1, rows: 1 });
  assert.deepEqual(result.pieces, [piece]);
  assert.deepEqual(result.values, { p1: { done: true } });
  assert.deepEqual(result.floatingPieces, ['p1']);
  assert.equal(result.activeMasterId, 'm1');
  assert.deepEqual(result.theme, createDefaultProjectTheme());
});

test('importMalla migrates legacy schema and remaps references with duplicated names', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn()
      .mockReturnValueOnce('generated-uuid-1')
      .mockReturnValueOnce('generated-uuid-2'),
  });

  const template: BlockTemplate = [[{ active: true }]];
  const visual: VisualTemplate = {};
  const aspect: BlockAspect = '1/1';

  const masters: Record<string, MasterBlockData> = {
    'm-master': { template, visual, aspect },
    'm-extra': { template, visual, aspect },
  };

  const repository = {
    'repo-master': {
      version: BLOCK_SCHEMA_VERSION,
      template,
      visual,
      aspect,
    },
    'repo-orphan': {
      version: BLOCK_SCHEMA_VERSION,
      template,
      visual,
      aspect,
    },
  };

  const repositoryMetadata = {
    'repo-master': {
      projectId: 'legacy',
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Duplicado',
      updatedAt: '2020-01-01T00:00:00.000Z',
    },
    'repo-orphan': {
      projectId: '',
      uuid: '',
      name: 'Duplicado',
      updatedAt: undefined,
    },
  };

  const pieces: CurricularPieceRef[] = [
    {
      kind: 'ref',
      id: 'ref-1',
      ref: {
        sourceId: 'm-master',
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
        aspect,
      },
      x: 0,
      y: 0,
    },
  ];

  const legacyPayload = {
    version: 3,
    masters,
    repository,
    repositoryMetadata,
    grid: { cols: 1, rows: 1 },
    pieces,
    values: {},
    floatingPieces: ['m-master', 'repo-orphan'],
    activeMasterId: 'm-extra',
  };

  const result = importMalla(JSON.stringify(legacyPayload));

  assert.equal(result.version, MALLA_SCHEMA_VERSION);
  const repoEntries = Object.values(result.repository);
  assert.equal(repoEntries.length, 2);

  const masterEntry = repoEntries.find(
    (entry) => entry.metadata.uuid === '123e4567-e89b-12d3-a456-426614174000',
  );
  assert(masterEntry, 'expected to preserve existing uuid');
  const otherEntries = repoEntries.filter(
    (entry) => entry.metadata.uuid !== masterEntry.metadata.uuid,
  );
  assert.equal(otherEntries.length, 1, 'expected a generated repository entry');
  const generatedEntry = otherEntries[0]!;

  assert.equal(masterEntry.metadata.name, 'Duplicado');
  assert.equal(masterEntry.metadata.projectId, 'legacy');
  assert.equal(generatedEntry.metadata.projectId, 'legacy');
  assert.equal(generatedEntry.metadata.name, 'Duplicado');
  assert.equal(masterEntry.data.metadata?.uuid, masterEntry.metadata.uuid);
  assert.equal(generatedEntry.data.metadata?.uuid, generatedEntry.metadata.uuid);

  assert.deepEqual(result.masters[masterEntry.metadata.uuid], masters['m-master']);
  assert.deepEqual(result.masters[generatedEntry.metadata.uuid], masters['m-extra']);

  const expectedFloating = [
    masterEntry.metadata.uuid,
    generatedEntry.metadata.uuid,
  ].sort();
  const actualFloating = [...(result.floatingPieces ?? [])].sort();
  assert.deepEqual(actualFloating, expectedFloating);
  const remappedPiece = result.pieces[0];
  assert(remappedPiece?.kind === 'ref');
  assert.equal(remappedPiece.ref.sourceId, masterEntry.metadata.uuid);
  assert.equal(result.activeMasterId, generatedEntry.metadata.uuid);
  assert.deepEqual(result.theme, createDefaultProjectTheme());
});