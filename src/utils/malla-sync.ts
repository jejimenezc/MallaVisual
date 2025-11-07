// src/utils/malla-sync.ts
import type { BlockExport } from './block-io.ts';
import type {
  CurricularPiece,
  MasterBlockData,
  BlockSourceRef,
} from '../types/curricular.ts';
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

interface ClearControlValuesParams {
  repoId: string | null | undefined;
  coordKey: string;
  pieces?: CurricularPiece[];
  pieceValues?: Record<string, Record<string, string | number | boolean>>;
}

function parseCoordKey(key: string): { row: number; col: number } | null {
  const [rowStr, colStr] = key.split('-');
  const row = Number.parseInt(rowStr ?? '', 10);
  const col = Number.parseInt(colStr ?? '', 10);
  if (Number.isNaN(row) || Number.isNaN(col)) {
    return null;
  }
  return { row, col };
}

function getPieceOrigin(piece: CurricularPiece): BlockSourceRef | null {
  if (piece.kind === 'ref') {
    return piece.ref;
  }
  if (piece.kind === 'snapshot' && piece.origin) {
    return piece.origin;
  }
  return null;
}

export function clearControlValues({
  repoId,
  coordKey: targetCoordKey,
  pieces = [],
  pieceValues = {},
}: ClearControlValuesParams): Record<string, Record<string, string | number | boolean>> {
  if (!repoId) return pieceValues;
  const parsed = parseCoordKey(targetCoordKey);
  if (!parsed) return pieceValues;
  const { row: targetRow, col: targetCol } = parsed;

  const updates = new Map<string, Record<string, string | number | boolean>>();
  const removals = new Set<string>();
  let changed = false;

  const getCurrentValues = (pieceId: string) => {
    if (removals.has(pieceId)) return undefined;
    if (updates.has(pieceId)) return updates.get(pieceId);
    return pieceValues[pieceId];
  };

  for (const piece of pieces) {
    const origin = getPieceOrigin(piece);
    if (!origin || origin.sourceId !== repoId) {
      continue;
    }
    const bounds = origin.bounds;
    if (!bounds) continue;
    if (
      targetRow < bounds.minRow ||
      targetRow > bounds.maxRow ||
      targetCol < bounds.minCol ||
      targetCol > bounds.maxCol
    ) {
      continue;
    }

    const localRow = targetRow - bounds.minRow;
    const localCol = targetCol - bounds.minCol;
    if (localRow < 0 || localCol < 0 || localRow >= bounds.rows || localCol >= bounds.cols) {
      continue;
    }

    const valueKey = `r${localRow}c${localCol}`;
    const currentValues = getCurrentValues(piece.id);
    if (!currentValues || !(valueKey in currentValues)) {
      continue;
    }

    const nextForPiece = { ...currentValues };
    delete nextForPiece[valueKey];

    if (Object.keys(nextForPiece).length === 0) {
      removals.add(piece.id);
      updates.delete(piece.id);
    } else {
      updates.set(piece.id, nextForPiece);
    }

    changed = true;
  }

  if (!changed) {
    return pieceValues;
  }

  const nextValues: Record<string, Record<string, string | number | boolean>> = {
    ...pieceValues,
  };

  for (const pieceId of removals) {
    delete nextValues[pieceId];
  }

  for (const [pieceId, values] of updates) {
    nextValues[pieceId] = values;
  }

  return nextValues;
}