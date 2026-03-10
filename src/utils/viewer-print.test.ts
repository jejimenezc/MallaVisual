import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createDefaultViewerMeasuredPxPerMm,
  createDefaultViewerPrintSettings,
  normalizeViewerMeasuredPxPerMm,
  normalizeViewerPrintSettings,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePreviewPageMetrics,
  resolveViewerPageMetrics,
  resolveViewerPrintCssVars,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPrintableTextLayout,
  resolveViewerPrintableLayoutModel,
  resolveViewerPanelMode,
} from './viewer-print.ts';

test('viewer print settings defaults are stable', () => {
  assert.deepEqual(createDefaultViewerPrintSettings(), {
    paperSize: 'A3',
    orientation: 'portrait',
    scale: 1,
    margins: 'normal',
    showDocumentTitle: false,
  });
});

test('viewer print settings normalization clamps scale and validates enums', () => {
  const normalized = normalizeViewerPrintSettings({
    paperSize: 'A3',
    orientation: 'landscape',
    scale: 2,
    margins: 'wide',
    showDocumentTitle: true,
  });
  assert.equal(normalized.paperSize, 'A3');
  assert.equal(normalized.orientation, 'landscape');
  assert.equal(normalized.scale, 1.5);
  assert.equal(normalized.margins, 'wide');
  assert.equal(normalized.showDocumentTitle, true);

  const fallback = normalizeViewerPrintSettings({
    paperSize: 'Letter',
    orientation: 'diagonal',
    scale: 0.1,
    margins: 'zero',
    showDocumentTitle: 'yes',
  });
  assert.equal(fallback.paperSize, 'A3');
  assert.equal(fallback.orientation, 'portrait');
  assert.equal(fallback.scale, 0.5);
  assert.equal(fallback.margins, 'normal');
  assert.equal(fallback.showDocumentTitle, false);
});

test('viewer measured px-per-mm defaults use fallback css conversion', () => {
  const defaults = createDefaultViewerMeasuredPxPerMm();
  assert.equal(defaults.pxPerMmX, 3.7795);
  assert.equal(defaults.pxPerMmY, 3.7795);
});

test('viewer measured px-per-mm normalization validates positive values', () => {
  const normalized = normalizeViewerMeasuredPxPerMm({
    pxPerMmX: 4.2,
    pxPerMmY: 3.5,
  });
  assert.equal(normalized.pxPerMmX, 4.2);
  assert.equal(normalized.pxPerMmY, 3.5);

  const fallback = normalizeViewerMeasuredPxPerMm({
    pxPerMmX: 0,
    pxPerMmY: Number.NaN,
  });
  assert.equal(fallback.pxPerMmX, 3.7795);
  assert.equal(fallback.pxPerMmY, 3.7795);
});

test('viewer print settings normalization accepts carta and oficio sizes', () => {
  const carta = normalizeViewerPrintSettings({ paperSize: 'carta' });
  const oficio = normalizeViewerPrintSettings({ paperSize: 'oficio' });
  assert.equal(carta.paperSize, 'carta');
  assert.equal(oficio.paperSize, 'oficio');
});

test('viewer side panel mode is resolved from print-preview state', () => {
  assert.equal(resolveViewerPanelMode(false), 'preview');
  assert.equal(resolveViewerPanelMode(true), 'print-preview');
});

test('viewer page metrics resolves orientation and margins', () => {
  const portrait = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'normal',
    scale: 1,
    showDocumentTitle: false,
  });
  assert.equal(portrait.paperWidthMm, 297);
  assert.equal(portrait.paperHeightMm, 420);
  assert.equal(portrait.marginLeftMm, 12);
  assert.equal(portrait.marginTopMm, 12);
  assert.equal(portrait.contentWidthMm, 273);
  assert.equal(portrait.contentHeightMm, 396);
  assert.equal(portrait.contentScale, 1);

  const landscape = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'landscape',
    margins: 'wide',
    scale: 1,
    showDocumentTitle: false,
  });
  assert.equal(landscape.paperWidthMm, 420);
  assert.equal(landscape.paperHeightMm, 297);
  assert.equal(landscape.marginLeftMm, 18);
  assert.ok(landscape.contentHeightMm > 0);
  assert.ok(landscape.contentWidthMm > landscape.contentHeightMm);
});

test('viewer page metrics maps narrow normal and wide presets', () => {
  const narrow = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'narrow',
    scale: 1,
    showDocumentTitle: false,
  });
  const normal = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'normal',
    scale: 1,
    showDocumentTitle: false,
  });
  const wide = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'wide',
    scale: 1,
    showDocumentTitle: false,
  });
  assert.equal(narrow.marginLeftMm, 8);
  assert.equal(normal.marginLeftMm, 12);
  assert.equal(wide.marginLeftMm, 18);
  assert.ok(narrow.contentWidthMm > normal.contentWidthMm);
  assert.ok(normal.contentWidthMm > wide.contentWidthMm);
});

