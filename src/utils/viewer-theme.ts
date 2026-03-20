import type { CSSProperties } from 'react';
import type {
  MallaSnapshot,
  MallaSnapshotCell,
  SnapshotBandCell,
} from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import { getCellSizeByAspect } from '../components/BlockSnapshot.tsx';

export const VIEWER_THEME_STORAGE_KEY = 'viewerThemeLastUsed';
export const VIEWER_MIN_ZOOM = 0.5;
export const VIEWER_MAX_ZOOM = 2;
export const VIEWER_ZOOM_STEP = 0.1;
export const VIEWER_THEME_MIN_TITLE_FONT_SIZE = 16;
export const VIEWER_THEME_MAX_TITLE_FONT_SIZE = 40;
export const VIEWER_THEME_TITLE_FONT_SIZE_STEP = 1;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const createDefaultViewerTheme = (): ViewerTheme => ({
  gapX: 16,
  gapY: 16,
  minColumnWidth: 0,
  minRowHeight: 0,
  cellPadding: 0,
  blockBorderWidth: 1,
  blockBorderRadius: 8,
  typographyScale: 1,
  showTitle: false,
  titleText: '',
  titleFontSize: 24,
  headerText: '',
  footerText: '',
  showHeaderFooter: true,
});

export const normalizeViewerTheme = (value: unknown): ViewerTheme => {
  const defaults = createDefaultViewerTheme();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const source = value as Partial<ViewerTheme>;
  return {
    gapX: clamp(Number(source.gapX ?? defaults.gapX), 0, 96),
    gapY: clamp(Number(source.gapY ?? defaults.gapY), 0, 96),
    minColumnWidth: clamp(Number(source.minColumnWidth ?? defaults.minColumnWidth), 0, 500),
    minRowHeight: clamp(Number(source.minRowHeight ?? defaults.minRowHeight), 0, 500),
    cellPadding: clamp(Number(source.cellPadding ?? defaults.cellPadding), 0, 32),
    blockBorderWidth: clamp(Number(source.blockBorderWidth ?? defaults.blockBorderWidth), 0, 8),
    blockBorderRadius: clamp(Number(source.blockBorderRadius ?? defaults.blockBorderRadius), 0, 32),
    typographyScale: clamp(Number(source.typographyScale ?? defaults.typographyScale), 0.5, 2),
    showTitle: source.showTitle === true,
    titleText: typeof source.titleText === 'string' ? source.titleText : defaults.titleText,
    titleFontSize: clamp(
      Number(source.titleFontSize ?? defaults.titleFontSize),
      VIEWER_THEME_MIN_TITLE_FONT_SIZE,
      VIEWER_THEME_MAX_TITLE_FONT_SIZE,
    ),
    headerText: typeof source.headerText === 'string' ? source.headerText : defaults.headerText,
    footerText: typeof source.footerText === 'string' ? source.footerText : defaults.footerText,
    showHeaderFooter: source.showHeaderFooter !== false,
  };
};

export interface ViewerRenderCell extends MallaSnapshotCell {
  style: MallaSnapshotCell['style'] & {
    fontSizePx: number;
    paddingX: number;
    paddingY: number;
  };
}

export interface ViewerRenderItem {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gridStyle: CSSProperties;
  cells: ViewerRenderCell[];
}

export interface ViewerRenderBandCell extends SnapshotBandCell {
  left: number;
  width: number;
  style: SnapshotBandCell['style'] & {
    fontSizePx: number;
    paddingX: number;
    paddingY: number;
  };
}

export interface ViewerRenderBandRow {
  id: string;
  kind: 'header' | 'metric';
  top: number;
  height: number;
  cells: ViewerRenderBandCell[];
}

export interface ViewerRenderModel {
  projectName: string;
  gridRows: number;
  gridCols: number;
  width: number;
  height: number;
  columnWidths: number[];
  rowHeights: number[];
  colOffsets: number[];
  rowOffsets: number[];
  bandsHeight: number;
  bandsRenderRows: ViewerRenderBandRow[];
  items: ViewerRenderItem[];
  theme: ViewerTheme;
}

const normalizeCellPadding = (value: number) => clamp(Math.round(value), 0, 32);

const scaleCellStyle = (cell: MallaSnapshotCell, theme: ViewerTheme): ViewerRenderCell => {
  const extraPadding = normalizeCellPadding(theme.cellPadding);
  const nextPaddingX = clamp(cell.style.paddingX + extraPadding, 0, 64);
  const nextPaddingY = clamp(cell.style.paddingY + extraPadding, 0, 64);
  const nextFontSize = clamp(cell.style.fontSizePx * theme.typographyScale, 8, 96);
  return {
    ...cell,
    style: {
      ...cell.style,
      paddingX: nextPaddingX,
      paddingY: nextPaddingY,
      fontSizePx: nextFontSize,
    },
  };
};

const scaleBandCellStyle = (cell: SnapshotBandCell, theme: ViewerTheme): ViewerRenderBandCell => {
  const extraPadding = normalizeCellPadding(theme.cellPadding);
  const nextPaddingX = clamp(cell.style.paddingX + extraPadding, 0, 64);
  const nextPaddingY = clamp(cell.style.paddingY + extraPadding, 0, 64);
  const nextFontSize = clamp(cell.style.fontSizePx * theme.typographyScale, 8, 96);
  return {
    ...cell,
    style: {
      ...cell.style,
      paddingX: nextPaddingX,
      paddingY: nextPaddingY,
      fontSizePx: nextFontSize,
    },
    left: 0,
    width: 0,
  };
};

