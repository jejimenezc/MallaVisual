import { describe, expect, test } from 'vitest';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './block-io';
import {
  createDefaultProjectTheme,
  MALLA_SCHEMA_VERSION,
  type MallaExport,
} from './malla-io';
import { buildBlockId, type BlockMetadata } from '../types/block';
import type { RepositorySnapshot } from './repository-snapshot';
import {
  diffPieceValues,
  prepareMallaProjectState,
  summarizePieceValues,
} from './app-helpers';

describe('summarizePieceValues', () => {
  test('counts entries and pieces with data', () => {
    const values = {
      pieceA: { r0c0: 'A', r0c1: 'B' },
      pieceB: {},
    };

    expect(summarizePieceValues(values)).toEqual({
      pieceCount: 2,
      nonEmptyPieceCount: 1,
      entryCount: 2,
      hasValues: true,
    });
  });
});

describe('diffPieceValues', () => {
  test('detects removed pieces and cleared keys', () => {
    const prev = {
      pieceA: { r0c0: 'A', r0c1: 'B' },
      pieceB: { r1c1: true },
    };
    const next = {
      pieceA: { r0c1: 'B' },
    };

    expect(diffPieceValues(prev, next)).toEqual({
      removedPieceIds: ['pieceB'],
      clearedValueKeysByPiece: { pieceA: ['r0c0'] },
    });
  });
});

describe('prepareMallaProjectState', () => {
  test('hydrates active master and block metadata from repository snapshot', () => {
    const repoId = 'repo-1';
    const metadata: BlockMetadata = {
      projectId: 'project-1',
      uuid: repoId,
      name: 'Bloque Uno',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const blockExport: BlockExport = {
      version: BLOCK_SCHEMA_VERSION,
      template: [[{ active: true, type: 'text', label: 'A' }]],
      visual: {},
      aspect: '1/1',
      metadata,
      theme: createDefaultProjectTheme(),
    };
    const entryId = buildBlockId(metadata.projectId, metadata.uuid);
    const snapshot: RepositorySnapshot = {
      entries: {
        [repoId]: {
          id: entryId,
          metadata,
          data: blockExport,
        },
      },
      repository: {
        [repoId]: blockExport,
      },
      metadata: {
        [repoId]: metadata,
      },
    };
    const malla: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: {},
      repository: snapshot.entries,
      pieces: [],
      values: {},
      theme: createDefaultProjectTheme(),
    };

    const result = prepareMallaProjectState(malla, snapshot);

    expect(result.block.repoId).toBe(repoId);
    expect(result.block.repoName).toBe(metadata.name);
    expect(result.malla.activeMasterId).toBe(repoId);
    expect(result.malla.masters[repoId]).toBeDefined();
    expect(result.malla.repository).toEqual(snapshot.entries);
    expect(result.malla.columnHeaders).toEqual({ enabled: false, rows: [] });
  });
});
