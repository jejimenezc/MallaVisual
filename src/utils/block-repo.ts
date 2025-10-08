// src/utils/block-repo.ts
import {
  importBlock as ioImportBlock,
  exportBlock as ioExportBlock,
  type BlockExport,
} from './block-io.ts';
import { createBlockId, type BlockId, type BlockMetadata } from '../types/block.ts';

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
        const id = (incoming.id && incoming.id.trim().length > 0
          ? incoming.id
          : key) as BlockId;
        migrated[id] = {
          id,
          metadata: {
            projectId:
              incoming.metadata.projectId && incoming.metadata.projectId.trim().length > 0
                ? incoming.metadata.projectId
                : 'unknown',
            name: incoming.metadata.name,
            updatedAt: incoming.metadata.updatedAt ?? now,
          },
          data: incoming.data,
        };
      } else if (isBlockExport(value)) {
        didMigrate = true;
        const projectId = 'legacy';
        const id = createBlockId(projectId);
        migrated[id] = {
          id,
          metadata: {
            projectId,
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
    (g.window as Window | undefined) ?? (typeof window !== 'undefined' ? window : undefined);
  if (!target || typeof target.dispatchEvent !== 'function' || typeof Event !== 'function') {
    return;
  }
  target.dispatchEvent(new Event(UPDATED_EVENT));
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
  all[block.id] = {
    id: block.id,
    metadata: { ...block.metadata },
    data: block.data,
  };
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
    return blocks.reduce<PersistedBlockRecord>((acc, block) => {
      acc[block.id] = {
        id: block.id,
        metadata: { ...block.metadata },
        data: block.data,
      };
      return acc;
    }, {});
  }
  return Object.values(blocks).reduce<PersistedBlockRecord>((acc, block) => {
    acc[block.id] = {
      id: block.id,
      metadata: { ...block.metadata },
      data: block.data,
    };
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
  all[id] = {
    ...existing,
    metadata: {
      ...existing.metadata,
      ...metadata,
    },
  };
  writeAll(all);
}

export function renameBlock(id: BlockId, name: string): void {
  updateBlockMetadata(id, { name, updatedAt: new Date().toISOString() });
}