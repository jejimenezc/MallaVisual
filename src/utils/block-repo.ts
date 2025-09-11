// src/utils/block-repo.ts
import {
  importBlock as ioImportBlock,
  exportBlock as ioExportBlock,
  type BlockExport,
} from './block-io.ts';

const STORAGE_KEY = 'block-repo';

interface LS {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const g = globalThis as unknown as {
  localStorage?: LS;
  window?: { localStorage?: LS };
};

function getLocalStorage(): LS | undefined {
  return g.localStorage ?? g.window?.localStorage;
}

function readAll(): Record<string, BlockExport> {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BlockExport>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, BlockExport>): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export interface StoredBlock {
  id: string;
  data: BlockExport;
}

export function listBlocks(): StoredBlock[] {
  const all = readAll();
  return Object.entries(all).map(([id, data]) => ({ id, data }));
}

export function saveBlock(block: StoredBlock): void {
  const all = readAll();
  all[block.id] = block.data;
  writeAll(all);
}

export function removeBlock(id: string): void {
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