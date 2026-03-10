import type {
  ViewerEffectivePrintPageMeasurement,
  ViewerPreviewPageMetrics,
  ViewerResolvedPageMetrics,
} from './viewer-print.ts';

export interface ViewerRenderedPreviewRects {
  sheetFrameWidthPx: number | null;
  sheetFrameHeightPx: number | null;
  contentBoxWidthPx: number | null;
  contentBoxHeightPx: number | null;
}

interface ViewerPrintMetricsDiffSet {
  paperWidthPx: number | null;
  paperHeightPx: number | null;
  contentWidthPx: number | null;
  contentHeightPx: number | null;
}

interface ViewerPrintMarginDiffSet extends ViewerPrintMetricsDiffSet {
  marginTopPx: number | null;
  marginRightPx: number | null;
  marginBottomPx: number | null;
  marginLeftPx: number | null;
}

export interface ViewerPrintDiagnosticsDiffs {
  nominalVsEffective: ViewerPrintMarginDiffSet;
  effectiveVsRendered: ViewerPrintMetricsDiffSet;
}

export interface ViewerPrintDiagnosticsSnapshot {
  settings: {
    paperSize: string;
    orientation: string;
    margins: string;
    scale: number;
  };
  nominal: {
    pageMetrics: ViewerResolvedPageMetrics;
    previewMetrics: ViewerPreviewPageMetrics;
  };
  effectiveRaw: ViewerEffectivePrintPageMeasurement | null;
  effectiveValidation: {
    accepted: boolean;
    reason: string | null;
    tolerancePx: number;
  };
  finalPreviewMetrics: ViewerPreviewPageMetrics;
  renderedPreviewRects: ViewerRenderedPreviewRects;
  diffs: ViewerPrintDiagnosticsDiffs;
}

export interface ViewerPrintDiagnosticsMeasurementLike {
  rawMeasurement: ViewerEffectivePrintPageMeasurement | null;
  validation: {
    accepted: boolean;
    reason: string | null;
    tolerancePx: number;
  };
}

const roundRectDimension = (value: number): number | null =>
  Number.isFinite(value) ? Math.round(value) : null;

const diffOrNull = (left: number | null, right: number | null): number | null =>
  left === null || right === null ? null : left - right;

export const measureRenderedPreviewRects = (input: {
  sheetFrameElement: HTMLElement | null;
  contentBoxElement: HTMLElement | null;
}): ViewerRenderedPreviewRects => {
  try {
    const sheetFrameRect = input.sheetFrameElement?.getBoundingClientRect() ?? null;
    const contentBoxRect = input.contentBoxElement?.getBoundingClientRect() ?? null;
    return {
      sheetFrameWidthPx: roundRectDimension(sheetFrameRect?.width ?? Number.NaN),
      sheetFrameHeightPx: roundRectDimension(sheetFrameRect?.height ?? Number.NaN),
      contentBoxWidthPx: roundRectDimension(contentBoxRect?.width ?? Number.NaN),
      contentBoxHeightPx: roundRectDimension(contentBoxRect?.height ?? Number.NaN),
    };
  } catch {
    return {
      sheetFrameWidthPx: null,
      sheetFrameHeightPx: null,
      contentBoxWidthPx: null,
      contentBoxHeightPx: null,
    };
  }
};

export const buildViewerPrintDiagnosticsDiffs = (input: {
  nominalPreviewMetrics: ViewerPreviewPageMetrics;
  effectiveRawMeasurement: ViewerEffectivePrintPageMeasurement | null;
  finalPreviewMetrics: ViewerPreviewPageMetrics;
  renderedPreviewRects: ViewerRenderedPreviewRects;
}): ViewerPrintDiagnosticsDiffs => ({
  nominalVsEffective: {
    paperWidthPx: diffOrNull(
      input.effectiveRawMeasurement?.paperWidthPx ?? null,
      input.nominalPreviewMetrics.paperWidthPx,
    ),
    paperHeightPx: diffOrNull(
      input.effectiveRawMeasurement?.paperHeightPx ?? null,
      input.nominalPreviewMetrics.paperHeightPx,
    ),
    contentWidthPx: diffOrNull(
      input.effectiveRawMeasurement?.contentWidthPx ?? null,
      input.nominalPreviewMetrics.contentWidthPx,
    ),
    contentHeightPx: diffOrNull(
      input.effectiveRawMeasurement?.contentHeightPx ?? null,
      input.nominalPreviewMetrics.contentHeightPx,
    ),
    marginTopPx: diffOrNull(
      input.effectiveRawMeasurement?.marginTopPx ?? null,
      input.nominalPreviewMetrics.marginTopPx,
    ),
    marginRightPx: diffOrNull(
      input.effectiveRawMeasurement?.marginRightPx ?? null,
      input.nominalPreviewMetrics.marginRightPx,
    ),
    marginBottomPx: diffOrNull(
      input.effectiveRawMeasurement?.marginBottomPx ?? null,
      input.nominalPreviewMetrics.marginBottomPx,
    ),
    marginLeftPx: diffOrNull(
      input.effectiveRawMeasurement?.marginLeftPx ?? null,
      input.nominalPreviewMetrics.marginLeftPx,
    ),
  },
  effectiveVsRendered: {
    paperWidthPx: diffOrNull(
      input.renderedPreviewRects.sheetFrameWidthPx,
      input.finalPreviewMetrics.paperWidthPx,
    ),
    paperHeightPx: diffOrNull(
      input.renderedPreviewRects.sheetFrameHeightPx,
      input.finalPreviewMetrics.paperHeightPx,
    ),
    contentWidthPx: diffOrNull(
      input.renderedPreviewRects.contentBoxWidthPx,
      input.finalPreviewMetrics.contentWidthPx,
    ),
    contentHeightPx: diffOrNull(
      input.renderedPreviewRects.contentBoxHeightPx,
      input.finalPreviewMetrics.contentHeightPx,
    ),
  },
});

export const buildViewerPrintDiagnosticsSnapshot = (input: {
  settings: {
    paperSize: string;
    orientation: string;
    margins: string;
    scale: number;
  };
  pageMetrics: ViewerResolvedPageMetrics;
  nominalPreviewMetrics: ViewerPreviewPageMetrics;
  measurementResult: ViewerPrintDiagnosticsMeasurementLike;
  finalPreviewMetrics: ViewerPreviewPageMetrics;
  renderedPreviewRects: ViewerRenderedPreviewRects;
}): ViewerPrintDiagnosticsSnapshot => ({
  settings: input.settings,
  nominal: {
    pageMetrics: input.pageMetrics,
    previewMetrics: input.nominalPreviewMetrics,
  },
  effectiveRaw: input.measurementResult.rawMeasurement,
  effectiveValidation: {
    accepted: input.measurementResult.validation.accepted,
    reason: input.measurementResult.validation.reason,
    tolerancePx: input.measurementResult.validation.tolerancePx,
  },
  finalPreviewMetrics: input.finalPreviewMetrics,
  renderedPreviewRects: input.renderedPreviewRects,
  diffs: buildViewerPrintDiagnosticsDiffs({
    nominalPreviewMetrics: input.nominalPreviewMetrics,
    effectiveRawMeasurement: input.measurementResult.rawMeasurement,
    finalPreviewMetrics: input.finalPreviewMetrics,
    renderedPreviewRects: input.renderedPreviewRects,
  }),
});