export const applyViewerTheme = (
  snapshot: MallaSnapshot,
  inputTheme: ViewerTheme,
): ViewerRenderModel => {
  const theme = normalizeViewerTheme(inputTheme);
  const measuredPieces = snapshot.items.map((item) => {
    const { cellW, cellH } = getCellSizeByAspect(item.aspect as '1/1' | '1/2' | '2/1');
    const pieceWidth = item.cols * cellW + Math.max(0, item.cols - 1) * 2 + 8;
    const pieceHeight = item.rows * cellH + Math.max(0, item.rows - 1) * 2 + 8;
    return { item, cellW, cellH, pieceWidth, pieceHeight };
  });

  const colWidths = Array.from({ length: snapshot.grid.cols }, () => 0);
  const rowHeights = Array.from({ length: snapshot.grid.rows }, () => 0);
  for (const piece of measuredPieces) {
    if (piece.item.col >= 0 && piece.item.col < colWidths.length) {
      colWidths[piece.item.col] = Math.max(colWidths[piece.item.col] ?? 0, piece.pieceWidth);
    }
    if (piece.item.row >= 0 && piece.item.row < rowHeights.length) {
      rowHeights[piece.item.row] = Math.max(rowHeights[piece.item.row] ?? 0, piece.pieceHeight);
    }
  }
  for (let i = 0; i < colWidths.length; i += 1) {
    colWidths[i] = Math.max(colWidths[i] ?? 0, theme.minColumnWidth);
  }
  for (let i = 0; i < rowHeights.length; i += 1) {
    rowHeights[i] = Math.max(rowHeights[i] ?? 0, theme.minRowHeight);
  }

  const colOffsets = Array.from({ length: snapshot.grid.cols }, () => 0);
  for (let i = 1; i < colOffsets.length; i += 1) {
    colOffsets[i] = colOffsets[i - 1]! + (colWidths[i - 1] ?? 0) + theme.gapX;
  }
  const rowOffsets = Array.from({ length: snapshot.grid.rows }, () => 0);
  for (let i = 1; i < rowOffsets.length; i += 1) {
    rowOffsets[i] = rowOffsets[i - 1]! + (rowHeights[i - 1] ?? 0) + theme.gapY;
  }

  const width = colWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, colWidths.length - 1) * theme.gapX;
  const gridHeight = rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rowHeights.length - 1) * theme.gapY;

  const bandsRenderRows: ViewerRenderBandRow[] = [];
  let currentBandTop = 0;
  const headerRows = snapshot.bands?.headers?.rows ?? [];
  for (const row of headerRows) {
    const cells = row.cells.map((cell) => {
      const scaled = scaleBandCellStyle(cell, theme);
      const col = Math.max(0, Math.min(colOffsets.length - 1, cell.col));
      return {
        ...scaled,
        left: colOffsets[col] ?? 0,
        width: colWidths[col] ?? 0,
      };
    });
    bandsRenderRows.push({
      id: row.id,
      kind: 'header',
      top: currentBandTop,
      height: 28,
      cells,
    });
    currentBandTop += 28;
  }
  const metricRows = snapshot.bands?.metrics?.rows ?? [];
  for (const row of metricRows) {
    const cells = row.cells.map((cell) => {
      const scaled = scaleBandCellStyle(cell, theme);
      const col = Math.max(0, Math.min(colOffsets.length - 1, cell.col));
      return {
        ...scaled,
        left: colOffsets[col] ?? 0,
        width: colWidths[col] ?? 0,
      };
    });
    bandsRenderRows.push({
      id: row.id,
      kind: 'metric',
      top: currentBandTop,
      height: 30,
      cells,
    });
    currentBandTop += 30;
  }
  const bandsHeight = currentBandTop;
  const height = bandsHeight + gridHeight;

  const items: ViewerRenderItem[] = measuredPieces.map(({ item, cellW, cellH, pieceWidth, pieceHeight }) => {
    const pieceCells = item.cells.map((cell) => scaleCellStyle(cell, theme));

    return {
      id: item.id,
      left: colOffsets[item.col] ?? 0,
      top: bandsHeight + (rowOffsets[item.row] ?? 0),
      width: pieceWidth,
      height: pieceHeight,
      cols: item.cols,
      rows: item.rows,
      cellWidth: cellW,
      cellHeight: cellH,
      gridStyle: {
        width: item.cols * cellW + Math.max(0, item.cols - 1) * 2,
        height: item.rows * cellH + Math.max(0, item.rows - 1) * 2,
        gridTemplateColumns: `repeat(${item.cols}, ${cellW}px)`,
        gridTemplateRows: `repeat(${item.rows}, ${cellH}px)`,
        gap: '2px',
        padding: '4px',
      },
      cells: pieceCells,
    };
  });

  return {
    projectName: snapshot.projectName,
    gridRows: snapshot.grid.rows,
    gridCols: snapshot.grid.cols,
    width,
    height,
    columnWidths: colWidths,
    rowHeights,
    colOffsets,
    rowOffsets,
    bandsHeight,
    bandsRenderRows,
    items,
    theme,
  };
};
