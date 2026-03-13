import type { ViewerRenderModel } from './viewer-theme.ts';

export type ViewerPanelMode = 'preview' | 'print-preview';
export type ViewerPrintPaperSize = 'A2' | 'A3' | 'carta' | 'oficio';
export type ViewerPrintOrientation = 'portrait' | 'landscape';
export type ViewerPrintMargins = 'narrow' | 'normal' | 'wide';

export interface ViewerPrintSettings {
  paperSize: ViewerPrintPaperSize;
  orientation: ViewerPrintOrientation;
  scale: number;
  margins: ViewerPrintMargins;
  showDocumentTitle: boolean;
}

export interface ViewerResolvedPageMetrics {
  paperWidthMm: number;
  paperHeightMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  contentScale: number;
}

export interface ViewerMeasuredPxPerMm {
  pxPerMmX: number;
  pxPerMmY: number;
}

export interface ViewerPreviewPageMetrics extends ViewerResolvedPageMetrics {
  paperWidthPx: number;
  paperHeightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
}

export interface ViewerPreviewCssVars {
  '--viewer-preview-paper-width-px': string;
  '--viewer-preview-paper-height-px': string;
  '--viewer-preview-content-width-px': string;
  '--viewer-preview-content-height-px': string;
  '--viewer-preview-paper-padding-top-px': string;
  '--viewer-preview-paper-padding-right-px': string;
  '--viewer-preview-paper-padding-bottom-px': string;
  '--viewer-preview-paper-padding-left-px': string;
}

export interface ViewerPrintCssVars {
  '--print-paper-width-mm': string;
  '--print-paper-height-mm': string;
  '--print-margin-top-mm': string;
  '--print-margin-right-mm': string;
  '--print-margin-bottom-mm': string;
  '--print-margin-left-mm': string;
  '--print-content-width-mm': string;
  '--print-content-height-mm': string;
}

export interface ViewerPaginatedSurfaceLayout {
  paperWidthPx: number;
  paperHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
  paperPaddingPx: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scaledSurfaceWidthPx: number;
  scaledSurfaceHeightPx: number;
}