test('viewer printable layout model maps page and scale for preview/print parity', () => {
  const model = resolveViewerPrintableLayoutModel({
    paperSize: 'A3',
    orientation: 'landscape',
    margins: 'narrow',
    scale: 1.25,
    showDocumentTitle: true,
  });
  assert.equal(model.paperWidthMm, 420);
  assert.equal(model.paperHeightMm, 297);
  assert.equal(model.marginLeftMm, 8);
  assert.equal(model.contentWidthMm, 404);
  assert.equal(model.contentHeightMm, 281);
  assert.equal(model.contentScale, 1.25);
});

test('viewer preview metrics derive px geometry from runtime measurement', () => {
  const metrics = resolveViewerPreviewPageMetrics(
    {
      paperWidthMm: 420,
      paperHeightMm: 297,
      marginTopMm: 8,
      marginRightMm: 8,
      marginBottomMm: 8,
      marginLeftMm: 8,
      contentWidthMm: 404,
      contentHeightMm: 281,
      contentScale: 1,
    },
    {
      pxPerMmX: 4,
      pxPerMmY: 5,
    },
  );
  assert.equal(metrics.paperWidthPx, 1680);
  assert.equal(metrics.paperHeightPx, 1485);
  assert.equal(metrics.marginLeftPx, 32);
  assert.equal(metrics.contentWidthPx, 1616);
  assert.equal(metrics.contentHeightPx, 1405);
});

test('viewer preview css vars are derived from preview metrics', () => {
  const vars = resolveViewerPreviewCssVars({
    paperWidthMm: 420,
    paperHeightMm: 297,
    marginTopMm: 8,
    marginRightMm: 8,
    marginBottomMm: 8,
    marginLeftMm: 8,
    contentWidthMm: 404,
    contentHeightMm: 281,
    paperWidthPx: 0,
    paperHeightPx: 0,
    marginTopPx: 0,
    marginRightPx: 0,
    marginBottomPx: 0,
    marginLeftPx: 0,
    contentWidthPx: 0,
    contentHeightPx: 0,
    contentScale: 1,
  });
  assert.equal(vars['--viewer-preview-paper-width-px'], '0px');
  assert.equal(vars['--viewer-preview-paper-height-px'], '0px');
  assert.equal(vars['--viewer-preview-content-width-px'], '0px');
});

test('viewer effective preview metrics prefer effective measurement when available', () => {
  const metrics = resolveViewerEffectivePreviewPageMetrics({
    nominalMetrics: {
      paperWidthMm: 420,
      paperHeightMm: 297,
      marginTopMm: 8,
      marginRightMm: 8,
      marginBottomMm: 8,
      marginLeftMm: 8,
      contentWidthMm: 404,
      contentHeightMm: 281,
      paperWidthPx: 1680,
      paperHeightPx: 1188,
      marginTopPx: 32,
      marginRightPx: 32,
      marginBottomPx: 32,
      marginLeftPx: 32,
      contentWidthPx: 1616,
      contentHeightPx: 1124,
      contentScale: 1,
    },
    effectiveMeasurement: {
      paperWidthPx: 2000,
      paperHeightPx: 1400,
      contentWidthPx: 1900,
      contentHeightPx: 1300,
      marginTopPx: 20,
      marginRightPx: 30,
      marginBottomPx: 80,
      marginLeftPx: 70,
    },
  });
  assert.equal(metrics.paperWidthMm, 420);
  assert.equal(metrics.contentWidthMm, 404);
  assert.equal(metrics.paperWidthPx, 2000);
  assert.equal(metrics.paperHeightPx, 1400);
  assert.equal(metrics.contentWidthPx, 1900);
  assert.equal(metrics.marginBottomPx, 80);
});

test('viewer effective preview metrics fall back to nominal metrics when measurement is null', () => {
  const nominalMetrics = {
    paperWidthMm: 420,
    paperHeightMm: 297,
    marginTopMm: 8,
    marginRightMm: 8,
    marginBottomMm: 8,
    marginLeftMm: 8,
    contentWidthMm: 404,
    contentHeightMm: 281,
    paperWidthPx: 1680,
    paperHeightPx: 1188,
    marginTopPx: 32,
    marginRightPx: 32,
    marginBottomPx: 32,
    marginLeftPx: 32,
    contentWidthPx: 1616,
    contentHeightPx: 1124,
    contentScale: 1,
  };
  assert.deepEqual(
    resolveViewerEffectivePreviewPageMetrics({
      nominalMetrics,
      effectiveMeasurement: null,
    }),
    nominalMetrics,
  );
});

