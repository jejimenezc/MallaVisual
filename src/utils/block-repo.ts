// src/utils/block-repo.ts
import {
  importBlock as ioImportBlock,
  exportBlock as ioExportBlock,
  type BlockExport,
} from './block-io.ts';

const STORAGE_KEY = 'block-repo';
const UPDATED_EVENT = 'block-repo-updated';

interface LS {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const g = globalThis as unknown as {
  localStorage?: LS;
  window?: (Window & { localStorage?: LS }) | undefined;
};

export const LEGACY_PROJECT_ID = 'legacy';

type ProjectBlockMap = Record<string, BlockExport>;
type RepositoryStorage = Record<string, ProjectBlockMap>;

interface StorageSnapshot {
  data: RepositoryStorage;
  shouldRewrite: boolean;
  legacyDetected: boolean;
}

const legacyNoticeShownFor = new Set<string>();

function getLocalStorage(): LS | undefined {
  return g.localStorage ?? g.window?.localStorage;
}

function getWindow(): (Window & { alert?: (message?: string) => void }) | undefined {
  return g.window ?? (typeof window !== 'undefined' ? window : undefined);
}

function emitUpdate(): void {
  const target = getWindow();
  if (!target || typeof target.dispatchEvent !== 'function' || typeof Event !== 'function') {
    return;
  }
  target.dispatchEvent(new Event(UPDATED_EVENT));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlockExportCandidate(value: unknown): value is BlockExport {
  if (!isPlainObject(value)) return false;
  return 'template' in value && 'visual' in value && 'aspect' in value;
}

function normalizeStorage(raw: unknown): StorageSnapshot {
  const snapshot: StorageSnapshot = {
    data: {},
    shouldRewrite: false,
    legacyDetected: false,
  };
  if (!isPlainObject(raw)) {
    return snapshot;
  }

  const entries = Object.entries(raw);
  if (entries.length === 0) {
    return snapshot;
  }

  const looksFlat = entries.every(([, value]) => isBlockExportCandidate(value));
  if (looksFlat) {
    const legacyBlocks: ProjectBlockMap = {};
    for (const [blockId, blockValue] of entries) {
      if (isBlockExportCandidate(blockValue)) {
        legacyBlocks[blockId] = blockValue;
      } else {
        snapshot.shouldRewrite = true;
      }
    }
    snapshot.data[LEGACY_PROJECT_ID] = legacyBlocks;
    snapshot.shouldRewrite = true;
    snapshot.legacyDetected = true;
    return snapshot;
  }

  for (const [projectId, value] of entries) {
    if (!isPlainObject(value)) {
      snapshot.shouldRewrite = true;
      continue;
    }
    const projectBlocks: ProjectBlockMap = {};
    for (const [blockId, blockValue] of Object.entries(value)) {
      if (isBlockExportCandidate(blockValue)) {
        projectBlocks[blockId] = blockValue;
      } else {
        snapshot.shouldRewrite = true;
      }
    }
    snapshot.data[projectId] = projectBlocks;
  }

  return snapshot;
}

function readAll(): StorageSnapshot {
  const ls = getLocalStorage();
  if (!ls) return { data: {}, shouldRewrite: false, legacyDetected: false };
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return { data: {}, shouldRewrite: false, legacyDetected: false };
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStorage(parsed);
  } catch {
    return { data: {}, shouldRewrite: false, legacyDetected: false };
  }
}

function pruneEmptyProjects(data: RepositoryStorage): RepositoryStorage {
  const result: RepositoryStorage = {};
  for (const [projectId, blocks] of Object.entries(data)) {
    if (!isPlainObject(blocks)) {
      continue;
    }
    if (Object.keys(blocks).length > 0) {
      result[projectId] = blocks;
    }
  }
  return result;
}

function writeAll(data: RepositoryStorage): void {
  const ls = getLocalStorage();
  const pruned = pruneEmptyProjects(data);
  if (!ls) {
    emitUpdate();
    return;
  }
  try {
    if (Object.keys(pruned).length === 0) {
      ls.removeItem(STORAGE_KEY);
    } else {
      ls.setItem(STORAGE_KEY, JSON.stringify(pruned));
    }
  } catch {
    /* ignore */
  }
  emitUpdate();
}

function normalizeProjectId(projectId?: string | null): string {
  if (projectId && projectId.trim().length > 0) {
    return projectId;
  }
  return LEGACY_PROJECT_ID;
}

function notifyLegacyMigration(projectId: string, count: number): void {
  if (legacyNoticeShownFor.has(projectId)) return;
  const target = getWindow();
  if (!target || typeof target.alert !== 'function') return;
  const label = projectId === LEGACY_PROJECT_ID ? 'general' : 'actual';
  const blocksLabel = count === 1 ? 'bloque' : 'bloques';
  target.alert(
    `Se migraron ${count} ${blocksLabel} del repositorio legado al proyecto ${label}.`,
  );
  legacyNoticeShownFor.add(projectId);
}

export interface SaveableBlock {
  id: string;
  data: BlockExport;
}

export interface StoredBlock extends SaveableBlock {
  projectId: string;
}

export function listBlocks(projectId?: string | null): StoredBlock[] {
  const snapshot = readAll();
  let data = snapshot.data;
  let shouldPersist = snapshot.shouldRewrite;
  const targetProjectId = normalizeProjectId(projectId);
  let migratedCount = 0;

  if (targetProjectId !== LEGACY_PROJECT_ID) {
    const legacyBlocks = data[LEGACY_PROJECT_ID];
    if (legacyBlocks && Object.keys(legacyBlocks).length > 0) {
      const nextData: RepositoryStorage = { ...data };
      const targetBlocks: ProjectBlockMap = {
        ...(nextData[targetProjectId] ?? {}),
      };
      for (const [blockId, blockValue] of Object.entries(legacyBlocks)) {
        targetBlocks[blockId] = blockValue;
        migratedCount += 1;
      }
      nextData[targetProjectId] = targetBlocks;
      delete nextData[LEGACY_PROJECT_ID];
      data = nextData;
      shouldPersist = true;
    }
  }

  if (shouldPersist) {
    writeAll(data);
  }

  if (migratedCount > 0) {
    notifyLegacyMigration(targetProjectId, migratedCount);
  }

  const projectBlocks = data[targetProjectId] ?? {};
  return Object.entries(projectBlocks).map(([id, block]) => ({
    id,
    projectId: targetProjectId,
    data: block,
  }));
}

export function saveBlock(projectId: string | null | undefined, block: SaveableBlock): void {
  const targetProjectId = normalizeProjectId(projectId);
  const snapshot = readAll();
  const data: RepositoryStorage = { ...snapshot.data };
  const projectBlocks: ProjectBlockMap = {
    ...(data[targetProjectId] ?? {}),
  };
  projectBlocks[block.id] = block.data;
  data[targetProjectId] = projectBlocks;
  writeAll(data);
}

export function removeBlock(projectId: string | null | undefined, id: string): void {
  const targetProjectId = normalizeProjectId(projectId);
  const snapshot = readAll();
  const projectBlocks = snapshot.data[targetProjectId];
  if (!projectBlocks || !(id in projectBlocks)) {
    return;
  }
  const nextBlocks: ProjectBlockMap = { ...projectBlocks };
  delete nextBlocks[id];
  const data: RepositoryStorage = { ...snapshot.data, [targetProjectId]: nextBlocks };
  writeAll(data);
}

export const importBlock = ioImportBlock;

export function exportBlock(block: BlockExport): string {
  return ioExportBlock(block.template, block.visual, block.aspect, block.meta);
}

export function replaceBlocks(
  projectId: string | null | undefined,
  blocks: Record<string, BlockExport>,
): void {
  const targetProjectId = normalizeProjectId(projectId);
  const snapshot = readAll();
  const data: RepositoryStorage = { ...snapshot.data };
  data[targetProjectId] = { ...blocks };
  writeAll(data);
}

export function clearBlocks(projectId?: string | null): void {
  if (typeof projectId === 'undefined') {
    writeAll({});
    return;
  }
  const targetProjectId = normalizeProjectId(projectId);
  const snapshot = readAll();
  if (!(targetProjectId in snapshot.data)) {
    return;
  }
  const data: RepositoryStorage = { ...snapshot.data };
  delete data[targetProjectId];
  writeAll(data);
}