export interface ViewerPageSliceLayout {
  viewportWidthPx: number;
  viewportHeightPx: number;
  surfaceWidthPx: number;
  surfaceHeightPx: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewerContentPlacementMetrics {
  baseContentWidthPx: number;
  baseContentHeightPx: number;
  scaledContentWidthPx: number;
  scaledContentHeightPx: number;
  scale: number;
  overflowsHorizontally: boolean;
  overflowsVertically: boolean;
}

export interface ViewerPaginationTile {
  pageNumber: number;
  row: number;
  col: number;
  offsetX: number;
  offsetY: number;
  sliceWidthPx: number;
  sliceHeightPx: number;
}

export interface ViewerPaginationCutGuides {
  cutGuidesX: number[];
  cutGuidesY: number[];
}

export interface ViewerPaginationRefinementPolicy {
  refineAxisX: boolean;
  refineAxisY: boolean;
}

export interface ViewerAxisYLineSegment {
  rowIndex: number;
  startPx: number;
  endPx: number;
  heightPx: number;
}

export interface ViewerAxisXColumnSegment {
  colIndex: number;
  startPx: number;
  endPx: number;
  widthPx: number;
  source: 'grid' | 'band' | 'merged-band';
}

export interface ViewerPaginationGridMetrics {
  scaledContentWidthPx: number;
  scaledContentHeightPx: number;
  usablePageWidthPx: number;
  usablePageHeightPx: number;
  pagesX: number;
  pagesY: number;
  pageCount: number;
  tiles: ViewerPaginationTile[];
  hasHorizontalPagination: boolean;
  hasVerticalPagination: boolean;
  cutGuides: ViewerPaginationCutGuides;
  refinementPolicy: ViewerPaginationRefinementPolicy;
  axisXColumnSegments: ViewerAxisXColumnSegment[];
  axisYLineSegments: ViewerAxisYLineSegment[];
}

export interface ViewerPrintedPage {
  pageNumber: number;
  sourceTilePageNumber: number;
  tileRow: number;
  tileCol: number;
  printOffsetX: number;
  printOffsetY: number;
  sliceWidthPx: number;
  sliceHeightPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  isLastColumn: boolean;
  isLastRow: boolean;
}

export interface ViewerVerticalPaginationMetrics {
  pageCount: number;
  pageOffsetsPx: number[];
  pageSliceHeightsPx: number[];
  pageHeightPx: number;
  lastPageContentHeightPx: number;
  hasPartialLastPage: boolean;
  hasVerticalPagination: boolean;
}

export type ViewerPrintableTextBlock = 'header' | 'title' | 'grid' | 'footer';

export interface ViewerPrintableTextLayoutInput {
  showHeaderFooter: boolean;
  headerText: string;
  footerText: string;
  showDocumentTitle: boolean;
  projectName: string;
}

export interface ViewerPrintableTextLayout {
  headerText: string;
  documentTitle: string;
  footerText: string;
  blockOrder: ViewerPrintableTextBlock[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const VIEWER_PAGINATION_SNAP_TOLERANCE_RATIO = 0.18;
const VIEWER_PAGINATION_SNAP_TOLERANCE_MAX_PX = 96;

const normalizeCutGuideList = (values: number[], totalSizePx: number): number[] => {
  const total = Math.max(0, Math.round(totalSizePx));
  const unique = new Set<number>();
  unique.add(0);
  unique.add(total);
  for (const value of values) {
    const rounded = Math.round(value);
    if (!Number.isFinite(rounded)) continue;
    unique.add(clamp(rounded, 0, total));
  }
  return [...unique].sort((left, right) => left - right);
};

const resolveViewerPaginationSnapTolerancePx = (usablePageSizePx: number): number =>
  Math.max(0, Math.min(VIEWER_PAGINATION_SNAP_TOLERANCE_MAX_PX, Math.round(usablePageSizePx * VIEWER_PAGINATION_SNAP_TOLERANCE_RATIO)));

export const resolveViewerGridCutGuides = (input: {
  renderModel: ViewerRenderModel;
  scale: number;
}): ViewerPaginationCutGuides => {
  const scale = Number.isFinite(input.scale) && input.scale > 0 ? input.scale : 1;
  const scaledWidthPx = Math.max(0, Math.round(input.renderModel.width * scale));
  const scaledHeightPx = Math.max(0, Math.round(input.renderModel.height * scale));
  const cutGuidesX = input.renderModel.colOffsets.map(
    (offset, index) => (offset + (input.renderModel.columnWidths[index] ?? 0)) * scale,
  );
  const cutGuidesY = [
    ...input.renderModel.bandsRenderRows.map((row) => (row.top + row.height) * scale),
    ...input.renderModel.rowOffsets.map(
      (offset, index) => (input.renderModel.bandsHeight + offset + (input.renderModel.rowHeights[index] ?? 0)) * scale,
    ),
  ];

  return {
    cutGuidesX: normalizeCutGuideList(cutGuidesX, scaledWidthPx),
    cutGuidesY: normalizeCutGuideList(cutGuidesY, scaledHeightPx),
  };
};

export const resolveViewerAxisYLineSegments = (input: {
  renderModel: ViewerRenderModel;
  scale: number;
}): ViewerAxisYLineSegment[] => {
  const scale = Number.isFinite(input.scale) && input.scale > 0 ? input.scale : 1;
  const totalHeightPx = Math.max(0, Math.round(input.renderModel.height * scale));

  return input.renderModel.rowOffsets
    .map((offset, rowIndex) => {
      const startPx = clamp(Math.round((input.renderModel.bandsHeight + offset) * scale), 0, totalHeightPx);
      const endPx = clamp(
        Math.round((input.renderModel.bandsHeight + offset + (input.renderModel.rowHeights[rowIndex] ?? 0)) * scale),
        0,
        totalHeightPx,
      );
      return {
        rowIndex,
        startPx,
        endPx,
        heightPx: Math.max(0, endPx - startPx),
      };
    })
    .filter((segment) => segment.endPx > segment.startPx);
};

export const resolveViewerAxisXColumnSegments = (input: {
  renderModel: ViewerRenderModel;
  scale: number;
}): ViewerAxisXColumnSegment[] => {
  const scale = Number.isFinite(input.scale) && input.scale > 0 ? input.scale : 1;
  const totalWidthPx = Math.max(0, Math.round(input.renderModel.width * scale));
  const segments = new Map<string, ViewerAxisXColumnSegment>();

  input.renderModel.colOffsets.forEach((offset, colIndex) => {
    const startPx = clamp(Math.round(offset * scale), 0, totalWidthPx);
    const endPx = clamp(
      Math.round((offset + (input.renderModel.columnWidths[colIndex] ?? 0)) * scale),
      0,
      totalWidthPx,
    );
    if (endPx <= startPx) return;
    segments.set(`${startPx}:${endPx}`, {
      colIndex,
      startPx,
      endPx,
      widthPx: Math.max(0, endPx - startPx),
      source: 'grid',
    });
  });

  input.renderModel.bandsRenderRows.forEach((row) => {
    row.cells.forEach((cell) => {
      const startPx = clamp(Math.round(cell.left * scale), 0, totalWidthPx);
      const endPx = clamp(Math.round((cell.left + cell.width) * scale), 0, totalWidthPx);
      if (endPx <= startPx) return;
      const key = `${startPx}:${endPx}`;
      if (segments.has(key)) return;
      segments.set(key, {
        colIndex: cell.col,
        startPx,
        endPx,
        widthPx: Math.max(0, endPx - startPx),
        source: 'band',
      });
    });
  });

  return [...segments.values()].sort(
    (left, right) =>
      left.startPx - right.startPx ||
      left.endPx - right.endPx ||
      left.colIndex - right.colIndex,
  );
};

export const resolveViewerPaginationAxisCuts = (input: {
  totalSizePx: number;
  usablePageSizePx: number;
  cutGuidesPx?: number[];
  enableGuideSnapping?: boolean;
}): { offsetsPx: number[]; sliceSizesPx: number[] } => {
  const totalSizePx = Math.max(0, Math.round(input.totalSizePx));
  const usablePageSizePx = Math.max(1, Math.round(input.usablePageSizePx));
  const cutGuidesPx = normalizeCutGuideList(input.cutGuidesPx ?? [], totalSizePx);
  const enableGuideSnapping = input.enableGuideSnapping !== false;

  if (totalSizePx <= usablePageSizePx) {
    return {
      offsetsPx: [0],
      sliceSizesPx: [totalSizePx === 0 ? usablePageSizePx : totalSizePx],
    };
  }

  const snapTolerancePx = resolveViewerPaginationSnapTolerancePx(usablePageSizePx);
  const offsetsPx: number[] = [];
  const sliceSizesPx: number[] = [];
  let offsetPx = 0;

  while (offsetPx < totalSizePx) {
    offsetsPx.push(offsetPx);
    const nominalEndPx = Math.min(totalSizePx, offsetPx + usablePageSizePx);
    let refinedEndPx = nominalEndPx;

    if (enableGuideSnapping && nominalEndPx < totalSizePx && snapTolerancePx > 0) {
      const snappedGuidePx = [...cutGuidesPx]
        .reverse()
        .find((guidePx) => guidePx > offsetPx && guidePx <= nominalEndPx && guidePx >= nominalEndPx - snapTolerancePx);
      if (snappedGuidePx !== undefined) {
        refinedEndPx = snappedGuidePx;
      }
    }

    const sliceSizePx =
      refinedEndPx >= totalSizePx
        ? Math.max(1, totalSizePx - offsetPx)
        : Math.max(1, Math.min(usablePageSizePx, refinedEndPx - offsetPx));
    sliceSizesPx.push(sliceSizePx);
    offsetPx += sliceSizePx;
  }

  return { offsetsPx, sliceSizesPx };
};

export const resolveViewerProtectedAxisYCuts = (input: {
  totalSizePx: number;
  usablePageSizePx: number;
  lineSegmentsY: ViewerAxisYLineSegment[];
  cutGuidesY?: number[];
  enableGuideSnapping?: boolean;
}): { offsetsPx: number[]; sliceSizesPx: number[] } => {
  const totalSizePx = Math.max(0, Math.round(input.totalSizePx));
  const usablePageSizePx = Math.max(1, Math.round(input.usablePageSizePx));
  const normalizedSegments = [...input.lineSegmentsY]
    .map((segment) => {
      const startPx = clamp(Math.round(segment.startPx), 0, totalSizePx);
      const endPx = clamp(Math.round(segment.endPx), 0, totalSizePx);
      return {
        rowIndex: segment.rowIndex,
        startPx,
        endPx,
        heightPx: Math.max(0, endPx - startPx),
      };
    })
    .filter((segment) => segment.endPx > segment.startPx)
    .sort((left, right) => left.startPx - right.startPx || left.endPx - right.endPx);

  if (normalizedSegments.length === 0) {
    return resolveViewerPaginationAxisCuts({
      totalSizePx,
      usablePageSizePx,
      cutGuidesPx: input.cutGuidesY,
      enableGuideSnapping: input.enableGuideSnapping,
    });
  }

  if (totalSizePx <= usablePageSizePx) {
    return {
      offsetsPx: [0],
      sliceSizesPx: [totalSizePx === 0 ? usablePageSizePx : totalSizePx],
    };
  }

  const guideFallbackCuts = resolveViewerPaginationAxisCuts({
    totalSizePx,
    usablePageSizePx,
    cutGuidesPx: input.cutGuidesY,
    enableGuideSnapping: input.enableGuideSnapping,
  });
  const offsetsPx: number[] = [];
  const sliceSizesPx: number[] = [];
  let offsetPx = 0;

  while (offsetPx < totalSizePx) {
    offsetsPx.push(offsetPx);
    const nominalEndPx = Math.min(totalSizePx, offsetPx + usablePageSizePx);
    if (nominalEndPx >= totalSizePx) {
      sliceSizesPx.push(Math.max(1, totalSizePx - offsetPx));
      break;
    }

    const containingSegment = normalizedSegments.find(
      (segment) => segment.startPx < nominalEndPx && segment.endPx > nominalEndPx,
    );

    if (!containingSegment) {
      const fallbackIndex = offsetsPx.length - 1;
      const fallbackSliceSizePx = guideFallbackCuts.sliceSizesPx[fallbackIndex];
      if (fallbackSliceSizePx !== undefined) {
        sliceSizesPx.push(Math.max(1, fallbackSliceSizePx));
        offsetPx += Math.max(1, fallbackSliceSizePx);
        continue;
      }
      const geometricSliceSizePx = Math.max(1, nominalEndPx - offsetPx);
      sliceSizesPx.push(geometricSliceSizePx);
      offsetPx += geometricSliceSizePx;
      continue;
    }

    if (containingSegment.heightPx > usablePageSizePx) {
      const fallbackIndex = offsetsPx.length - 1;
      const fallbackSliceSizePx = guideFallbackCuts.sliceSizesPx[fallbackIndex] ?? Math.max(1, nominalEndPx - offsetPx);
      sliceSizesPx.push(Math.max(1, fallbackSliceSizePx));
      offsetPx += Math.max(1, fallbackSliceSizePx);
      continue;
    }

    const protectedEndPx = normalizedSegments
      .filter((segment) => segment.endPx > offsetPx && segment.endPx <= nominalEndPx)
      .map((segment) => segment.endPx)
      .at(-1);

    if (protectedEndPx !== undefined) {
      const protectedSliceSizePx = Math.max(1, protectedEndPx - offsetPx);
      sliceSizesPx.push(protectedSliceSizePx);
      offsetPx += protectedSliceSizePx;
      continue;
    }

    const segmentAwareEndPx = Math.max(containingSegment.endPx, nominalEndPx);
    const segmentAwareSliceSizePx = Math.max(1, segmentAwareEndPx - offsetPx);
    sliceSizesPx.push(segmentAwareSliceSizePx);
    offsetPx += segmentAwareSliceSizePx;
  }

  return { offsetsPx, sliceSizesPx };
};

export const resolveViewerProtectedAxisXCuts = (input: {
  totalSizePx: number;
  usablePageSizePx: number;
  columnSegmentsX: ViewerAxisXColumnSegment[];
  cutGuidesX?: number[];
  enableGuideSnapping?: boolean;
}): { offsetsPx: number[]; sliceSizesPx: number[] } => {
  const totalSizePx = Math.max(0, Math.round(input.totalSizePx));
  const usablePageSizePx = Math.max(1, Math.round(input.usablePageSizePx));
  const normalizedSegments = [...input.columnSegmentsX]
    .map((segment) => {
      const startPx = clamp(Math.round(segment.startPx), 0, totalSizePx);
      const endPx = clamp(Math.round(segment.endPx), 0, totalSizePx);
      return {
        colIndex: segment.colIndex,
        startPx,
        endPx,
        widthPx: Math.max(0, endPx - startPx),
        source: segment.source,
      };
    })
    .filter((segment) => segment.endPx > segment.startPx)
    .sort((left, right) => left.startPx - right.startPx || left.endPx - right.endPx || left.colIndex - right.colIndex);

  if (normalizedSegments.length === 0) {
    return resolveViewerPaginationAxisCuts({
      totalSizePx,
      usablePageSizePx,
      cutGuidesPx: input.cutGuidesX,
      enableGuideSnapping: input.enableGuideSnapping,
    });
  }

  if (totalSizePx <= usablePageSizePx) {
    return {
      offsetsPx: [0],
      sliceSizesPx: [totalSizePx === 0 ? usablePageSizePx : totalSizePx],
    };
  }

  const guideFallbackCuts = resolveViewerPaginationAxisCuts({
    totalSizePx,
    usablePageSizePx,
    cutGuidesPx: input.cutGuidesX,
    enableGuideSnapping: input.enableGuideSnapping,
  });
  const offsetsPx: number[] = [];
  const sliceSizesPx: number[] = [];
  let offsetPx = 0;

  while (offsetPx < totalSizePx) {
    offsetsPx.push(offsetPx);
    const nominalEndPx = Math.min(totalSizePx, offsetPx + usablePageSizePx);

    if (nominalEndPx >= totalSizePx) {
      sliceSizesPx.push(Math.max(1, totalSizePx - offsetPx));
      break;
    }

    const containingSegment = normalizedSegments.find(
      (segment) => segment.startPx < nominalEndPx && segment.endPx > nominalEndPx,
    );

    if (!containingSegment) {
      const fallbackIndex = offsetsPx.length - 1;
      const fallbackSliceSizePx = guideFallbackCuts.sliceSizesPx[fallbackIndex];
      if (fallbackSliceSizePx !== undefined) {
        sliceSizesPx.push(Math.max(1, fallbackSliceSizePx));
        offsetPx += Math.max(1, fallbackSliceSizePx);
        continue;
      }
      const geometricSliceSizePx = Math.max(1, nominalEndPx - offsetPx);
      sliceSizesPx.push(geometricSliceSizePx);
      offsetPx += geometricSliceSizePx;
      continue;
    }

    if (containingSegment.widthPx > usablePageSizePx) {
      const fallbackIndex = offsetsPx.length - 1;
      const fallbackSliceSizePx = guideFallbackCuts.sliceSizesPx[fallbackIndex] ?? Math.max(1, nominalEndPx - offsetPx);
      sliceSizesPx.push(Math.max(1, fallbackSliceSizePx));
      offsetPx += Math.max(1, fallbackSliceSizePx);
      continue;
    }

    const protectedEndPx = normalizedSegments
      .filter((segment) => segment.endPx > offsetPx && segment.endPx <= nominalEndPx)
      .map((segment) => segment.endPx)
      .at(-1);

    if (protectedEndPx !== undefined) {
      const protectedSliceSizePx = Math.max(1, protectedEndPx - offsetPx);
      sliceSizesPx.push(protectedSliceSizePx);
      offsetPx += protectedSliceSizePx;
      continue;
    }

    const segmentAwareSliceSizePx = Math.max(1, containingSegment.endPx - offsetPx);
    sliceSizesPx.push(segmentAwareSliceSizePx);
    offsetPx += segmentAwareSliceSizePx;
  }

  return { offsetsPx, sliceSizesPx };
};

export const VIEWER_PRINT_MIN_SCALE = 0.5;
export const VIEWER_PRINT_MAX_SCALE = 1.5;
export const VIEWER_PRINT_SCALE_STEP = 0.05;
export const VIEWER_PRINT_MM_TO_PX = 3.7795;

const PAPER_MM: Record<ViewerPrintPaperSize, { width: number; height: number }> = {
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  carta: { width: 215.9, height: 279.4 },
  oficio: { width: 215.9, height: 330 },
};

const MARGINS_MM: Record<ViewerPrintMargins, number> = {
  narrow: 8,
  normal: 12,
  wide: 18,
};

export const createDefaultViewerPrintSettings = (): ViewerPrintSettings => ({
  paperSize: 'A3',
  orientation: 'portrait',
  scale: 1,
  margins: 'normal',
  showDocumentTitle: false,
});

export const createDefaultViewerMeasuredPxPerMm = (): ViewerMeasuredPxPerMm => ({
  pxPerMmX: VIEWER_PRINT_MM_TO_PX,
  pxPerMmY: VIEWER_PRINT_MM_TO_PX,
});

export const normalizeViewerMeasuredPxPerMm = (value: unknown): ViewerMeasuredPxPerMm => {
  const defaults = createDefaultViewerMeasuredPxPerMm();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }
  const source = value as Partial<ViewerMeasuredPxPerMm>;
  const pxPerMmX = Number(source.pxPerMmX);
  const pxPerMmY = Number(source.pxPerMmY);
  return {
    pxPerMmX: Number.isFinite(pxPerMmX) && pxPerMmX > 0 ? pxPerMmX : defaults.pxPerMmX,
    pxPerMmY: Number.isFinite(pxPerMmY) && pxPerMmY > 0 ? pxPerMmY : defaults.pxPerMmY,
  };
};

export const normalizeViewerPrintSettings = (value: unknown): ViewerPrintSettings => {
  const defaults = createDefaultViewerPrintSettings();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }
  const source = value as Partial<ViewerPrintSettings>;
  return {
    paperSize:
      source.paperSize === 'A2' ||
      source.paperSize === 'A3' ||
      source.paperSize === 'carta' ||
      source.paperSize === 'oficio'
        ? source.paperSize
        : defaults.paperSize,
    orientation: source.orientation === 'landscape' ? 'landscape' : defaults.orientation,
    scale: clamp(Number(source.scale ?? defaults.scale), VIEWER_PRINT_MIN_SCALE, VIEWER_PRINT_MAX_SCALE),
    margins: source.margins === 'narrow' || source.margins === 'wide' ? source.margins : defaults.margins,
    showDocumentTitle: source.showDocumentTitle === true,
  };
};

export const resolveViewerPanelMode = (isPrintPreview: boolean): ViewerPanelMode =>
  isPrintPreview ? 'print-preview' : 'preview';

export const resolveViewerPageMetrics = (
  settings: ViewerPrintSettings,
): ViewerResolvedPageMetrics => {
  const paper = PAPER_MM[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.height : paper.width;
  const paperHeightMm = isLandscape ? paper.width : paper.height;
  const marginMm = MARGINS_MM[settings.margins];
  const contentWidthMm = Math.max(paperWidthMm - marginMm * 2, 1);
  const contentHeightMm = Math.max(paperHeightMm - marginMm * 2, 1);

  return {
    paperWidthMm,
    paperHeightMm,
    marginTopMm: marginMm,
    marginRightMm: marginMm,
    marginBottomMm: marginMm,
    marginLeftMm: marginMm,
    contentWidthMm,
    contentHeightMm,
    contentScale: settings.scale,
  };
};

export const resolveViewerPreviewPageMetrics = (
  metrics: ViewerResolvedPageMetrics,
  measurement: ViewerMeasuredPxPerMm,
): ViewerPreviewPageMetrics => {
  const { pxPerMmX, pxPerMmY } = normalizeViewerMeasuredPxPerMm(measurement);
  return {
    ...metrics,
    paperWidthPx: Math.round(metrics.paperWidthMm * pxPerMmX),
    paperHeightPx: Math.round(metrics.paperHeightMm * pxPerMmY),
    marginTopPx: Math.round(metrics.marginTopMm * pxPerMmY),
    marginRightPx: Math.round(metrics.marginRightMm * pxPerMmX),
    marginBottomPx: Math.round(metrics.marginBottomMm * pxPerMmY),
    marginLeftPx: Math.round(metrics.marginLeftMm * pxPerMmX),
    contentWidthPx: Math.round(metrics.contentWidthMm * pxPerMmX),
    contentHeightPx: Math.round(metrics.contentHeightMm * pxPerMmY),
  };
};

export const resolveViewerPrintableLayoutModel = resolveViewerPageMetrics;

export const resolveViewerPrintCssVars = (
  metrics: ViewerResolvedPageMetrics,
): ViewerPrintCssVars => ({
  '--print-paper-width-mm': `${metrics.paperWidthMm}`,
  '--print-paper-height-mm': `${metrics.paperHeightMm}`,
  '--print-margin-top-mm': `${metrics.marginTopMm}`,
  '--print-margin-right-mm': `${metrics.marginRightMm}`,
  '--print-margin-bottom-mm': `${metrics.marginBottomMm}`,
  '--print-margin-left-mm': `${metrics.marginLeftMm}`,
  '--print-content-width-mm': `${metrics.contentWidthMm}`,
  '--print-content-height-mm': `${metrics.contentHeightMm}`,
});

export const resolveViewerPreviewCssVars = (
  metrics: ViewerPreviewPageMetrics,
): ViewerPreviewCssVars => ({
  '--viewer-preview-paper-width-px': `${metrics.paperWidthPx}px`,
  '--viewer-preview-paper-height-px': `${metrics.paperHeightPx}px`,
  '--viewer-preview-content-width-px': `${metrics.contentWidthPx}px`,
  '--viewer-preview-content-height-px': `${metrics.contentHeightPx}px`,
  '--viewer-preview-paper-padding-top-px': `${metrics.marginTopPx}px`,
  '--viewer-preview-paper-padding-right-px': `${metrics.marginRightPx}px`,
  '--viewer-preview-paper-padding-bottom-px': `${metrics.marginBottomPx}px`,
  '--viewer-preview-paper-padding-left-px': `${metrics.marginLeftPx}px`,
});

export const resolveViewerPaginatedSurfaceLayout = (input: {
  previewMetrics: ViewerPreviewPageMetrics;
  scaledSurfaceWidthPx: number;
  scaledSurfaceHeightPx: number;
}): ViewerPaginatedSurfaceLayout => ({
  paperWidthPx: Math.max(1, Math.round(input.previewMetrics.paperWidthPx)),
  paperHeightPx: Math.max(1, Math.round(input.previewMetrics.paperHeightPx)),
  contentWidthPx: Math.max(1, Math.round(input.previewMetrics.contentWidthPx)),
  contentHeightPx: Math.max(1, Math.round(input.previewMetrics.contentHeightPx)),
  paperPaddingPx: {
    top: Math.max(0, Math.round(input.previewMetrics.marginTopPx)),
    right: Math.max(0, Math.round(input.previewMetrics.marginRightPx)),
    bottom: Math.max(0, Math.round(input.previewMetrics.marginBottomPx)),
    left: Math.max(0, Math.round(input.previewMetrics.marginLeftPx)),
  },
  scaledSurfaceWidthPx: Math.max(1, Math.round(input.scaledSurfaceWidthPx)),
  scaledSurfaceHeightPx: Math.max(1, Math.round(input.scaledSurfaceHeightPx)),
});

export const resolveViewerPageSliceLayout = (input: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  surfaceWidthPx: number;
  surfaceHeightPx: number;
  offsetX: number;
  offsetY: number;
}): ViewerPageSliceLayout => ({
  viewportWidthPx: Math.max(1, Math.round(input.viewportWidthPx)),
  viewportHeightPx: Math.max(1, Math.round(input.viewportHeightPx)),
  surfaceWidthPx: Math.max(1, Math.round(input.surfaceWidthPx)),
  surfaceHeightPx: Math.max(1, Math.round(input.surfaceHeightPx)),
  offsetX: Math.max(0, Math.round(input.offsetX)),
  offsetY: Math.max(0, Math.round(input.offsetY)),
});

export const resolveViewerContentPlacementMetrics = (input: {
  baseContentWidthPx: number;
  baseContentHeightPx: number;
  previewContentWidthPx: number;
  previewContentHeightPx: number;
  scale: number;
}): ViewerContentPlacementMetrics => {
  const baseContentWidthPx = Math.max(1, Math.round(input.baseContentWidthPx));
  const baseContentHeightPx = Math.max(1, Math.round(input.baseContentHeightPx));
  const previewContentWidthPx = Math.max(1, Math.round(input.previewContentWidthPx));
  const previewContentHeightPx = Math.max(1, Math.round(input.previewContentHeightPx));
  const scale = Number.isFinite(input.scale)
    ? clamp(input.scale, VIEWER_PRINT_MIN_SCALE, VIEWER_PRINT_MAX_SCALE)
    : 1;
  const scaledContentWidthPx = Math.max(1, Math.round(baseContentWidthPx * scale));
  const scaledContentHeightPx = Math.max(1, Math.round(baseContentHeightPx * scale));

  return {
    baseContentWidthPx,
    baseContentHeightPx,
    scaledContentWidthPx,
    scaledContentHeightPx,
    scale,
    overflowsHorizontally: scaledContentWidthPx > previewContentWidthPx,
    overflowsVertically: scaledContentHeightPx > previewContentHeightPx,
  };
};

export const resolveViewerPaginationGridMetrics = (input: {
  scaledContentWidthPx: number;
  scaledContentHeightPx: number;
  usablePageWidthPx: number;
  usablePageHeightPx: number;
  cutGuides?: Partial<ViewerPaginationCutGuides>;
  axisXColumnSegments?: ViewerAxisXColumnSegment[];
  axisYLineSegments?: ViewerAxisYLineSegment[];
  refinementPolicy?: Partial<ViewerPaginationRefinementPolicy>;
}): ViewerPaginationGridMetrics => {
  const scaledContentWidthPx = Math.max(0, Math.round(input.scaledContentWidthPx));
  const scaledContentHeightPx = Math.max(0, Math.round(input.scaledContentHeightPx));
  const usablePageWidthPx = Math.max(1, Math.round(input.usablePageWidthPx));
  const usablePageHeightPx = Math.max(1, Math.round(input.usablePageHeightPx));
  const refinementPolicy: ViewerPaginationRefinementPolicy = {
    refineAxisX: input.refinementPolicy?.refineAxisX === true,
    refineAxisY: input.refinementPolicy?.refineAxisY !== false,
  };
  const cutGuides: ViewerPaginationCutGuides = {
    cutGuidesX: normalizeCutGuideList(input.cutGuides?.cutGuidesX ?? [], scaledContentWidthPx),
    cutGuidesY: normalizeCutGuideList(input.cutGuides?.cutGuidesY ?? [], scaledContentHeightPx),
  };
  const axisXColumnSegments = (input.axisXColumnSegments ?? [])
    .map((segment) => {
      const startPx = clamp(Math.round(segment.startPx), 0, scaledContentWidthPx);
      const endPx = clamp(Math.round(segment.endPx), 0, scaledContentWidthPx);
      return {
        colIndex: segment.colIndex,
        startPx,
        endPx,
        widthPx: Math.max(0, endPx - startPx),
        source: segment.source,
      };
    })
    .filter((segment) => segment.endPx > segment.startPx);
  const axisYLineSegments = (input.axisYLineSegments ?? [])
    .map((segment) => ({
      rowIndex: segment.rowIndex,
      startPx: clamp(Math.round(segment.startPx), 0, scaledContentHeightPx),
      endPx: clamp(Math.round(segment.endPx), 0, scaledContentHeightPx),
      heightPx: Math.max(0, Math.round(segment.heightPx)),
    }))
    .filter((segment) => segment.endPx > segment.startPx);
  const axisX =
    refinementPolicy.refineAxisX && axisXColumnSegments.length > 0
      ? resolveViewerProtectedAxisXCuts({
          totalSizePx: scaledContentWidthPx,
          usablePageSizePx: usablePageWidthPx,
          columnSegmentsX: axisXColumnSegments,
          cutGuidesX: cutGuides.cutGuidesX,
          enableGuideSnapping: true,
        })
      : resolveViewerPaginationAxisCuts({
          totalSizePx: scaledContentWidthPx,
          usablePageSizePx: usablePageWidthPx,
          cutGuidesPx: cutGuides.cutGuidesX,
          enableGuideSnapping: refinementPolicy.refineAxisX,
        });
  const axisY =
    refinementPolicy.refineAxisY && axisYLineSegments.length > 0
      ? resolveViewerProtectedAxisYCuts({
          totalSizePx: scaledContentHeightPx,
          usablePageSizePx: usablePageHeightPx,
          lineSegmentsY: axisYLineSegments,
          cutGuidesY: cutGuides.cutGuidesY,
          enableGuideSnapping: true,
        })
      : resolveViewerPaginationAxisCuts({
          totalSizePx: scaledContentHeightPx,
          usablePageSizePx: usablePageHeightPx,
          cutGuidesPx: cutGuides.cutGuidesY,
          enableGuideSnapping: refinementPolicy.refineAxisY,
        });
  const pagesX = Math.max(1, axisX.offsetsPx.length);
  const pagesY = Math.max(1, axisY.offsetsPx.length);
  const tiles: ViewerPaginationTile[] = [];

  for (let row = 0; row < pagesY; row += 1) {
    for (let col = 0; col < pagesX; col += 1) {
      const offsetX = axisX.offsetsPx[col] ?? 0;
      const offsetY = axisY.offsetsPx[row] ?? 0;

      tiles.push({
        pageNumber: tiles.length + 1,
        row,
        col,
        offsetX,
        offsetY,
        sliceWidthPx: axisX.sliceSizesPx[col] ?? usablePageWidthPx,
        sliceHeightPx: axisY.sliceSizesPx[row] ?? usablePageHeightPx,
      });
    }
  }

  return {
    scaledContentWidthPx,
    scaledContentHeightPx,
    usablePageWidthPx,
    usablePageHeightPx,
    pagesX,
    pagesY,
    pageCount: tiles.length,
    tiles,
    hasHorizontalPagination: pagesX > 1,
    hasVerticalPagination: pagesY > 1,
    cutGuides,
    refinementPolicy,
    axisXColumnSegments,
    axisYLineSegments,
  };
};

export const resolveViewerVerticalPaginationMetrics = (input: {
  scaledContentHeightPx: number;
  previewContentHeightPx: number;
  paginationGridMetrics?: ViewerPaginationGridMetrics;
}): ViewerVerticalPaginationMetrics => {
  const fallbackGridMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1,
    scaledContentHeightPx: input.scaledContentHeightPx,
    usablePageWidthPx: 1,
    usablePageHeightPx: input.previewContentHeightPx,
  });
  const paginationGridMetrics = input.paginationGridMetrics ?? fallbackGridMetrics;
  const firstColumnTiles = paginationGridMetrics.tiles.filter((tile) => tile.col === 0);
  const pageHeightPx = paginationGridMetrics.usablePageHeightPx;
  const pageCount = Math.max(1, paginationGridMetrics.pagesY);
  const pageOffsetsPx = firstColumnTiles.map((tile) => tile.offsetY);
  const pageSliceHeightsPx = firstColumnTiles.map((tile) => tile.sliceHeightPx);
  const scaledContentHeightPx = Math.max(0, paginationGridMetrics.scaledContentHeightPx);
  const lastPageContentHeightPx =
    scaledContentHeightPx === 0
      ? 0
      : (firstColumnTiles[firstColumnTiles.length - 1]?.sliceHeightPx ?? pageHeightPx);
  const hasPartialLastPage =
    scaledContentHeightPx > 0 && lastPageContentHeightPx > 0 && lastPageContentHeightPx < pageHeightPx;

  return {
    pageCount,
    pageOffsetsPx,
    pageSliceHeightsPx,
    pageHeightPx,
    lastPageContentHeightPx,
    hasPartialLastPage,
    hasVerticalPagination: paginationGridMetrics.hasVerticalPagination,
  };
};

