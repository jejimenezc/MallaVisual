// src/utils/repository-snapshot.ts
import type { BlockExport } from './block-io.ts';
import type { StoredBlock } from './block-repo.ts';
import type { BlockMetadata } from '../types/block.ts';
import type { MallaRepositoryEntry } from './malla-io.ts';

export interface RepositorySnapshot {
  entries: Record<string, MallaRepositoryEntry>;
  repository: Record<string, BlockExport>;
  metadata: Record<string, BlockMetadata>;
}

export function normalizeRepository(
  repo: Record<string, BlockExport>,
): Record<string, BlockExport> {
  return Object.fromEntries(
    Object.entries(repo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, data]) => [id, data]),
  );
}

export function blocksToRepository(blocks: StoredBlock[]): RepositorySnapshot {
  const entries: Record<string, MallaRepositoryEntry> = {};
  const repositoryEntries: Record<string, BlockExport> = {};
  const metadataEntries: Record<string, BlockMetadata> = {};

  for (const block of blocks) {
    const key = block.metadata.uuid;
    const metadata: BlockMetadata = { ...block.metadata };
    const entry: MallaRepositoryEntry = {
      id: block.id,
      metadata,
      data: block.data,
    };
    entries[key] = entry;
    repositoryEntries[key] = block.data;
    metadataEntries[key] = metadata;
  }

  const repository = normalizeRepository(repositoryEntries);
  const orderedMetadata: Record<string, BlockMetadata> = {};
  const orderedEntries: Record<string, MallaRepositoryEntry> = {};

  for (const key of Object.keys(repository)) {
    const entry = entries[key];
    if (!entry) continue;
    orderedEntries[key] = entry;
    orderedMetadata[key] = metadataEntries[key];
  }

  return { entries: orderedEntries, repository, metadata: orderedMetadata };
}

export function entriesToRepositorySnapshot(
  entries: Record<string, MallaRepositoryEntry> | undefined,
): RepositorySnapshot {
  if (!entries) {
    return { entries: {}, repository: {}, metadata: {} };
  }
  const repositoryEntries: Record<string, BlockExport> = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry) continue;
    repositoryEntries[key] = entry.data;
  }
  const repository = normalizeRepository(repositoryEntries);
  const metadata: Record<string, BlockMetadata> = {};
  const orderedEntries: Record<string, MallaRepositoryEntry> = {};

  for (const key of Object.keys(repository)) {
    const entry = entries[key];
    if (!entry) continue;
    orderedEntries[key] = {
      id: entry.id,
      metadata: { ...entry.metadata },
      data: entry.data,
    };
    metadata[key] = { ...entry.metadata };
  }

  return { entries: orderedEntries, repository, metadata };
}
