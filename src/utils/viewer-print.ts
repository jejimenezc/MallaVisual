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

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const VIEWER_PRINT_MIN_SCALE = 0.5;
export const VIEWER_PRINT_MAX_SCALE = 1.5;
export const VIEWER_PRINT_SCALE_STEP = 0.05;

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
