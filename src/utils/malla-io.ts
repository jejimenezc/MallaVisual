// src/utils/malla-io.ts
import type { CurricularPiece, MasterBlockData } from '../types/curricular';
import { buildBlockId, parseBlockId, type BlockId, type BlockMetadata } from '../types/block.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './block-io.ts';
import {
  remapPiecesWithMapping,
  remapIds,
  synchronizeMastersWithRepository,
} from './malla-sync.ts';
import { cloneBlockContent, toBlockContent } from './block-content.ts';
import {
  createDefaultProjectTheme,
  normalizeProjectTheme,
  type ProjectTheme,
  type ProjectThemeParameters,
  type ProjectThemeTokens,
} from './project-theme.ts';

export interface MallaRepositoryEntry {
  id: BlockId;
  metadata: BlockMetadata;
  data: BlockExport;
}

export interface MallaExport {
  version: number;
  masters: Record<string, MasterBlockData>;
  repository: Record<string, MallaRepositoryEntry>;
  repositoryMetadata?: Record<string, BlockMetadata>;
  grid?: { cols: number; rows: number };
  pieces: CurricularPiece[];
  values: Record<string, Record<string, string | number | boolean>>;
  floatingPieces?: string[];
  activeMasterId?: string;
  theme: ProjectTheme;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MALLA_SCHEMA_VERSION = 5;

export { createDefaultProjectTheme, normalizeProjectTheme };
export type { ProjectTheme, ProjectThemeTokens, ProjectThemeParameters };

function cloneBlockExport(data: BlockExport, metadata: BlockMetadata): BlockExport {
  const theme = normalizeProjectTheme(data.theme);
  const clonedTheme: ProjectTheme = {
    paletteId: theme.paletteId,
    tokens: { ...theme.tokens },
  };
  if (theme.params) {
    clonedTheme.params = { ...theme.params };
  }
  return {
    ...data,
    metadata: data.metadata ? { ...data.metadata } : { ...metadata },
    theme: clonedTheme,
  };
}

function normalizeRepositoryEntries(
  repository: Record<string, unknown> | undefined,
): Record<string, MallaRepositoryEntry> {
  if (!repository) return {};
  const normalized: Record<string, MallaRepositoryEntry> = {};
  for (const value of Object.values(repository)) {
    if (!value || typeof value !== 'object') {
      throw new Error('Repositorio inválido');
    }
    const entry = value as Partial<MallaRepositoryEntry>;
    if (!entry.metadata || !entry.data || !entry.id) {
      throw new Error('Repositorio inválido');
    }
    const metadata = entry.metadata as BlockMetadata;
    if (!metadata.uuid || typeof metadata.uuid !== 'string') {
      throw new Error('Repositorio inválido');
    }
    const uuid = metadata.uuid;
    const finalMetadata: BlockMetadata = {
      projectId:
        metadata.projectId && metadata.projectId.trim().length > 0
          ? metadata.projectId.trim()
          : 'repository',
      uuid,
      name:
        metadata.name && metadata.name.trim().length > 0
          ? metadata.name.trim()
          : uuid,
      updatedAt: metadata.updatedAt ?? new Date().toISOString(),
    };
    const blockData: BlockExport = cloneBlockExport(entry.data, finalMetadata);
    normalized[uuid] = {
      id: entry.id,
      metadata: finalMetadata,
      data: blockData,
    };
  }
  return normalized;
}

function ensureUniqueUuid(used: Set<string>): string {
  let uuid = crypto.randomUUID();
  while (used.has(uuid)) {
    uuid = crypto.randomUUID();
  }
  used.add(uuid);
  return uuid;
}

function normalizeLegacyMetadata(
  key: string,
  meta: Partial<BlockMetadata> | undefined,
  now: string,
  used: Set<string>,
): BlockMetadata {
  const trimmedKey = key.trim();
  const parsedFromKey = trimmedKey.includes(':') ? parseBlockId(trimmedKey as BlockId) : null;
  let projectId = meta?.projectId?.trim() || parsedFromKey?.projectId || 'legacy';

  let uuidCandidate = meta?.uuid?.trim() || parsedFromKey?.uuid || '';
  if (!uuidCandidate && UUID_PATTERN.test(trimmedKey)) {
    uuidCandidate = trimmedKey;
  }
  if (!uuidCandidate || !UUID_PATTERN.test(uuidCandidate) || used.has(uuidCandidate)) {
    uuidCandidate = ensureUniqueUuid(used);
  } else {
    used.add(uuidCandidate);
  }

  let name = meta?.name?.trim() ?? '';
  if (!name) {
    name = trimmedKey && trimmedKey.length > 0 ? trimmedKey : `Bloque ${used.size}`;
  }

  const updatedAt = meta?.updatedAt ?? now;

  return {
    projectId: projectId && projectId.length > 0 ? projectId : 'legacy',
    uuid: uuidCandidate,
    name,
    updatedAt,
  };
}

function masterToBlockExport(master: MasterBlockData): BlockExport {
  const content = cloneBlockContent(toBlockContent(master));
  return {
    version: BLOCK_SCHEMA_VERSION,
    template: content.template,
    visual: content.visual,
    aspect: content.aspect,
    theme: createDefaultProjectTheme(),
  };
}

function migrateLegacyMalla(
  data: Omit<Partial<MallaExport>, 'repository'> & {
    repository?: Record<string, BlockExport>;
    repositoryMetadata?: Record<string, BlockMetadata>;
  },
): {
  repository: Record<string, MallaRepositoryEntry>;
  masters: Record<string, MasterBlockData>;
  pieces: CurricularPiece[];
  floatingPieces: string[];
  activeMasterId: string | undefined;
} {
  const legacyRepository = (data.repository as Record<string, BlockExport> | undefined) ?? {};
  const legacyMetadata = (data.repositoryMetadata as Record<string, BlockMetadata> | undefined) ?? {};
  const sourceMasters = data.masters ?? {};
  const { masters: normalizedMasters, mapping: masterMapping } = synchronizeMastersWithRepository(
    sourceMasters,
    legacyRepository,
  );
  const now = new Date().toISOString();
  const usedUuids = new Set<string>();
  const repoKeyMapping = new Map<string, string>();
  const repository: Record<string, MallaRepositoryEntry> = {};

  const candidateKeys = new Set<string>([
    ...Object.keys(legacyRepository),
    ...Object.keys(normalizedMasters),
  ]);

  for (const key of candidateKeys) {
    const masterEntry = normalizedMasters[key];
    if (!legacyRepository[key] && !masterEntry) {
      continue;
    }
    const blockData = legacyRepository[key] ?? masterToBlockExport(masterEntry!);
    const metadata = normalizeLegacyMetadata(key, legacyMetadata[key], now, usedUuids);
    const id = buildBlockId(metadata.projectId, metadata.uuid);
    const entryData = cloneBlockExport(blockData, metadata);
    repository[metadata.uuid] = {
      id,
      metadata,
      data: entryData,
    };
    repoKeyMapping.set(key, metadata.uuid);
  }

  const mapping = new Map<string, string>();
  for (const [legacyMasterId, legacyRepoKey] of masterMapping.entries()) {
    const mapped = repoKeyMapping.get(legacyRepoKey) ?? legacyRepoKey;
    mapping.set(legacyMasterId, mapped);
  }
  for (const [legacyRepoKey, newUuid] of repoKeyMapping.entries()) {
    mapping.set(legacyRepoKey, newUuid);
  }

  const migratedMasters: Record<string, MasterBlockData> = {};
  for (const [legacyRepoKey, masterData] of Object.entries(normalizedMasters)) {
    const newKey = repoKeyMapping.get(legacyRepoKey) ?? legacyRepoKey;
    migratedMasters[newKey] = masterData;
  }

  const pieces = remapPiecesWithMapping(data.pieces ?? [], mapping);
  const floatingPieces = remapIds(data.floatingPieces ?? [], mapping);
  const activeMasterId = data.activeMasterId
    ? mapping.get(data.activeMasterId) ?? data.activeMasterId
    : undefined;

  return {
    repository,
    masters: migratedMasters,
    pieces,
    floatingPieces,
    activeMasterId,
  };
}

// No aceptar 'version' desde fuera: se fija aquí adentro
export function exportMalla(data: Omit<MallaExport, 'version'>): string {
  const repositoryEntries = data.repository ?? {};
  const orderedKeys = Object.keys(repositoryEntries).sort((a, b) => a.localeCompare(b));
  const serializedRepository: Record<string, MallaRepositoryEntry> = {};
  for (const key of orderedKeys) {
    const entry = repositoryEntries[key];
    if (!entry) continue;
    serializedRepository[key] = {
      id: entry.id,
      metadata: { ...entry.metadata },
      data: cloneBlockExport(entry.data, entry.metadata),
    };
  }

  const payload: MallaExport = {
    ...data,
    repository: serializedRepository,
    theme: normalizeProjectTheme(data.theme),
    version: MALLA_SCHEMA_VERSION,
  };
  return JSON.stringify(payload, null, 2);
}

export function importMalla(json: string): MallaExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON inválido');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON inválido');
  }
  const data = parsed as Partial<MallaExport> & {
    repositoryMetadata?: Record<string, BlockMetadata>;
  };

  const version = typeof data.version === 'number' ? data.version : 2;
  if (version > MALLA_SCHEMA_VERSION) {
    throw new Error('Versión incompatible');
  }
  if (!data.masters || typeof data.masters !== 'object') {
    throw new Error('Datos "masters" incompletos');
  }

  let repository: Record<string, MallaRepositoryEntry>;
  let masters: Record<string, MasterBlockData>;
  let pieces: CurricularPiece[];
  let floatingPieces: string[];
  let activeMasterId: string | undefined = data.activeMasterId;
  let repositoryMetadata: Record<string, BlockMetadata>;

  if (version >= 4) {
    repository = normalizeRepositoryEntries(data.repository as Record<string, unknown> | undefined);
    masters = data.masters as Record<string, MasterBlockData>;
    pieces = data.pieces ?? [];
    floatingPieces = data.floatingPieces ?? [];
    repositoryMetadata = Object.fromEntries(
      Object.entries(repository).map(([key, entry]) => [key, { ...entry.metadata }]),
    );
  } else {
    const migrated = migrateLegacyMalla(
      data as Omit<Partial<MallaExport>, 'repository'> & {
        repository?: Record<string, BlockExport>;
        repositoryMetadata?: Record<string, BlockMetadata>;
      },
    );
    repository = migrated.repository;
    masters = migrated.masters;
    pieces = migrated.pieces;
    floatingPieces = migrated.floatingPieces;
    activeMasterId = migrated.activeMasterId;
    repositoryMetadata = Object.fromEntries(
      Object.entries(repository).map(([key, entry]) => [key, { ...entry.metadata }]),
    );
  }

  return {
    version: MALLA_SCHEMA_VERSION,
    masters,
    repository,
    repositoryMetadata,
    grid: data.grid ?? { cols: 5, rows: 5 },
    pieces,
    values: data.values ?? {},
    floatingPieces,
    activeMasterId,
    theme: normalizeProjectTheme((data as { theme?: unknown }).theme),
  };
}