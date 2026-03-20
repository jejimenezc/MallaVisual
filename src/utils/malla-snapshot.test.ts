import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { BlockTemplate, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { MallaExport } from './malla-io.ts';
import { createDefaultMetaPanel, createDefaultProjectTheme } from './malla-io.ts';
import { createDefaultColumnHeaders } from './column-headers.ts';
import { buildBlockId } from '../types/block.ts';
import { BLOCK_SCHEMA_VERSION } from './block-io.ts';
import { createDefaultViewerTheme } from './viewer-theme.ts';
import {
  buildMallaSnapshotFromState,
  validateAndNormalizeMallaSnapshot,
} from './malla-snapshot.ts';
import { MALLA_SNAPSHOT_FORMAT_VERSION } from '../types/malla-snapshot.ts';

test('buildMallaSnapshotFromState creates v1 snapshot and excludes editor repository state', () => {
  const template: BlockTemplate = [[
    { active: true, type: 'staticText', label: 'Introducción' },
    { active: true, type: 'text', placeholder: 'Escribe...' },
  ]];
  const visual: VisualTemplate = {
    '0-0': { backgroundColor: '#f0f9ff', textColor: '#0f172a', border: true },
    '0-1': { backgroundColor: '#ffffff', textColor: '#111827', border: false },
  };
  const aspect: BlockAspect = '1/1';
  const masters: Record<string, MasterBlockData> = {
    masterA: { template, visual, aspect },
  };

  const malla: MallaExport = {
    version: 6,
    masters,
    repository: {
      masterA: {
        id: buildBlockId('project', 'masterA'),
        metadata: {
          projectId: 'project',
          uuid: 'masterA',
          name: 'Master A',
          updatedAt: '2026-03-05T00:00:00.000Z',
        },
        data: {
          version: BLOCK_SCHEMA_VERSION,
          template,
          visual,
          aspect,
          theme: createDefaultProjectTheme(),
        },
      },
    },
    grid: { cols: 6, rows: 4 },
    pieces: [
      {
        kind: 'ref',
        id: 'piece-1',
        ref: {
          sourceId: 'masterA',
          bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1, rows: 1, cols: 2 },
          aspect,
        },
        x: 2,
        y: 1,
      },
    ],
    values: {
      'piece-1': { r0c1: 'Texto visible' },
    },
    floatingPieces: [],
    activeMasterId: 'masterA',
    theme: createDefaultProjectTheme(),
    metaPanel: createDefaultMetaPanel(false),
    columnHeaders: createDefaultColumnHeaders(false),
  };

  const snapshot = buildMallaSnapshotFromState(malla, {
    projectName: 'Plan 2026',
    createdAt: '2026-03-05T12:00:00.000Z',
  });

  assert.equal(snapshot.formatVersion, MALLA_SNAPSHOT_FORMAT_VERSION);
  assert.equal(snapshot.projectName, 'Plan 2026');
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0]?.cells[0]?.text, 'Introducción');
  assert.equal(snapshot.items[0]?.cells[1]?.text, 'Texto visible');
  assert.equal(snapshot.bands, undefined);
  assert.ok(!('repository' in snapshot));
  assert.ok(!('masters' in snapshot));
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes('"repository"'), false);
  assert.equal(serialized.includes('"draft"'), false);
  assert.equal(serialized.includes('"undo"'), false);
});

test('buildMallaSnapshotFromState includes only visible header rows and enabled metrics rows', () => {
  const template: BlockTemplate = [[{ active: true, type: 'staticText', label: 'A' }]];
  const visual: VisualTemplate = {
    '0-0': { backgroundColor: '#ffffff', textColor: '#111827', border: true },
  };
  const aspect: BlockAspect = '1/1';
  const masters: Record<string, MasterBlockData> = {
    masterA: { template, visual, aspect },
  };

  const malla: MallaExport = {
    version: 6,
    masters,
    repository: {},
    grid: { cols: 3, rows: 2 },
    pieces: [],
    values: {},
    floatingPieces: [],
    activeMasterId: 'masterA',
    theme: createDefaultProjectTheme(),
    metaPanel: {
      enabled: true,
      rows: [
        {
          id: 'metric-row-1',
          label: 'Creditos',
          defaultCell: { id: 'metric-cell-1', mode: 'count', terms: [] },
          columns: {},
        },
      ],
    },
    columnHeaders: {
      enabled: true,
      rows: [
        { id: 'hdr-visible', defaultText: 'Semestre', columns: {} },
        { id: 'hdr-hidden', defaultText: 'Oculto', hidden: true, columns: {} },
      ],
    },
  };

  const snapshot = buildMallaSnapshotFromState(malla, {
    projectName: 'Plan bandas',
    createdAt: '2026-03-06T10:00:00.000Z',
  });

  assert.equal(snapshot.bands?.headers?.rows.length, 1);
  assert.equal(snapshot.bands?.headers?.rows[0]?.id, 'hdr-visible');
  assert.equal(snapshot.bands?.metrics?.rows.length, 1);
  assert.equal(snapshot.bands?.metrics?.rows[0]?.id, 'metric-row-1');
  assert.equal(snapshot.bands?.metrics?.rows[0]?.cells.length, 3);
});

