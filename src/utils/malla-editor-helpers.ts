// src/utils/malla-editor-helpers.ts
import type { CSSProperties } from 'react';
import type {
  BlockTemplate,
  CurricularPiece,
  MasterBlockData,
} from '../types/curricular.ts';
import type { BlockAspect, VisualTemplate } from '../types/visual.ts';
import type { StoredBlock } from './block-repo.ts';
import { getCellSizeByAspect } from '../components/BlockSnapshot';
import { GRID_GAP, GRID_PAD } from '../styles/constants.ts';
import { deepClone } from './comparators.ts';
import type { ActiveBounds } from './block-active.ts';
import { getCellAt } from './malla-queries.ts';
import {
  MALLA_SCHEMA_VERSION,
  normalizeMetaPanelConfig,
  type MetaPanelConfig,
  normalizeProjectTheme,
  type MallaExport,
  type ProjectTheme,
} from './malla-io.ts';

export interface MallaHistoryEntry {
  cols: number;
  rows: number;
  pieces: CurricularPiece[];
  pieceValues: Record<string, Record<string, string | number | boolean>>;
  floatingPieces: string[];
  mastersById: Record<string, MasterBlockData>;
  selectedMasterId: string;
  metaPanel: MetaPanelConfig;
  theme: ProjectTheme;
}

export interface NormalizedInitialMalla {
  project: MallaExport;
  masters: Record<string, MasterBlockData>;
  grid: { cols: number; rows: number };
  pieces: CurricularPiece[];
  values: Record<string, Record<string, string | number | boolean>>;
  floatingPieces: string[];
  activeMasterId: string;
  theme: ProjectTheme;
  metaPanel: MetaPanelConfig;
}

export const cloneMallaHistoryEntry = (entry: MallaHistoryEntry): MallaHistoryEntry => {
  return deepClone(entry);
};

export function formatMasterDisplayName(
  metadata: StoredBlock['metadata'],
  fallbackId: string,
) {
  const friendlyName = metadata.name?.trim();
  if (friendlyName) {
    return friendlyName;
  }

  if (fallbackId.length <= 10) {
    return fallbackId;
  }

  const prefix = fallbackId.slice(0, 4);
  const suffix = fallbackId.slice(-3);
  const maskedWithSpace = `${prefix}... ${suffix}`;
  if (maskedWithSpace.length <= 10) {
    return maskedWithSpace;
  }
  return `${prefix}...${suffix}`;
}

/** Calculo unificado de metricas de una pieza (recorte) */
export function computeMetrics(tpl: BlockTemplate, aspect: BlockAspect) {
  const { cellW, cellH } = getCellSizeByAspect(aspect);
  const cols = tpl[0]?.length ?? 0;
  const rows = tpl.length;

  const contentW = cols * cellW + Math.max(0, cols - 1) * GRID_GAP;
  const contentH = rows * cellH + Math.max(0, rows - 1) * GRID_GAP;
  const outerW = contentW + GRID_PAD * 2;
  const outerH = contentH + GRID_PAD * 2;

  const gridStyle: CSSProperties = {
    width: contentW,
    height: contentH,
    gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
    padding: 'var(--grid-pad)',
    gap: 'var(--grid-gap)',
  };

  return { cellW, cellH, cols, rows, contentW, contentH, outerW, outerH, gridStyle };
}

export function boundsEqual(a: ActiveBounds, b: ActiveBounds) {
  return (
    a.minRow === b.minRow &&
    a.maxRow === b.maxRow &&
    a.minCol === b.minCol &&
    a.maxCol === b.maxCol &&
    a.rows === b.rows &&
    a.cols === b.cols
  );
}

export function isInteractive(target: HTMLElement) {
  const tag = target.tagName.toLowerCase();
  if (['input', 'select', 'textarea', 'button'].includes(tag)) return true;
  return !!target.closest('input,select,textarea,button,[contenteditable="true"]');
}

export const describePieceLocation = (piece: CurricularPiece) =>
  `fila ${piece.y + 1}, columna ${piece.x + 1}`;

export function findFirstFreeCell(
  cols: number,
  rows: number,
  pieces: CurricularPiece[],
) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!getCellAt({ grid: { cols, rows }, pieces }, { rowIndex: y, colIndex: x })) {
        return { x, y };
      }
    }
  }
  return null;
}

export function buildNormalizedInitialMalla(params: {
  initialMalla: MallaExport | undefined;
  repoId: string | null | undefined;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
}): NormalizedInitialMalla | null {
  const { initialMalla, repoId, template, visual, aspect } = params;
  if (!initialMalla) {
    return null;
  }

  const nextGrid = {
    cols: initialMalla.grid?.cols ?? 5,
    rows: initialMalla.grid?.rows ?? 5,
  };
  const sourceMasters = initialMalla.masters ?? {};
  let nextMasters = { ...sourceMasters };
  if (repoId && !nextMasters[repoId]) {
    nextMasters = {
      ...nextMasters,
      [repoId]: { template, visual, aspect },
    };
  }
  const nextPieces = (initialMalla.pieces ?? []).slice();
  const nextValues = { ...(initialMalla.values ?? {}) };
  const nextFloating = (initialMalla.floatingPieces ?? []).slice();
  const fallbackActiveId = initialMalla.activeMasterId ?? Object.keys(nextMasters)[0] ?? '';
  const nextActiveId = repoId ?? fallbackActiveId;
  const nextTheme = normalizeProjectTheme(initialMalla.theme);
  const nextMetaPanel = normalizeMetaPanelConfig(initialMalla.metaPanel);

  const project: MallaExport = {
    version: MALLA_SCHEMA_VERSION,
    masters: nextMasters,
    grid: nextGrid,
    pieces: nextPieces,
    values: nextValues,
    floatingPieces: nextFloating,
    activeMasterId: nextActiveId,
    repository: initialMalla.repository ?? {},
    theme: nextTheme,
    metaPanel: nextMetaPanel,
  };

  return {
    project,
    masters: nextMasters,
    grid: nextGrid,
    pieces: nextPieces,
    values: nextValues,
    floatingPieces: nextFloating,
    activeMasterId: nextActiveId,
    theme: nextTheme,
    metaPanel: nextMetaPanel,
  };
}
