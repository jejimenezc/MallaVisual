import type { CurricularPiece, CurricularPieceRef, CurricularPieceSnapshot } from '../types/curricular';
import type { MallaExport } from './malla-io';

export interface MallaCellCoord {
  rowIndex: number;
  colIndex: number;
}

export interface MallaCellEntry {
  coord: MallaCellCoord;
  content: CurricularPieceRef | CurricularPieceSnapshot;
}

export type MallaCellContent = CurricularPieceRef | CurricularPieceSnapshot | null;

export type NormalizedCellContent =
  | { kind: 'empty'; piece: null }
  | { kind: 'ref'; piece: CurricularPieceRef }
  | { kind: 'snapshot'; piece: CurricularPieceSnapshot };

export type MallaQuerySource = Pick<MallaExport, 'grid' | 'pieces'>;

const isValidIndex = (index: number, limit: number) => Number.isInteger(index) && index >= 0 && index < limit;

export const isPieceRef = (piece: CurricularPiece): piece is CurricularPieceRef => piece.kind === 'ref';

export const isPieceSnapshot = (piece: CurricularPiece): piece is CurricularPieceSnapshot =>
  piece.kind === 'snapshot';

export const normalizeCellContent = (content: MallaCellContent): NormalizedCellContent => {
  if (!content) {
    return { kind: 'empty', piece: null };
  }
  if (isPieceRef(content)) {
    return { kind: 'ref', piece: content };
  }
  return { kind: 'snapshot', piece: content };
};

export const getCellAt = (malla: MallaQuerySource, coord: MallaCellCoord): MallaCellContent => {
  const grid = malla.grid;
  if (!grid) return null;
  if (!isValidIndex(coord.colIndex, grid.cols) || !isValidIndex(coord.rowIndex, grid.rows)) {
    return null;
  }
  const pieces = malla.pieces ?? [];
  const found = pieces.find((piece) => piece.x === coord.colIndex && piece.y === coord.rowIndex) ?? null;
  return found as MallaCellContent;
};

export const getColumnCells = (malla: MallaQuerySource, colIndex: number): MallaCellEntry[] => {
  const grid = malla.grid;
  if (!grid || !isValidIndex(colIndex, grid.cols)) return [];

  const pieces = malla.pieces ?? [];
  return pieces
    .filter((piece) => piece.x === colIndex && isValidIndex(piece.y, grid.rows))
    .sort((a, b) => a.y - b.y)
    .map((piece) => ({
      coord: { rowIndex: piece.y, colIndex: piece.x },
      content: piece,
    }));
};

export const getRowCells = (malla: MallaQuerySource, rowIndex: number): MallaCellEntry[] => {
  const grid = malla.grid;
  if (!grid || !isValidIndex(rowIndex, grid.rows)) return [];

  const pieces = malla.pieces ?? [];
  return pieces
    .filter((piece) => piece.y === rowIndex && isValidIndex(piece.x, grid.cols))
    .sort((a, b) => a.x - b.x)
    .map((piece) => ({
      coord: { rowIndex: piece.y, colIndex: piece.x },
      content: piece,
    }));
};
