import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  buildViewerPrintDiagnosticsDiffs,
  buildViewerPrintDiagnosticsSnapshot,
  measureRenderedPreviewRects,
} from './viewer-print-diagnostics.ts';

test('measureRenderedPreviewRects returns nulls when elements are missing', () => {
  assert.deepEqual(
    measureRenderedPreviewRects({
      sheetFrameElement: null,
      contentBoxElement: null,
    }),
    {
      sheetFrameWidthPx: null,
      sheetFrameHeightPx: null,
      contentBoxWidthPx: null,
      contentBoxHeightPx: null,
    },
  );
});

test('measureRenderedPreviewRects rounds rendered dimensions', () => {
  const sheetFrameElement = {
    getBoundingClientRect: () => ({ width: 1055.6, height: 815.5 }),
  } as HTMLElement;
  const contentBoxElement = {
    getBoundingClientRect: () => ({ width: 995.9, height: 756.2 }),
  } as HTMLElement;

  assert.deepEqual(
    measureRenderedPreviewRects({
      sheetFrameElement,
      contentBoxElement,
    }),
    {
      sheetFrameWidthPx: 1056,
      sheetFrameHeightPx: 816,
      contentBoxWidthPx: 996,
      contentBoxHeightPx: 756,
    },
  );
});

test('buildViewerPrintDiagnosticsDiffs calculates effective and rendered deltas', () => {
  assert.deepEqual(
    buildViewerPrintDiagnosticsDiffs({
      nominalPreviewMetrics: {
        paperWidthMm: 279.4,
        paperHeightMm: 215.9,
        marginTopMm: 8,
        marginRightMm: 8,
        marginBottomMm: 8,
        marginLeftMm: 8,
        contentWidthMm: 263.4,
        contentHeightMm: 199.9,
        paperWidthPx: 1056,
        paperHeightPx: 816,
        marginTopPx: 30,
        marginRightPx: 30,
        marginBottomPx: 30,
        marginLeftPx: 30,
        contentWidthPx: 996,
        contentHeightPx: 756,
        contentScale: 1,
      },
      effectiveRawMeasurement: {
        paperWidthPx: 1058,
        paperHeightPx: 820,
        contentWidthPx: 998,
        contentHeightPx: 755,
        marginTopPx: 0,
        marginRightPx: 30,
        marginBottomPx: 65,
        marginLeftPx: 30,
      },
      finalPreviewMetrics: {
        paperWidthMm: 279.4,
        paperHeightMm: 215.9,
        marginTopMm: 8,
        marginRightMm: 8,
        marginBottomMm: 8,
        marginLeftMm: 8,
        contentWidthMm: 263.4,
        contentHeightMm: 199.9,
        paperWidthPx: 1058,
        paperHeightPx: 820,
        marginTopPx: 0,
        marginRightPx: 30,
        marginBottomPx: 65,
        marginLeftPx: 30,
        contentWidthPx: 998,
        contentHeightPx: 755,
        contentScale: 1,
      },
      renderedPreviewRects: {
        sheetFrameWidthPx: 1060,
        sheetFrameHeightPx: 821,
        contentBoxWidthPx: 1000,
        contentBoxHeightPx: 756,
      },
    }),
    {
      nominalVsEffective: {
        paperWidthPx: 2,
        paperHeightPx: 4,
        contentWidthPx: 2,
        contentHeightPx: -1,
        marginTopPx: -30,
        marginRightPx: 0,
        marginBottomPx: 35,
        marginLeftPx: 0,
      },
      effectiveVsRendered: {
        paperWidthPx: 2,
        paperHeightPx: 1,
        contentWidthPx: 2,
        contentHeightPx: 1,
      },
    },
  );
});

