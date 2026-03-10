import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createDefaultViewerPrintSettings,
  normalizeViewerPrintSettings,
  resolveViewerPrintPageCss,
  resolveViewerPrintLayout,
  resolveViewerPrintableLayoutModel,
  resolveViewerPanelMode,
} from './viewer-print.ts';

test('viewer print settings defaults are stable', () => {
  assert.deepEqual(createDefaultViewerPrintSettings(), {
    paperSize: 'A3',
    orientation: 'portrait',
    scale: 1,
    margins: 'normal',
  });
});

test('viewer print settings normalization clamps scale and validates enums', () => {
  const normalized = normalizeViewerPrintSettings({
    paperSize: 'A3',
    orientation: 'landscape',
    scale: 2,
    margins: 'wide',
  });
  assert.equal(normalized.paperSize, 'A3');
  assert.equal(normalized.orientation, 'landscape');
  assert.equal(normalized.scale, 1.5);
  assert.equal(normalized.margins, 'wide');

  const fallback = normalizeViewerPrintSettings({
    paperSize: 'Letter',
    orientation: 'diagonal',
    scale: 0.1,
    margins: 'zero',
  });
  assert.equal(fallback.paperSize, 'A3');
  assert.equal(fallback.orientation, 'portrait');
  assert.equal(fallback.scale, 0.5);
  assert.equal(fallback.margins, 'normal');
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
  });
  assert.equal(portrait.pageWidthMm, 297);
  assert.equal(portrait.pageHeightMm, 420);
  assert.equal(portrait.marginMm, 12);

  const landscape = resolveViewerPrintLayout({
    paperSize: 'A3',
    orientation: 'landscape',
    margins: 'wide',
    scale: 1,
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
