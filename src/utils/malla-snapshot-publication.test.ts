import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { MallaExport } from './malla-io.ts';
import { createDefaultMetaPanel, createDefaultProjectTheme } from './malla-io.ts';
import { createDefaultColumnHeaders } from './column-headers.ts';
import { buildMallaSnapshotFromState } from './malla-snapshot.ts';

test('snapshot metrics band does not export editor hint placeholders as publication text', () => {
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
    metaPanel: {
      ...createDefaultMetaPanel(true),
      rows: [
        {
          id: 'metric-row-1',
          defaultCell: { id: 'metric-cell-1', mode: 'count', terms: [] },
          columns: {},
        },
      ],
    },
    columnHeaders: createDefaultColumnHeaders(false),
  };

  const snapshot = buildMallaSnapshotFromState(malla, {
    projectName: 'Plan publicado',
    createdAt: '2026-04-03T12:00:00.000Z',
  });

  assert.equal(snapshot.bands?.metrics?.rows[0]?.cells[0]?.text, '');
  assert.equal(snapshot.bands?.metrics?.rows[0]?.cells[1]?.text, '');
});

test('snapshot headers band does not export editor hint placeholders as publication text', () => {
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
    columnHeaders: {
      ...createDefaultColumnHeaders(true),
      rows: [
        {
          id: 'header-row-1',
          defaultText: '',
          columns: {},
        },
      ],
    },
  };

  const snapshot = buildMallaSnapshotFromState(malla, {
    projectName: 'Plan publicado',
    createdAt: '2026-04-03T12:00:00.000Z',
  });

  assert.equal(snapshot.bands?.headers?.rows[0]?.cells[0]?.text, '');
  assert.equal(snapshot.bands?.headers?.rows[0]?.cells[1]?.text, '');
});