test('viewer print css vars are derived from real page metrics', () => {
  const vars = resolveViewerPrintCssVars({
    paperWidthMm: 297,
    paperHeightMm: 420,
    marginTopMm: 12,
    marginRightMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 12,
    contentWidthMm: 273,
    contentHeightMm: 396,
    contentScale: 1,
  });
  assert.equal(vars['--print-paper-width-mm'], '297');
  assert.equal(vars['--print-paper-height-mm'], '420');
  assert.equal(vars['--print-margin-left-mm'], '12');
  assert.equal(vars['--print-content-width-mm'], '273');
  assert.equal(vars['--print-content-height-mm'], '396');
});

test('viewer content placement metrics scales content inside preview box', () => {
  const metrics = resolveViewerContentPlacementMetrics({
    baseContentWidthPx: 1000,
    baseContentHeightPx: 500,
    previewContentWidthPx: 900,
    previewContentHeightPx: 600,
    scale: 1.25,
  });
  assert.equal(metrics.baseContentWidthPx, 1000);
  assert.equal(metrics.baseContentHeightPx, 500);
  assert.equal(metrics.scaledContentWidthPx, 1250);
  assert.equal(metrics.scaledContentHeightPx, 625);
  assert.equal(metrics.scale, 1.25);
  assert.equal(metrics.overflowsHorizontally, true);
  assert.equal(metrics.overflowsVertically, true);
});

test('viewer content placement metrics clamps invalid sizes safely', () => {
  const metrics = resolveViewerContentPlacementMetrics({
    baseContentWidthPx: 0,
    baseContentHeightPx: -10,
    previewContentWidthPx: 0,
    previewContentHeightPx: 0,
    scale: Number.NaN,
  });
  assert.equal(metrics.baseContentWidthPx, 1);
  assert.equal(metrics.baseContentHeightPx, 1);
  assert.equal(metrics.scaledContentWidthPx, 1);
  assert.equal(metrics.scaledContentHeightPx, 1);
  assert.equal(metrics.scale, 1);
  assert.equal(metrics.overflowsHorizontally, false);
  assert.equal(metrics.overflowsVertically, false);
});

test('viewer print page css is derived from printable model', () => {
  const css = resolveViewerPrintPageCss({
    paperWidthMm: 297,
    paperHeightMm: 420,
    marginTopMm: 12,
    marginRightMm: 12,
    marginBottomMm: 12,
    marginLeftMm: 12,
    contentWidthMm: 273,
    contentHeightMm: 396,
    contentScale: 1,
  });
  assert.equal(css, '@media print { @page { size: 297mm 420mm; margin: 12mm 12mm 12mm 12mm; } }');
});

test('viewer printable text layout includes header title grid footer in order', () => {
  const layout = resolveViewerPrintableTextLayout({
    showHeaderFooter: true,
    headerText: '  Encabezado  ',
    footerText: '  Pie  ',
    showDocumentTitle: true,
    projectName: '  Malla 2026  ',
  });
  assert.equal(layout.headerText, 'Encabezado');
  assert.equal(layout.documentTitle, 'Malla 2026');
  assert.equal(layout.footerText, 'Pie');
  assert.deepEqual(layout.blockOrder, ['header', 'title', 'grid', 'footer']);
});

test('viewer printable text layout omits title when toggle is disabled', () => {
  const layout = resolveViewerPrintableTextLayout({
    showHeaderFooter: true,
    headerText: 'Header',
    footerText: 'Footer',
    showDocumentTitle: false,
    projectName: 'Documento',
  });
  assert.equal(layout.documentTitle, '');
  assert.deepEqual(layout.blockOrder, ['header', 'grid', 'footer']);
});

test('viewer printable text layout omits header and footer when disabled or empty', () => {
  const hiddenByToggle = resolveViewerPrintableTextLayout({
    showHeaderFooter: false,
    headerText: 'Header',
    footerText: 'Footer',
    showDocumentTitle: true,
    projectName: 'Documento',
  });
  assert.deepEqual(hiddenByToggle.blockOrder, ['title', 'grid']);

  const hiddenByEmptyText = resolveViewerPrintableTextLayout({
    showHeaderFooter: true,
    headerText: '   ',
    footerText: '',
    showDocumentTitle: true,
    projectName: 'Documento',
  });
  assert.deepEqual(hiddenByEmptyText.blockOrder, ['title', 'grid']);
});
