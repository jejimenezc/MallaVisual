export type ViewerPanelMode = 'preview' | 'print-preview';
export type ViewerPrintPaperSize = 'A2' | 'A3' | 'carta' | 'oficio';
export type ViewerPrintOrientation = 'portrait' | 'landscape';
export type ViewerPrintMargins = 'narrow' | 'normal' | 'wide';

export interface ViewerPrintSettings {
  paperSize: ViewerPrintPaperSize;
  orientation: ViewerPrintOrientation;
  scale: number;
  previewSheetScaleX: number;
  previewSheetScaleY: number;
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
  paperWidthPx: number;
  paperHeightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
  contentScale: number;
}

export interface ViewerPageCssVars {
  '--print-paper-width-mm': string;
  '--print-paper-height-mm': string;
  '--print-margin-top-mm': string;
  '--print-margin-right-mm': string;
  '--print-margin-bottom-mm': string;
  '--print-margin-left-mm': string;
  '--print-content-width-mm': string;
  '--print-content-height-mm': string;
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

const PREVIEW_SHEET_SCALE_X_MIN = 0.8;
const PREVIEW_SHEET_SCALE_X_MAX = 1.6;
const PREVIEW_SHEET_SCALE_Y_MIN = 0.8;
const PREVIEW_SHEET_SCALE_Y_MAX = 1.2;

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
  previewSheetScaleX: 1.26,
  previewSheetScaleY: 1.2,
  margins: 'normal',
  showDocumentTitle: false,
});

export const normalizeViewerPrintSettings = (value: unknown): ViewerPrintSettings => {
  const defaults = createDefaultViewerPrintSettings();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }
  const source = value as Partial<ViewerPrintSettings> & { previewScreenScale?: unknown };
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
    previewSheetScaleX: clamp(
      Number(source.previewSheetScaleX ?? source.previewScreenScale ?? defaults.previewSheetScaleX),
      PREVIEW_SHEET_SCALE_X_MIN,
      PREVIEW_SHEET_SCALE_X_MAX,
    ),
    previewSheetScaleY: clamp(
      Number(source.previewSheetScaleY ?? source.previewScreenScale ?? defaults.previewSheetScaleY),
      PREVIEW_SHEET_SCALE_Y_MIN,
      PREVIEW_SHEET_SCALE_Y_MAX,
    ),
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
    paperWidthPx: Math.round(paperWidthMm * VIEWER_PRINT_MM_TO_PX),
    paperHeightPx: Math.round(paperHeightMm * VIEWER_PRINT_MM_TO_PX),
    marginTopPx: Math.round(marginMm * VIEWER_PRINT_MM_TO_PX),
    marginRightPx: Math.round(marginMm * VIEWER_PRINT_MM_TO_PX),
    marginBottomPx: Math.round(marginMm * VIEWER_PRINT_MM_TO_PX),
    marginLeftPx: Math.round(marginMm * VIEWER_PRINT_MM_TO_PX),
    contentWidthPx: Math.round(contentWidthMm * VIEWER_PRINT_MM_TO_PX),
    contentHeightPx: Math.round(contentHeightMm * VIEWER_PRINT_MM_TO_PX),
    contentScale: settings.scale,
  };
};

export const resolveViewerPrintableLayoutModel = resolveViewerPageMetrics;

export const resolveViewerPageCssVars = (
  metrics: ViewerResolvedPageMetrics,
): ViewerPageCssVars => ({
  '--print-paper-width-mm': `${metrics.paperWidthMm}`,
  '--print-paper-height-mm': `${metrics.paperHeightMm}`,
  '--print-margin-top-mm': `${metrics.marginTopMm}`,
  '--print-margin-right-mm': `${metrics.marginRightMm}`,
  '--print-margin-bottom-mm': `${metrics.marginBottomMm}`,
  '--print-margin-left-mm': `${metrics.marginLeftMm}`,
  '--print-content-width-mm': `${metrics.contentWidthMm}`,
  '--print-content-height-mm': `${metrics.contentHeightMm}`,
});

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
