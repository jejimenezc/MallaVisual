// src/utils/app-helpers.ts
import type { MasterBlockData } from '../types/curricular.ts';
import type { BlockMetadata } from '../types/block.ts';
import { cloneBlockContent, toBlockContent, type BlockContent } from './block-content.ts';
import type { MallaExport } from './malla-io.ts';
import { MALLA_SCHEMA_VERSION, normalizeMetaPanelConfig, normalizeProjectTheme } from './malla-io.ts';
import type { RepositorySnapshot } from './repository-snapshot.ts';
import {
  remapPiecesWithMapping,
  remapIds,
  synchronizeMastersWithRepository,
} from './malla-sync.ts';

export const ACTIVE_PROJECT_ID_STORAGE_KEY = 'activeProjectId';
export const ACTIVE_PROJECT_NAME_STORAGE_KEY = 'activeProjectName';
export const MALLA_AUTOSAVE_STORAGE_KEY = 'malla-editor-state';

export interface StoredActiveProject {
  id: string | null;
  name: string;
}

export interface TemplateControlSnapshot {
  active: Set<string>;
  cleaned: Set<string>;
}

export interface BlockState {
  draft: BlockContent;
  repoId: string | null;
  repoName: string | null;
  repoMetadata: BlockMetadata | null;
  published: BlockContent | null;
}

export interface ControlDataClearRequest {
  repoId: string;
  coord: string;
}

export type PieceValueMap = Record<string, Record<string, string | number | boolean>>;

export function readStoredActiveProject(storage: Storage | null): StoredActiveProject {
  if (!storage) return { id: null, name: '' };
  try {
    const id = storage.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    const name = storage.getItem(ACTIVE_PROJECT_NAME_STORAGE_KEY) ?? '';
    return { id, name };
  } catch {
    return { id: null, name: '' };
  }
}

export function persistActiveProject(
  storage: Storage | null,
  id: string,
  name: string,
): void {
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, id);
    storage.setItem(ACTIVE_PROJECT_NAME_STORAGE_KEY, name);
  } catch {
    /* ignore */
  }
}

export function clearStoredActiveProject(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    storage.removeItem(ACTIVE_PROJECT_NAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createBlockStateFromContent(content: BlockContent): BlockState {
  return {
    draft: cloneBlockContent(content),
    repoId: null,
    repoName: null,
    repoMetadata: null,
    published: null,
  };
}

export function createEmptyMaster(): MasterBlockData {
  return {
    template: Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ active: false, label: '', type: undefined })),
    ),
    visual: {},
    aspect: '1/1',
  };
}

export function createEmptyBlockState(): BlockState {
  const emptyMaster = createEmptyMaster();
  const emptyContent: BlockContent = {
    template: emptyMaster.template,
    visual: emptyMaster.visual,
    aspect: emptyMaster.aspect,
  };
  return createBlockStateFromContent(emptyContent);
}

export function summarizePieceValues(values: PieceValueMap) {
  const pieceIds = Object.keys(values);
  let entryCount = 0;
  let nonEmptyPieceCount = 0;

  for (const pieceId of pieceIds) {
    const entryKeys = Object.keys(values[pieceId] ?? {});
    if (entryKeys.length > 0) {
      nonEmptyPieceCount += 1;
      entryCount += entryKeys.length;
    }
  }

  return {
    pieceCount: pieceIds.length,
    nonEmptyPieceCount,
    entryCount,
    hasValues: entryCount > 0,
  };
}

export function diffPieceValues(prevValues: PieceValueMap, nextValues: PieceValueMap) {
  const removedPieceIds: string[] = [];
  const clearedValueKeysByPiece: Record<string, string[]> = {};

  for (const pieceId of Object.keys(prevValues)) {
    const prevForPiece = prevValues[pieceId];
    const nextForPiece = nextValues[pieceId];
    if (!nextForPiece) {
      removedPieceIds.push(pieceId);
      continue;
    }
    if (prevForPiece === nextForPiece) continue;
    const removedKeys = Object.keys(prevForPiece).filter((key) => !(key in nextForPiece));
    if (removedKeys.length > 0) {
      clearedValueKeysByPiece[pieceId] = removedKeys;
    }
  }

  return { removedPieceIds, clearedValueKeysByPiece };
}

export function prepareMallaProjectState(
  data: MallaExport,
  repositorySnapshot: RepositorySnapshot,
): { block: BlockState; malla: MallaExport } {
  const repository = repositorySnapshot.repository;
  const repositoryEntries = repositorySnapshot.entries;
  const repositoryMetadata = repositorySnapshot.metadata;
  const sourceMasters = data.masters ?? {};
  const { masters: normalizedMasters, mapping } = synchronizeMastersWithRepository(
    sourceMasters,
    repository,
  );
  const remappedPieces = remapPiecesWithMapping(data.pieces ?? [], mapping);
  const floatingPieces = remapIds(data.floatingPieces ?? [], mapping);
  const values = { ...(data.values ?? {}) };

  let desiredActiveId = data.activeMasterId ?? '';
  if (desiredActiveId) {
    const mapped = mapping.get(desiredActiveId);
    if (mapped) {
      desiredActiveId = mapped;
    }
  }

  const repoIds = Object.keys(repository);
  const normalizedIds = Object.keys(normalizedMasters);
  const mappedRepoIds = new Set<string>(mapping.values());

  let activeId = desiredActiveId;
  if (activeId && !normalizedMasters[activeId]) {
    const mapped = mapping.get(activeId);
    if (mapped && normalizedMasters[mapped]) {
      activeId = mapped;
    }
  }

  if (!activeId || !normalizedMasters[activeId] || !repository[activeId]) {
    const candidate = repoIds.find((id) => mappedRepoIds.has(id) && normalizedMasters[id]);
    if (candidate) {
      activeId = candidate;
    }
  }

  if ((!activeId || !normalizedMasters[activeId]) && repoIds.length > 0) {
    const candidate = repoIds.find((id) => normalizedMasters[id]);
    activeId = candidate ?? repoIds[0];
  }

  if (!activeId || !normalizedMasters[activeId]) {
    activeId = normalizedIds[0] ?? '';
  }

  if (!activeId) {
    activeId = 'master';
  }

  if (!normalizedMasters[activeId]) {
    if (repository[activeId]) {
      normalizedMasters[activeId] = cloneBlockContent(
        toBlockContent(repository[activeId]),
      ) as MasterBlockData;
    } else {
      normalizedMasters[activeId] = createEmptyMaster();
    }
    mapping.set(activeId, activeId);
  }

  const activeMaster = normalizedMasters[activeId];
  const draft = cloneBlockContent(toBlockContent(activeMaster));
  const repoEntry = repository[activeId];
  const repoMeta = repositoryMetadata[activeId] ?? null;
  const published = repoEntry ? cloneBlockContent(toBlockContent(repoEntry)) : null;

  const block: BlockState = {
    draft,
    repoId: repoEntry ? activeId : null,
    repoName: repoMeta ? repoMeta.name : repoEntry ? activeId : null,
    repoMetadata: repoMeta,
    published,
  };

  const mallaState: MallaExport = {
    ...data,
    version: MALLA_SCHEMA_VERSION,
    masters: normalizedMasters,
    pieces: remappedPieces,
    values,
    floatingPieces,
    activeMasterId: activeId,
    repository: repositoryEntries,
    theme: normalizeProjectTheme(data.theme),
    metaPanel: normalizeMetaPanelConfig(data.metaPanel),
  };

  return { block, malla: mallaState };
}
