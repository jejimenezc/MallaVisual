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
}): ViewerPaginationGridMetrics => {
  const scaledContentWidthPx = Math.max(0, Math.round(input.scaledContentWidthPx));
  const scaledContentHeightPx = Math.max(0, Math.round(input.scaledContentHeightPx));
  const usablePageWidthPx = Math.max(1, Math.round(input.usablePageWidthPx));
  const usablePageHeightPx = Math.max(1, Math.round(input.usablePageHeightPx));
  const pagesX = Math.max(1, Math.ceil(scaledContentWidthPx / usablePageWidthPx));
  const pagesY = Math.max(1, Math.ceil(scaledContentHeightPx / usablePageHeightPx));
  const tiles: ViewerPaginationTile[] = [];

  for (let row = 0; row < pagesY; row += 1) {
    for (let col = 0; col < pagesX; col += 1) {
      const offsetX = col * usablePageWidthPx;
      const offsetY = row * usablePageHeightPx;
      const remainingWidthPx = Math.max(scaledContentWidthPx - offsetX, 0);
      const remainingHeightPx = Math.max(scaledContentHeightPx - offsetY, 0);

      tiles.push({
        pageNumber: tiles.length + 1,
        row,
        col,
        offsetX,
        offsetY,
        sliceWidthPx:
          scaledContentWidthPx === 0 ? usablePageWidthPx : Math.max(1, Math.min(usablePageWidthPx, remainingWidthPx)),
        sliceHeightPx:
          scaledContentHeightPx === 0
            ? usablePageHeightPx
            : Math.max(1, Math.min(usablePageHeightPx, remainingHeightPx)),
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