test('validateAndNormalizeMallaSnapshot handles ok and unsupported version', () => {
  const okResult = validateAndNormalizeMallaSnapshot({
    formatVersion: 1,
    createdAt: '2026-03-05T12:00:00.000Z',
    projectName: 'Plan 2026',
    grid: { rows: 3, cols: 4 },
    items: [],
    bands: {
      headers: {
        rows: [
          {
            id: 'hdr-1',
            cells: [
              {
                col: 0,
                text: 'Sem 1',
                style: {
                  backgroundColor: '#fff',
                  textColor: '#111827',
                  textAlign: 'center',
                  border: 'thin',
                  fontSizePx: 12,
                  paddingX: 4,
                  paddingY: 2,
                  bold: true,
                  italic: false,
                },
              },
            ],
          },
        ],
      },
    },
  });
  assert.equal(okResult.ok, true);
  if (okResult.ok) {
    assert.equal(okResult.normalizedSnapshot.formatVersion, 1);
    assert.equal(okResult.normalizedSnapshot.grid.rows, 3);
    assert.equal(okResult.normalizedSnapshot.items.length, 0);
    assert.equal(okResult.normalizedSnapshot.bands?.headers?.rows.length, 1);
  }

  const invalidVersion = validateAndNormalizeMallaSnapshot({
    formatVersion: 99,
    createdAt: '2026-03-05T12:00:00.000Z',
    projectName: 'Plan 2026',
    grid: { rows: 3, cols: 4 },
    items: [],
  });
  assert.equal(invalidVersion.ok, false);
  if (!invalidVersion.ok) {
    assert.equal(invalidVersion.error.includes('no soportada'), true);
  }

  const invalidBands = validateAndNormalizeMallaSnapshot({
    formatVersion: 1,
    createdAt: '2026-03-05T12:00:00.000Z',
    projectName: 'Plan 2026',
    grid: { rows: 3, cols: 4 },
    items: [],
    bands: {
      headers: {
        rows: [
          {
            id: 'hdr-invalid',
            cells: [{ col: -1, text: 'bad', style: {} }],
          },
        ],
      },
    },
  });
  assert.equal(invalidBands.ok, false);
});

test('snapshot publication appearance is normalized and preserved', () => {
  const malla: MallaExport = {
    version: 6,
    masters: {},
    repository: {},
    grid: { cols: 2, rows: 2 },
    pieces: [],
    values: {},
    floatingPieces: [],
    activeMasterId: '',
    theme: createDefaultProjectTheme(),
    metaPanel: createDefaultMetaPanel(false),
    columnHeaders: createDefaultColumnHeaders(false),
  };

  const snapshot = buildMallaSnapshotFromState(malla, {
    projectName: 'Plan publicacion',
    appearance: {
      ...createDefaultViewerTheme(),
      gapX: 999,
      showTitle: true,
      titleText: 'Titulo web',
      titleFontSize: 99,
      showHeaderFooter: true,
    },
  });

  assert.equal(snapshot.appearance?.gapX, 96);
  assert.equal(snapshot.appearance?.showTitle, true);
  assert.equal(snapshot.appearance?.titleText, 'Titulo web');
  assert.equal(snapshot.appearance?.titleFontSize, 40);
  assert.equal(snapshot.appearance?.showHeaderFooter, true);

  const normalized = validateAndNormalizeMallaSnapshot(snapshot);
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.normalizedSnapshot.appearance?.gapX, 96);
    assert.equal(normalized.normalizedSnapshot.appearance?.showTitle, true);
    assert.equal(normalized.normalizedSnapshot.appearance?.titleText, 'Titulo web');
    assert.equal(normalized.normalizedSnapshot.appearance?.titleFontSize, 40);
    assert.equal(normalized.normalizedSnapshot.appearance?.showHeaderFooter, true);
  }
});
