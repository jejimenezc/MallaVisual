// src/utils/block-repo.ts
import {
  importBlock as ioImportBlock,
  exportBlock as ioExportBlock,
  type BlockExport,
} from './block-io.ts';
import {
  buildBlockId,
  createBlockId,
  parseBlockId,
  type BlockId,
  type BlockMetadata,
} from '../types/block.ts';

const STORAGE_KEY = 'block-repo';
const UPDATED_EVENT = 'block-repo-updated';

interface LS {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

interface MaybeWindow {
  localStorage?: LS;
  addEventListener?: (...args: unknown[]) => void;
  removeEventListener?: (...args: unknown[]) => void;
  dispatchEvent?: (...args: unknown[]) => void;
}

const g = globalThis as unknown as {
  localStorage?: LS;
  window?: MaybeWindow | undefined;
};

function getLocalStorage(): LS | undefined {
  return g.localStorage ?? g.window?.localStorage;
}

interface PersistedBlockRecord {
  [id: BlockId]: StoredBlock;
}

function isBlockExport(value: unknown): value is BlockExport {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<BlockExport>;
  return (
    typeof data.version === 'number' &&
    typeof data.template === 'object' &&
    data.template !== null &&
    typeof data.visual === 'object' &&
    data.visual !== null &&
    typeof data.aspect === 'string'
  );
}

function isStoredBlockPayload(value: unknown): value is StoredBlock {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<StoredBlock>;
  if (!data.data || !data.metadata) return false;
  if (!isBlockExport(data.data)) return false;
  const metadata = data.metadata as Partial<BlockMetadata>;
  if (typeof metadata.name !== 'string') return false;
  if (typeof metadata.projectId !== 'string') return false;
  if (typeof metadata.updatedAt !== 'string') return false;
  return true;
}

function normalizeStoredBlock(
  block: StoredBlock,
  fallbackName: string,
  now: string,
): StoredBlock {
  const { projectId: idProjectId, uuid: idUuid } = parseBlockId(block.id);
  const rawMetadata = block.metadata ?? ({} as BlockMetadata);
  const projectId =
    (rawMetadata.projectId && rawMetadata.projectId.trim().length > 0
      ? rawMetadata.projectId.trim()
      : idProjectId) || 'unknown';
  const uuid =
    (rawMetadata.uuid && rawMetadata.uuid.trim().length > 0
      ? rawMetadata.uuid.trim()
      : idUuid) || idUuid;
  const name =
    rawMetadata.name && rawMetadata.name.trim().length > 0
      ? rawMetadata.name
      : fallbackName && fallbackName.trim().length > 0
        ? fallbackName.trim()
        : uuid;
  const updatedAt = rawMetadata.updatedAt ?? now;

  const normalizedId = buildBlockId(projectId, uuid);

  return {
    id: normalizedId,
    metadata: {
      projectId,
      uuid,
      name,
      updatedAt,
    },
    data: block.data,
  };
}

function readAll(): PersistedBlockRecord {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const entries = Object.entries(parsed as Record<string, unknown>);
    const migrated: PersistedBlockRecord = {};
    let didMigrate = false;
    const now = new Date().toISOString();
    for (const [key, value] of entries) {
      if (isStoredBlockPayload(value)) {
        const incoming = value as StoredBlock;
        const id =
          (incoming.id && incoming.id.trim().length > 0 ? incoming.id : key) as BlockId;
        const normalized = normalizeStoredBlock(
          {
            id,
            metadata: incoming.metadata,
            data: incoming.data,
          },
          key,
          now,
        );
        migrated[normalized.id] = normalized;
      } else if (isBlockExport(value)) {
        didMigrate = true;
        const projectId = 'legacy';
        const id = createBlockId(projectId);
        const { uuid } = parseBlockId(id);
        migrated[id] = {
          id,
          metadata: {
            projectId,
            uuid,
            name: key,
            updatedAt: now,
          },
          data: value,
        };
      }
    }
    if (didMigrate) {
      writeAll(migrated);
    }
    return migrated;
  } catch {
    return {};
  }
}

function emitUpdate(): void {
  const target =
    g.window ??
    ((typeof globalThis !== 'undefined' && (globalThis as { window?: MaybeWindow }).window)
      || undefined);
  if (!target || typeof target.dispatchEvent !== 'function') {
    return;
  }
  const EventCtor = (globalThis as { Event?: typeof Event }).Event;
  if (typeof EventCtor !== 'function') {
    return;
  }
  target.dispatchEvent(new EventCtor(UPDATED_EVENT));
}

function writeAll(data: PersistedBlockRecord): void {
  const ls = getLocalStorage();
  if (!ls) {
    emitUpdate();
    return;
  }
  try {
    if (Object.keys(data).length === 0) {
      ls.removeItem(STORAGE_KEY);
    } else {
      ls.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    /* ignore */
  }
  emitUpdate();
}

export interface StoredBlock {
  id: BlockId;
  metadata: BlockMetadata;
  data: BlockExport;
}

export function listBlocks(): StoredBlock[] {
  const all = readAll();
  return Object.values(all);
}

export function saveBlock(block: StoredBlock): void {
  const all = readAll();
  const now = new Date().toISOString();
  const normalized = normalizeStoredBlock(block, block.metadata.name, now);
  all[normalized.id] = normalized;
  writeAll(all);
}

export function removeBlock(id: BlockId): void {
  const all = readAll();
  if (id in all) {
    delete all[id];
    writeAll(all);
  }
}

export const importBlock = ioImportBlock;
export function exportBlock(block: BlockExport): string {
  return ioExportBlock(block.template, block.visual, block.aspect);
}

function normalizeReplacement(
  blocks: StoredBlock[] | Record<BlockId, StoredBlock>,
): PersistedBlockRecord {
  if (Array.isArray(blocks)) {
    const now = new Date().toISOString();
    return blocks.reduce<PersistedBlockRecord>((acc, block) => {
      const normalized = normalizeStoredBlock(block, block.metadata.name, now);
      acc[normalized.id] = normalized;
      return acc;
    }, {});
  }
  const now = new Date().toISOString();
  return Object.values(blocks).reduce<PersistedBlockRecord>((acc, block) => {
    const normalized = normalizeStoredBlock(block, block.metadata.name, now);
    acc[normalized.id] = normalized;
    return acc;
  }, {});
}

export function replaceBlocks(blocks: StoredBlock[] | Record<BlockId, StoredBlock>): void {
  writeAll(normalizeReplacement(blocks));
}

export function clearBlocks(): void {
  writeAll({});
}

export function updateBlockMetadata(id: BlockId, metadata: Partial<BlockMetadata>): void {
  const all = readAll();
  const existing = all[id];
  if (!existing) return;
  const merged: StoredBlock = {
    ...existing,
    metadata: {
      ...existing.metadata,
      ...metadata,
    },
  };
  const normalized = normalizeStoredBlock(merged, merged.metadata.name, merged.metadata.updatedAt);
  delete all[id];
  all[normalized.id] = normalized;
  writeAll(all);
}

export function renameBlock(id: BlockId, name: string): void {
  updateBlockMetadata(id, { name, updatedAt: new Date().toISOString() });
}