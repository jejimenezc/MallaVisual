import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createDefaultViewerPrintSettings,
  normalizeViewerPrintSettings,
  resolveViewerPrintPageCss,
  resolveViewerPrintLayout,
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

test('viewer print layout resolves orientation and margins', () => {
  const portrait = resolveViewerPrintLayout({
    paperSize: 'A3',
    orientation: 'portrait',
    margins: 'normal',
    scale: 1,
    showDocumentTitle: false,
  });
  assert.equal(portrait.pageWidthMm, 297);
  assert.equal(portrait.pageHeightMm, 420);
  assert.equal(portrait.marginMm, 12);

  const landscape = resolveViewerPrintLayout({
    paperSize: 'A3',
    orientation: 'landscape',
    margins: 'wide',
    scale: 1,
    showDocumentTitle: false,
  });
  assert.equal(landscape.pageWidthMm, 420);
  assert.equal(landscape.pageHeightMm, 297);
  assert.equal(landscape.marginMm, 18);
  assert.ok(landscape.pageInnerHeightPx > 0);
  assert.ok(landscape.pageInnerWidthPx > landscape.pageInnerHeightPx);
});

test('viewer printable layout model maps page and scale for preview/print parity', () => {
  const model = resolveViewerPrintableLayoutModel({
    paperSize: 'A3',
    orientation: 'landscape',
    margins: 'narrow',
    scale: 1.25,
    showDocumentTitle: true,
  });
  assert.equal(model.pageWidthMm, 420);
  assert.equal(model.pageHeightMm, 297);
  assert.equal(model.marginMm, 8);
  assert.equal(model.contentScale, 1.25);
  assert.ok(model.frameWidthPx > model.frameMinHeightPx);
  assert.ok(model.framePaddingPx > 0);
});

test('viewer print page css is derived from printable model', () => {
  const css = resolveViewerPrintPageCss({
    pageWidthMm: 297,
    pageHeightMm: 420,
    marginMm: 12,
    frameWidthPx: 0,
    frameMinHeightPx: 0,
    framePaddingPx: 0,
    contentScale: 1,
  });
  assert.equal(css, '@media print { @page { size: 297mm 420mm; margin: 12mm; } }');
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