export const resolveViewerPrintedPagesFromPaginationGrid = (input: {
  tiles: ViewerPaginationTile[];
  scaledContentWidthPx: number;
  scaledContentHeightPx: number;
  usablePageWidthPx: number;
  usablePageHeightPx: number;
}): ViewerPrintedPage[] => {
  const scaledContentWidthPx = Math.max(0, Math.round(input.scaledContentWidthPx));
  const scaledContentHeightPx = Math.max(0, Math.round(input.scaledContentHeightPx));
  const usablePageWidthPx = Math.max(1, Math.round(input.usablePageWidthPx));
  const usablePageHeightPx = Math.max(1, Math.round(input.usablePageHeightPx));

  return [...input.tiles]
    .sort((left, right) => {
      if (left.row !== right.row) return left.row - right.row;
      if (left.col !== right.col) return left.col - right.col;
      return left.pageNumber - right.pageNumber;
    })
    .map((tile, index) => {
      const printOffsetX = clamp(Math.round(tile.offsetX), 0, scaledContentWidthPx);
      const printOffsetY = clamp(Math.round(tile.offsetY), 0, scaledContentHeightPx);
      const sliceWidthPx =
        scaledContentWidthPx === 0
          ? usablePageWidthPx
          : Math.max(1, Math.min(usablePageWidthPx, Math.round(tile.sliceWidthPx), scaledContentWidthPx - printOffsetX));
      const sliceHeightPx =
        scaledContentHeightPx === 0
          ? usablePageHeightPx
          : Math.max(
              1,
              Math.min(usablePageHeightPx, Math.round(tile.sliceHeightPx), scaledContentHeightPx - printOffsetY),
            );

      return {
        pageNumber: index + 1,
        sourceTilePageNumber: tile.pageNumber,
        tileRow: tile.row,
        tileCol: tile.col,
        printOffsetX,
        printOffsetY,
        sliceWidthPx,
        sliceHeightPx,
        viewportWidthPx: sliceWidthPx,
        viewportHeightPx: sliceHeightPx,
        isLastColumn: printOffsetX + sliceWidthPx >= scaledContentWidthPx,
        isLastRow: printOffsetY + sliceHeightPx >= scaledContentHeightPx,
      };
    });
};

export const resolveViewerPrintPageCss = (metrics: ViewerResolvedPageMetrics): string =>
  `@media print { @page { size: ${metrics.paperWidthMm}mm ${metrics.paperHeightMm}mm; margin: ${metrics.marginTopMm}mm ${metrics.marginRightMm}mm ${metrics.marginBottomMm}mm ${metrics.marginLeftMm}mm; } }`;

export const resolveViewerPrintableTextLayout = (
  input: ViewerPrintableTextLayoutInput,
): ViewerPrintableTextLayout => {
  const headerText = input.showHeaderFooter ? input.headerText.trim() : '';
  const footerText = input.showHeaderFooter ? input.footerText.trim() : '';
  const documentTitle = input.showDocumentTitle ? input.projectName.trim() : '';
  const blockOrder: ViewerPrintableTextBlock[] = [];

  if (headerText) blockOrder.push('header');
  if (documentTitle) blockOrder.push('title');
  blockOrder.push('grid');
  if (footerText) blockOrder.push('footer');

  return {
    headerText,
    documentTitle,
    footerText,
    blockOrder,
  };
};
