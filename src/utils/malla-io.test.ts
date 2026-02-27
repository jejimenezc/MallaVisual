// src/utils/malla-io.test.ts
import { afterEach, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  createDefaultMetaPanel,
  exportMalla,
  getActiveMetaPanelRow,
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
        theme: createDefaultProjectTheme(),
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
    metaPanel: {
      rows: [
        {
          id: 'row-main',
          defaultCell: { id: 'row-main-default', mode: 'count', terms: [] },
          columns: {
            0: { id: 'row-main-col-0', mode: 'count', terms: [] },
          },
        },
      ],
    },
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
  assert.deepEqual(result.metaPanel, {
    enabled: true,
    rows: [
      {
        id: 'row-main',
        defaultCell: { id: 'row-main-default', mode: 'count', terms: [] },
        columns: {
          0: { id: 'row-main-col-0', mode: 'count', terms: [] },
        },
      },
    ],
  });
  assert.deepEqual(result.columnHeaders, {
    enabled: false,
    rows: [],
  });
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
      theme: createDefaultProjectTheme(),
    },
    'repo-orphan': {
      version: BLOCK_SCHEMA_VERSION,
      template,
      visual,
      aspect,
      theme: createDefaultProjectTheme(),
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
  assert.deepEqual(result.metaPanel, createDefaultMetaPanel());
  assert.deepEqual(result.columnHeaders, { enabled: false, rows: [] });
});

test('importMalla adds default metaPanel when absent', () => {
  const payload = {
    version: 4,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
  };

  const result = importMalla(JSON.stringify(payload));
  assert.equal(result.metaPanel?.enabled, true);
  assert.equal(result.metaPanel?.rows.length, 1);
  const activeRow = getActiveMetaPanelRow(result.metaPanel);
  assert.equal(activeRow.id, 'meta-row-main');
  assert.deepEqual(activeRow.defaultCell.terms, []);
  assert.deepEqual(activeRow.columns, {});
  assert.deepEqual(result.columnHeaders, { enabled: false, rows: [] });
});

test('importMalla migrates legacy row config (columns-only) into defaultCell and preserves overrides', () => {
  const payload = {
    version: 6,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
    metaPanel: {
      rows: [
        {
          id: 'row-1',
          columns: {
            0: { id: 'row-1-col-0', mode: 'count', terms: [{ id: 't-1', sign: 1, op: 'count', templateId: 'm1', controlKey: '' }] },
            2: { id: 'row-1-col-2', mode: 'count', terms: [{ id: 't-2', sign: 1, op: 'count', templateId: 'm2', controlKey: '' }] },
          },
        },
        {
          id: 'row-2',
          label: 'Secundaria',
          defaultCell: { id: 'row-2-default', mode: 'count', terms: [] },
          columns: {
            1: { id: 'row-2-col-1', mode: 'count', terms: [] },
          },
        },
      ],
    },
  };

  const result = importMalla(JSON.stringify(payload));
  assert.equal(result.metaPanel?.rows.length, 2);
  assert.equal(result.metaPanel?.rows[0]?.id, 'row-1');
  assert.equal(result.metaPanel?.rows[0]?.defaultCell.id, 'row-1-col-0');
  assert.equal(result.metaPanel?.rows[0]?.defaultCell.terms[0]?.id, 't-1');
  assert.equal(result.metaPanel?.rows[0]?.columns?.[2]?.id, 'row-1-col-2');
  assert.equal(result.metaPanel?.rows[1]?.id, 'row-2');
  assert.equal(result.metaPanel?.rows[1]?.label, 'Secundaria');
  assert.deepEqual(result.metaPanel?.rows[1]?.columns?.[1], {
    id: 'row-2-col-1',
    mode: 'count',
    terms: [],
  });
});

test('export/import roundtrip preserves defaultCell and columns overrides', () => {
  const payload = {
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
    metaPanel: {
      rows: [
        {
          id: 'row-main',
          defaultCell: {
            id: 'row-main-default',
            terms: [{ id: 'tt', sign: 1, op: 'count', templateId: 'master-a', controlKey: '' }],
          },
          columns: {
            1: {
              id: 'row-main-col-1',
              terms: [{ id: 'ov', sign: -1, op: 'count', templateId: 'master-b', controlKey: '' }],
            },
          },
        },
      ],
    },
    columnHeaders: {
      enabled: true,
      rows: [
        {
          id: 'hdr-main',
          defaultText: 'General',
          columns: {
            1: { id: 'hdr-main-col-1', text: 'Semestre 2' },
          },
        },
      ],
    },
  } as const;

  const json = exportMalla(payload as unknown as Parameters<typeof exportMalla>[0]);
  const result = importMalla(json);

  const row = result.metaPanel?.rows[0];
  assert(row);
  assert.equal(row.defaultCell.id, 'row-main-default');
  assert.equal(row.defaultCell.terms[0]?.id, 'tt');
  assert.equal(row.columns?.[1]?.id, 'row-main-col-1');
  assert.equal(row.columns?.[1]?.terms[0]?.id, 'ov');
  assert.equal(result.columnHeaders?.enabled, true);
  assert.equal(result.columnHeaders?.rows[0]?.id, 'hdr-main');
  assert.equal(result.columnHeaders?.rows[0]?.columns?.[1]?.text, 'Semestre 2');
});

test('importMalla defaults enabled=true when metaPanel exists without enabled', () => {
  const payload = {
    version: 6,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
    metaPanel: {
      rows: [
        {
          id: 'row-main',
          defaultCell: { id: 'row-main-default', mode: 'count', terms: [] },
        },
      ],
    },
  };

  const result = importMalla(JSON.stringify(payload));
  assert.equal(result.metaPanel?.enabled, true);
});

test('export/import roundtrip preserves metaPanel enabled=false', () => {
  const payload = {
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
    metaPanel: {
      enabled: false,
      rows: [
        {
          id: 'row-main',
          defaultCell: { id: 'row-main-default', mode: 'count', terms: [] },
        },
      ],
    },
  } as const;

  const json = exportMalla(payload as unknown as Parameters<typeof exportMalla>[0]);
  const result = importMalla(json);
  assert.equal(result.metaPanel?.enabled, false);
});

test('importMalla ensures one header row when columnHeaders.enabled=true and rows is empty', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValue('generated-header-row-id'),
  });

  const payload = {
    version: 6,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    theme: createDefaultProjectTheme(),
    columnHeaders: {
      enabled: true,
      rows: [],
    },
  };

  const result = importMalla(JSON.stringify(payload));
  assert.equal(result.columnHeaders?.enabled, true);
  assert.equal(result.columnHeaders?.rows.length, 1);
  assert.equal(result.columnHeaders?.rows[0]?.id, 'generated-header-row-id');
});
