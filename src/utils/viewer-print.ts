export type ViewerPanelMode = 'preview' | 'print-preview';
export type ViewerPrintPaperSize = 'A2' | 'A3' | 'carta' | 'oficio';
export type ViewerPrintOrientation = 'portrait' | 'landscape';
export type ViewerPrintMargins = 'narrow' | 'normal' | 'wide';

export interface ViewerPrintSettings {
  paperSize: ViewerPrintPaperSize;
  orientation: ViewerPrintOrientation;
  scale: number;
  margins: ViewerPrintMargins;
}

export interface ViewerResolvedPrintLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
  pageInnerWidthPx: number;
  pageInnerHeightPx: number;
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
});

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
  };
};

export const resolveViewerPanelMode = (isPrintPreview: boolean): ViewerPanelMode =>
  isPrintPreview ? 'print-preview' : 'preview';

export const resolveViewerPrintLayout = (
  settings: ViewerPrintSettings,
): ViewerResolvedPrintLayout => {
  const paper = PAPER_MM[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';
  const pageWidthMm = isLandscape ? paper.height : paper.width;
  const pageHeightMm = isLandscape ? paper.width : paper.height;
  const marginMm = MARGINS_MM[settings.margins];
  const pageInnerWidthMm = Math.max(pageWidthMm - marginMm * 2, 1);
  const pageInnerHeightMm = Math.max(pageHeightMm - marginMm * 2, 1);

  return {
    pageWidthMm,
    pageHeightMm,
    marginMm,
    pageInnerWidthPx: Math.round(pageInnerWidthMm * VIEWER_PRINT_MM_TO_PX),
    pageInnerHeightPx: Math.round(pageInnerHeightMm * VIEWER_PRINT_MM_TO_PX),
  };
};
