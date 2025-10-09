// src/utils/malla-sync.ts
import type { BlockExport } from './block-io.ts';
import type { CurricularPiece, MasterBlockData } from '../types/curricular.ts';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from './block-content.ts';

export interface SynchronizeMastersResult {
  masters: Record<string, MasterBlockData>;
  mapping: Map<string, string>;
}

export function synchronizeMastersWithRepository(
  masters: Record<string, MasterBlockData>,
  repository: Record<string, BlockExport>,
): SynchronizeMastersResult {
  const repoContents = Object.entries(repository).map(([id, data]) => [
    id,
    toBlockContent(data),
  ]) as Array<[string, BlockContent]>;
  const assignedRepoIds = new Set<string>();
  const mapping = new Map<string, string>();
  const normalizedMasters: Record<string, MasterBlockData> = {};

  for (const [masterId, masterData] of Object.entries(masters)) {
    const content = toBlockContent(masterData);
    let targetId = masterId;
    if (repository[masterId]) {
      assignedRepoIds.add(masterId);
    } else {
      const match = repoContents.find(([repoId, repoContent]) => {
        if (assignedRepoIds.has(repoId)) return false;
        return blockContentEquals(content, repoContent);
      });
      if (match) {
        targetId = match[0];
        assignedRepoIds.add(targetId);
      }
    }
    mapping.set(masterId, targetId);
    normalizedMasters[targetId] = cloneBlockContent(content) as MasterBlockData;
  }

  for (const [repoId, repoContent] of repoContents) {
    if (!normalizedMasters[repoId]) {
      normalizedMasters[repoId] = cloneBlockContent(repoContent) as MasterBlockData;
      mapping.set(repoId, repoId);
    }
  }

  return { masters: normalizedMasters, mapping };
}

export function remapPiecesWithMapping(
  pieces: CurricularPiece[] | undefined,
  mapping: Map<string, string>,
): CurricularPiece[] {
  if (!pieces || pieces.length === 0) return [];
  return pieces.map((piece) => {
    if (piece.kind === 'ref') {
      const mapped = mapping.get(piece.ref.sourceId);
      if (mapped && mapped !== piece.ref.sourceId) {
        return {
          ...piece,
          ref: { ...piece.ref, sourceId: mapped },
        };
      }
      return piece;
    }
    if (piece.kind === 'snapshot' && piece.origin) {
      const mapped = mapping.get(piece.origin.sourceId);
      if (mapped && mapped !== piece.origin.sourceId) {
        return {
          ...piece,
          origin: { ...piece.origin, sourceId: mapped },
        };
      }
    }
    return piece;
  });
}

export function remapIds(ids: string[] | undefined, mapping: Map<string, string>): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => mapping.get(id) ?? id);
}
