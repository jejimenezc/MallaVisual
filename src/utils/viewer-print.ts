import type { ViewerRenderModel } from './viewer-theme.ts';

export type ViewerPanelMode = 'preview' | 'print-preview';
export type ViewerPrintPaperSize = 'A2' | 'A3' | 'carta' | 'oficio';
export type ViewerPrintOrientation = 'portrait' | 'landscape';
export type ViewerPrintMargins = 'narrow' | 'normal' | 'wide';
export type ViewerPrintPageLayoutMode = 'first-page-only' | 'same-on-all-pages';

export interface ViewerPrintSettings {
  paperSize: ViewerPrintPaperSize;
  orientation: ViewerPrintOrientation;
  scale: number;
  fitToWidth: boolean;
  margins: ViewerPrintMargins;
  showDocumentTitle: boolean;
  documentTitleFontSize: number;
  documentTitleOverride: string;
  pageLayoutMode: ViewerPrintPageLayoutMode;
  showHeader: boolean;
  headerText: string;
  showFooter: boolean;
  footerText: string;
  showPageNumbers: boolean;
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
  usablePageHeightPx: number;
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
  firstPageUsableHeightPx: number;
  continuationPageUsableHeightPx: number;
  usablePageHeightsPxByRow: number[];
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
  usablePageHeightPx: number;
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

export type ViewerPrintedPageTemplate = 'grid-only' | 'with-text-blocks';

export interface ViewerPrintEditorialConfig {
  showDocumentTitle: boolean;
  documentTitleOverride: string;
  pageLayoutMode: ViewerPrintPageLayoutMode;
  showHeader: boolean;
  headerText: string;
  showFooter: boolean;
  footerText: string;
  showPageNumbers: boolean;
}

export interface ViewerPrintedPageEditorialLayout {
  template: ViewerPrintedPageTemplate;
  headerText: string;
  documentTitle: string;
  footerText: string;
  pageNumberText: string;
  reserveTopMm: number;
  reserveBottomMm: number;
  reserveTopPx: number;
  reserveBottomPx: number;
  usableHeightMm: number;
  usableHeightPx: number;
}

export interface ViewerPrintedPageEditorialLayoutInput extends ViewerPrintEditorialConfig {
  pageIndex: number;
  pageCount: number;
  projectName: string;
  contentHeightMm: number;
  pxPerMmY: number;
}

export interface ViewerPrintedPageEditorialHeights {
  firstPageUsableHeightPx: number;
  continuationPageUsableHeightPx: number;
  firstPageUsableHeightMm: number;
  continuationPageUsableHeightMm: number;
  firstPageTemplate: ViewerPrintedPageTemplate;
  continuationPageTemplate: ViewerPrintedPageTemplate;
}

export interface ViewerPaginationAxisYCutsInput {
  totalSizePx: number;
  firstPageUsablePageSizePx: number;
  continuationPageUsablePageSizePx: number;
  lineSegmentsY: ViewerAxisYLineSegment[];
  cutGuidesY?: number[];
  enableGuideSnapping?: boolean;
}

export interface ViewerPageEditorialHeightInput extends ViewerPrintEditorialConfig {
  projectName: string;
  contentHeightMm: number;
  pxPerMmY: number;
}

export interface ViewerPrintableTextLayout {
  headerText: string;
  documentTitle: string;
  footerText: string;
  pageNumberText: string;
  template: ViewerPrintedPageTemplate;
}

export interface ViewerEffectivePrintScaleInput {
  fitToWidth: boolean;
  manualScale: number;
  baseContentWidthPx: number;
  previewContentWidthPx: number;
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
export const VIEWER_PRINT_TITLE_MIN_FONT_SIZE = 16;
export const VIEWER_PRINT_TITLE_MAX_FONT_SIZE = 32;
export const VIEWER_PRINT_TITLE_FONT_SIZE_STEP = 1;

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

const VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM = {
  header: 10,
  title: 16,
  footer: 10,
  pageNumbers: 8,
  gap: 3,
} as const;

export const createDefaultViewerPrintSettings = (): ViewerPrintSettings => ({
  paperSize: 'A3',
  orientation: 'portrait',
  scale: 1,
  fitToWidth: false,
  margins: 'normal',
  showDocumentTitle: false,
  documentTitleFontSize: 18,
  documentTitleOverride: '',
  pageLayoutMode: 'same-on-all-pages',
  showHeader: false,
  headerText: '',
  showFooter: false,
  footerText: '',
  showPageNumbers: false,
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
    fitToWidth: source.fitToWidth === true,
    margins: source.margins === 'narrow' || source.margins === 'wide' ? source.margins : defaults.margins,
    showDocumentTitle: source.showDocumentTitle === true,
    documentTitleFontSize: clamp(
      Number(source.documentTitleFontSize ?? defaults.documentTitleFontSize),
      VIEWER_PRINT_TITLE_MIN_FONT_SIZE,
      VIEWER_PRINT_TITLE_MAX_FONT_SIZE,
    ),
    documentTitleOverride:
      typeof source.documentTitleOverride === 'string' ? source.documentTitleOverride : defaults.documentTitleOverride,
    pageLayoutMode:
      source.pageLayoutMode === 'first-page-only' || source.pageLayoutMode === 'same-on-all-pages'
        ? source.pageLayoutMode
        : defaults.pageLayoutMode,
    showHeader: source.showHeader === true,
    headerText: typeof source.headerText === 'string' ? source.headerText : defaults.headerText,
    showFooter: source.showFooter === true,
    footerText: typeof source.footerText === 'string' ? source.footerText : defaults.footerText,
    showPageNumbers: source.showPageNumbers === true,
  };
};

export const resolveViewerEffectivePrintScale = (
  input: ViewerEffectivePrintScaleInput,
): number => {
  if (input.fitToWidth) {
    const baseContentWidthPx = Math.round(input.baseContentWidthPx);
    const previewContentWidthPx = Math.round(input.previewContentWidthPx);
    if (baseContentWidthPx <= 0 || previewContentWidthPx <= 0) {
      return 1;
    }
    const fitScale = previewContentWidthPx / baseContentWidthPx;
    return Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
  }

  const manualScale = Number(input.manualScale);
  if (!Number.isFinite(manualScale)) {
    return 1;
  }
  return clamp(manualScale, VIEWER_PRINT_MIN_SCALE, VIEWER_PRINT_MAX_SCALE);
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
  const scale = Number.isFinite(input.scale) && input.scale > 0 ? input.scale : 1;
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

const resolveViewerTitleText = (input: {
  projectName: string;
  documentTitleOverride: string;
  showDocumentTitle: boolean;
}): string => {
  if (!input.showDocumentTitle) return '';
  const override = input.documentTitleOverride.trim();
  if (override) return override;
  return input.projectName.trim();
};

const resolveViewerPageLayoutAllowsRepeatingBlocks = (
  pageLayoutMode: ViewerPrintPageLayoutMode,
  pageIndex: number,
): boolean => pageLayoutMode === 'same-on-all-pages' || pageIndex === 0;

const resolveViewerEditorialReservedHeightMm = (input: {
  headerText: string;
  documentTitle: string;
  footerText: string;
  pageNumberText: string;
}): { reserveTopMm: number; reserveBottomMm: number; template: ViewerPrintedPageTemplate } => {
  let reserveTopMm = 0;
  let reserveBottomMm = 0;

  if (input.headerText) {
    reserveTopMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.header;
  }
  if (input.documentTitle) {
    if (reserveTopMm > 0) reserveTopMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.gap;
    reserveTopMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.title;
  }
  if (input.footerText) {
    reserveBottomMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.footer;
  }
  if (input.pageNumberText) {
    if (reserveBottomMm > 0) reserveBottomMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.gap;
    reserveBottomMm += VIEWER_PRINT_EDITORIAL_DIMENSIONS_MM.pageNumbers;
  }

  return {
    reserveTopMm,
    reserveBottomMm,
    template: reserveTopMm > 0 || reserveBottomMm > 0 ? 'with-text-blocks' : 'grid-only',
  };
};

export const resolveViewerPrintedPageEditorialLayout = (
  input: ViewerPrintedPageEditorialLayoutInput,
): ViewerPrintedPageEditorialLayout => {
  const showRepeatingBlocks = resolveViewerPageLayoutAllowsRepeatingBlocks(input.pageLayoutMode, input.pageIndex);
  const headerText = input.showHeader && showRepeatingBlocks ? input.headerText.trim() : '';
  const footerText = input.showFooter && showRepeatingBlocks ? input.footerText.trim() : '';
  const documentTitle = input.pageIndex === 0
    ? resolveViewerTitleText({
        projectName: input.projectName,
        documentTitleOverride: input.documentTitleOverride,
        showDocumentTitle: input.showDocumentTitle,
      })
    : '';
  const pageNumberText =
    input.showPageNumbers && showRepeatingBlocks ? `Pagina ${input.pageIndex + 1} de ${Math.max(1, input.pageCount)}` : '';
  const { reserveTopMm, reserveBottomMm, template } = resolveViewerEditorialReservedHeightMm({
    headerText,
    documentTitle,
    footerText,
    pageNumberText,
  });
  const usableHeightMm = Math.max(1, input.contentHeightMm - reserveTopMm - reserveBottomMm);
  const reserveTopPx = Math.round(reserveTopMm * input.pxPerMmY);
  const reserveBottomPx = Math.round(reserveBottomMm * input.pxPerMmY);
  const usableHeightPx = Math.max(1, Math.round(usableHeightMm * input.pxPerMmY));

  return {
    template,
    headerText,
    documentTitle,
    footerText,
    pageNumberText,
    reserveTopMm,
    reserveBottomMm,
    reserveTopPx,
    reserveBottomPx,
    usableHeightMm,
    usableHeightPx,
  };
};

export const resolveViewerPageEditorialHeights = (
  input: ViewerPageEditorialHeightInput,
): ViewerPrintedPageEditorialHeights => {
  const firstPage = resolveViewerPrintedPageEditorialLayout({
    ...input,
    pageIndex: 0,
    pageCount: 1,
  });
  const continuationPage = resolveViewerPrintedPageEditorialLayout({
    ...input,
    pageIndex: 1,
    pageCount: 2,
  });

  return {
    firstPageUsableHeightPx: firstPage.usableHeightPx,
    continuationPageUsableHeightPx: continuationPage.usableHeightPx,
    firstPageUsableHeightMm: firstPage.usableHeightMm,
    continuationPageUsableHeightMm: continuationPage.usableHeightMm,
    firstPageTemplate: firstPage.template,
    continuationPageTemplate: continuationPage.template,
  };
};

export const resolveViewerVariableAxisYCuts = (
  input: ViewerPaginationAxisYCutsInput,
): { offsetsPx: number[]; sliceSizesPx: number[]; usablePageHeightsPx: number[] } => {
  const totalSizePx = Math.max(0, Math.round(input.totalSizePx));
  const firstPageUsablePageSizePx = Math.max(1, Math.round(input.firstPageUsablePageSizePx));
  const continuationPageUsablePageSizePx = Math.max(1, Math.round(input.continuationPageUsablePageSizePx));
  const offsetsPx: number[] = [];
  const sliceSizesPx: number[] = [];
  const usablePageHeightsPx: number[] = [];
  let offsetPx = 0;
  let pageIndex = 0;

  while (offsetPx < totalSizePx) {
    const usablePageSizePx = pageIndex === 0 ? firstPageUsablePageSizePx : continuationPageUsablePageSizePx;
    const cuts = resolveViewerProtectedAxisYCuts({
      totalSizePx: totalSizePx - offsetPx,
      usablePageSizePx,
      lineSegmentsY: input.lineSegmentsY.map((segment) => ({
        rowIndex: segment.rowIndex,
        startPx: Math.max(0, Math.round(segment.startPx) - offsetPx),
        endPx: Math.max(0, Math.round(segment.endPx) - offsetPx),
        heightPx: Math.max(0, Math.round(segment.heightPx)),
      })),
      cutGuidesY: (input.cutGuidesY ?? []).map((value) => Math.max(0, Math.round(value) - offsetPx)),
      enableGuideSnapping: input.enableGuideSnapping,
    });
    const nextSliceSizePx = Math.max(1, cuts.sliceSizesPx[0] ?? usablePageSizePx);
    offsetsPx.push(offsetPx);
    sliceSizesPx.push(nextSliceSizePx);
    usablePageHeightsPx.push(usablePageSizePx);
    offsetPx += nextSliceSizePx;
    pageIndex += 1;
  }

  if (offsetsPx.length === 0) {
    return {
      offsetsPx: [0],
      sliceSizesPx: [firstPageUsablePageSizePx],
      usablePageHeightsPx: [firstPageUsablePageSizePx],
    };
  }

  return { offsetsPx, sliceSizesPx, usablePageHeightsPx };
};

export const resolveViewerPaginationGridMetrics = (input: {
  scaledContentWidthPx: number;
  scaledContentHeightPx: number;
  usablePageWidthPx: number;
  usablePageHeightPx: number;
  firstPageUsableHeightPx?: number;
  continuationPageUsableHeightPx?: number;
  cutGuides?: Partial<ViewerPaginationCutGuides>;
  axisXColumnSegments?: ViewerAxisXColumnSegment[];
  axisYLineSegments?: ViewerAxisYLineSegment[];
  refinementPolicy?: Partial<ViewerPaginationRefinementPolicy>;
}): ViewerPaginationGridMetrics => {
  const scaledContentWidthPx = Math.max(0, Math.round(input.scaledContentWidthPx));
  const scaledContentHeightPx = Math.max(0, Math.round(input.scaledContentHeightPx));
  const usablePageWidthPx = Math.max(1, Math.round(input.usablePageWidthPx));
  const usablePageHeightPx = Math.max(1, Math.round(input.usablePageHeightPx));
  const firstPageUsableHeightPx = Math.max(1, Math.round(input.firstPageUsableHeightPx ?? usablePageHeightPx));
  const continuationPageUsableHeightPx = Math.max(
    1,
    Math.round(input.continuationPageUsableHeightPx ?? usablePageHeightPx),
  );
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
  const axisY = resolveViewerVariableAxisYCuts({
    totalSizePx: scaledContentHeightPx,
    firstPageUsablePageSizePx: firstPageUsableHeightPx,
    continuationPageUsablePageSizePx: continuationPageUsableHeightPx,
    lineSegmentsY:
      refinementPolicy.refineAxisY && axisYLineSegments.length > 0
        ? axisYLineSegments
        : [],
    cutGuidesY: cutGuides.cutGuidesY,
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
        sliceHeightPx: axisY.sliceSizesPx[row] ?? (row === 0 ? firstPageUsableHeightPx : continuationPageUsableHeightPx),
        usablePageHeightPx: axisY.usablePageHeightsPx[row] ?? (row === 0 ? firstPageUsableHeightPx : continuationPageUsableHeightPx),
      });
    }
  }