test('buildViewerPrintDiagnosticsDiffs returns null deltas when data is missing', () => {
  assert.deepEqual(
    buildViewerPrintDiagnosticsDiffs({
      nominalPreviewMetrics: {
        paperWidthMm: 279.4,
        paperHeightMm: 215.9,
        marginTopMm: 8,
        marginRightMm: 8,
        marginBottomMm: 8,
        marginLeftMm: 8,
        contentWidthMm: 263.4,
        contentHeightMm: 199.9,
        paperWidthPx: 1056,
        paperHeightPx: 816,
        marginTopPx: 30,
        marginRightPx: 30,
        marginBottomPx: 30,
        marginLeftPx: 30,
        contentWidthPx: 996,
        contentHeightPx: 756,
        contentScale: 1,
      },
      effectiveRawMeasurement: null,
      finalPreviewMetrics: {
        paperWidthMm: 279.4,
        paperHeightMm: 215.9,
        marginTopMm: 8,
        marginRightMm: 8,
        marginBottomMm: 8,
        marginLeftMm: 8,
        contentWidthMm: 263.4,
        contentHeightMm: 199.9,
        paperWidthPx: 1056,
        paperHeightPx: 816,
        marginTopPx: 30,
        marginRightPx: 30,
        marginBottomPx: 30,
        marginLeftPx: 30,
        contentWidthPx: 996,
        contentHeightPx: 756,
        contentScale: 1,
      },
      renderedPreviewRects: {
        sheetFrameWidthPx: null,
        sheetFrameHeightPx: null,
        contentBoxWidthPx: null,
        contentBoxHeightPx: null,
      },
    }),
    {
      nominalVsEffective: {
        paperWidthPx: null,
        paperHeightPx: null,
        contentWidthPx: null,
        contentHeightPx: null,
        marginTopPx: null,
        marginRightPx: null,
        marginBottomPx: null,
        marginLeftPx: null,
      },
      effectiveVsRendered: {
        paperWidthPx: null,
        paperHeightPx: null,
        contentWidthPx: null,
        contentHeightPx: null,
      },
    },
  );
});

test('buildViewerPrintDiagnosticsSnapshot preserves the full diagnostics payload', () => {
  const snapshot = buildViewerPrintDiagnosticsSnapshot({
    settings: {
      paperSize: 'carta',
      orientation: 'landscape',
      margins: 'normal',
      scale: 1,
    },
    pageMetrics: {
      paperWidthMm: 279.4,
      paperHeightMm: 215.9,
      marginTopMm: 8,
      marginRightMm: 8,
      marginBottomMm: 8,
      marginLeftMm: 8,
      contentWidthMm: 263.4,
      contentHeightMm: 199.9,
      contentScale: 1,
    },
    nominalPreviewMetrics: {
      paperWidthMm: 279.4,
      paperHeightMm: 215.9,
      marginTopMm: 8,
      marginRightMm: 8,
      marginBottomMm: 8,
      marginLeftMm: 8,
      contentWidthMm: 263.4,
      contentHeightMm: 199.9,
      paperWidthPx: 1056,
      paperHeightPx: 816,
      marginTopPx: 30,
      marginRightPx: 30,
      marginBottomPx: 30,
      marginLeftPx: 30,
      contentWidthPx: 996,
      contentHeightPx: 756,
      contentScale: 1,
    },
    measurementResult: {
      rawMeasurement: {
        paperWidthPx: 1056,
        paperHeightPx: 816,
        contentWidthPx: 996,
        contentHeightPx: 756,
        marginTopPx: 0,
        marginRightPx: 30,
        marginBottomPx: 60,
        marginLeftPx: 30,
      },
      validation: {
        accepted: true,
        reason: null,
        tolerancePx: 3,
      },
    },
    finalPreviewMetrics: {
      paperWidthMm: 279.4,
      paperHeightMm: 215.9,
      marginTopMm: 8,
      marginRightMm: 8,
      marginBottomMm: 8,
      marginLeftMm: 8,
      contentWidthMm: 263.4,
      contentHeightMm: 199.9,
      paperWidthPx: 1056,
      paperHeightPx: 816,
      marginTopPx: 0,
      marginRightPx: 30,
      marginBottomPx: 60,
      marginLeftPx: 30,
      contentWidthPx: 996,
      contentHeightPx: 756,
      contentScale: 1,
    },
    renderedPreviewRects: {
      sheetFrameWidthPx: 1056,
      sheetFrameHeightPx: 816,
      contentBoxWidthPx: 996,
      contentBoxHeightPx: 756,
    },
  });

  assert.equal(snapshot.settings.paperSize, 'carta');
  assert.equal(snapshot.effectiveValidation.accepted, true);
  assert.equal(snapshot.effectiveRaw?.marginBottomPx, 60);
  assert.equal(snapshot.finalPreviewMetrics.marginTopPx, 0);
  assert.equal(snapshot.renderedPreviewRects.sheetFrameWidthPx, 1056);
  assert.equal(snapshot.diffs.nominalVsEffective.marginTopPx, -30);
});
