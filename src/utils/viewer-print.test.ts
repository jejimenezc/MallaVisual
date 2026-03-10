import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createDefaultViewerPrintSettings,
  normalizeViewerPrintSettings,
  resolveViewerPageCssVars,
  resolveViewerPageMetrics,
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
    previewSheetScaleX: 1.26,
    previewSheetScaleY: 1.2,
    margins: 'normal',
    showDocumentTitle: false,
  });
});

test('viewer print settings normalization clamps scale and validates enums', () => {
  const normalized = normalizeViewerPrintSettings({
    paperSize: 'A3',
    orientation: 'landscape',
    scale: 2,
    previewSheetScaleX: 2,
    previewSheetScaleY: 0.7,
    margins: 'wide',
    showDocumentTitle: true,
  });
  assert.equal(normalized.paperSize, 'A3');
  assert.equal(normalized.orientation, 'landscape');
  assert.equal(normalized.scale, 1.5);
  assert.equal(normalized.previewSheetScaleX, 1.6);
  assert.equal(normalized.previewSheetScaleY, 0.8);
  assert.equal(normalized.margins, 'wide');
  assert.equal(normalized.showDocumentTitle, true);

  const fallback = normalizeViewerPrintSettings({
    paperSize: 'Letter',
    orientation: 'diagonal',
    scale: 0.1,
    previewSheetScaleX: 0.1,
    previewSheetScaleY: 2,
    margins: 'zero',
    showDocumentTitle: 'yes',
  });
  assert.equal(fallback.paperSize, 'A3');
  assert.equal(fallback.orientation, 'portrait');
  assert.equal(fallback.scale, 0.5);
  assert.equal(fallback.previewSheetScaleX, 0.8);
  assert.equal(fallback.previewSheetScaleY, 1.2);
  assert.equal(fallback.margins, 'normal');
  assert.equal(fallback.showDocumentTitle, false);
});

test('viewer print settings normalization maps legacy previewScreenScale into both axes', () => {
  const normalized = normalizeViewerPrintSettings({
    previewScreenScale: 1.1,
  });
  assert.equal(normalized.previewSheetScaleX, 1.1);
  assert.equal(normalized.previewSheetScaleY, 1.1);
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
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
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
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
    showDocumentTitle: false,
  });
  assert.equal(landscape.paperWidthMm, 420);
  assert.equal(landscape.paperHeightMm, 297);
  assert.equal(landscape.marginLeftMm, 18);
  assert.ok(landscape.contentHeightPx > 0);
  assert.ok(landscape.contentWidthPx > landscape.contentHeightPx);
});

test('viewer page metrics maps narrow normal and wide presets', () => {
  const narrow = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'narrow',
    scale: 1,
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
    showDocumentTitle: false,
  });
  const normal = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'normal',
    scale: 1,
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
    showDocumentTitle: false,
  });
  const wide = resolveViewerPageMetrics({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'wide',
    scale: 1,
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
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
    previewSheetScaleX: 1,
    previewSheetScaleY: 1,
    showDocumentTitle: true,
  });
  assert.equal(model.paperWidthMm, 420);
  assert.equal(model.paperHeightMm, 297);
  assert.equal(model.marginLeftMm, 8);
  assert.equal(model.contentWidthMm, 404);
  assert.equal(model.contentHeightMm, 281);
  assert.equal(model.contentScale, 1.25);
  assert.ok(model.paperWidthPx > model.paperHeightPx);
  assert.ok(model.marginLeftPx > 0);
});

test('viewer page css vars are derived from resolved metrics', () => {
  const vars = resolveViewerPageCssVars({
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
  assert.equal(vars['--print-paper-width-mm'], '420');
  assert.equal(vars['--print-paper-height-mm'], '297');
  assert.equal(vars['--print-margin-left-mm'], '8');
  assert.equal(vars['--print-content-width-mm'], '404');
  assert.equal(vars['--print-content-height-mm'], '281');
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