  return {
    scaledContentWidthPx,
    scaledContentHeightPx,
    usablePageWidthPx,
    usablePageHeightPx,
    firstPageUsableHeightPx,
    continuationPageUsableHeightPx,
    usablePageHeightsPxByRow: axisY.usablePageHeightsPx,
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
  const pageHeightPx = firstColumnTiles[0]?.usablePageHeightPx ?? paginationGridMetrics.usablePageHeightPx;
  const pageCount = Math.max(1, paginationGridMetrics.pagesY);
  const pageOffsetsPx = firstColumnTiles.map((tile) => tile.offsetY);
  const pageSliceHeightsPx = firstColumnTiles.map((tile) => tile.sliceHeightPx);
  const scaledContentHeightPx = Math.max(0, paginationGridMetrics.scaledContentHeightPx);
  const lastPageContentHeightPx =
    scaledContentHeightPx === 0
      ? 0
      : (firstColumnTiles[firstColumnTiles.length - 1]?.sliceHeightPx ?? pageHeightPx);
  const hasPartialLastPage =
    scaledContentHeightPx > 0 &&
    lastPageContentHeightPx > 0 &&
    lastPageContentHeightPx < (firstColumnTiles[firstColumnTiles.length - 1]?.usablePageHeightPx ?? pageHeightPx);

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
      const tileUsablePageHeightPx = Math.max(1, Math.round(tile.usablePageHeightPx ?? usablePageHeightPx));
      const sliceHeightPx =
        scaledContentHeightPx === 0
          ? tileUsablePageHeightPx
          : Math.max(
              1,
              Math.min(tileUsablePageHeightPx, Math.round(tile.sliceHeightPx), scaledContentHeightPx - printOffsetY),
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
        usablePageHeightPx: tileUsablePageHeightPx,
        isLastColumn: printOffsetX + sliceWidthPx >= scaledContentWidthPx,
        isLastRow: printOffsetY + sliceHeightPx >= scaledContentHeightPx,
      };
    });
};

export const resolveViewerPrintPageCss = (metrics: ViewerResolvedPageMetrics): string =>
  `@media print { @page { size: ${metrics.paperWidthMm}mm ${metrics.paperHeightMm}mm; margin: ${metrics.marginTopMm}mm ${metrics.marginRightMm}mm ${metrics.marginBottomMm}mm ${metrics.marginLeftMm}mm; } }`;

export const resolveViewerPrintableTextLayout = (
  input: ViewerPrintedPageEditorialLayoutInput,
): ViewerPrintableTextLayout => {
  const layout = resolveViewerPrintedPageEditorialLayout(input);
  return {
    headerText: layout.headerText,
    documentTitle: layout.documentTitle,
    footerText: layout.footerText,
    pageNumberText: layout.pageNumberText,
    template: layout.template,
  };
};
