import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createDefaultViewerMeasuredPxPerMm,
  createDefaultViewerPrintSettings,
  normalizeViewerMeasuredPxPerMm,
  normalizeViewerPrintSettings,
  resolveViewerContentPlacementMetrics,
  resolveViewerPageMetrics,
  resolveViewerPaginationGridMetrics,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPrintCssVars,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPrintableTextLayout,
  resolveViewerPrintableLayoutModel,
  resolveViewerPanelMode,
  resolveViewerVerticalPaginationMetrics,
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
  assert.equal(vars['--viewer-preview-content-height-px'], '0px');
  assert.equal(vars['--viewer-preview-paper-padding-top-px'], '0px');
  assert.equal(vars['--viewer-preview-paper-padding-right-px'], '0px');
  assert.equal(vars['--viewer-preview-paper-padding-bottom-px'], '0px');
  assert.equal(vars['--viewer-preview-paper-padding-left-px'], '0px');
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

test('viewer pagination grid keeps a single tile when content fits on one page', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 480,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  assert.equal(metrics.pagesX, 1);
  assert.equal(metrics.pagesY, 1);
  assert.equal(metrics.pageCount, 1);
  assert.deepEqual(metrics.tiles, [
    {
      pageNumber: 1,
      row: 0,
      col: 0,
      offsetX: 0,
      offsetY: 0,
      sliceWidthPx: 500,
      sliceHeightPx: 480,
    },
  ]);
  assert.equal(metrics.hasHorizontalPagination, false);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer pagination grid resolves multiple vertical tiles with stable offsets', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  assert.equal(metrics.pagesX, 1);
  assert.equal(metrics.pagesY, 3);
  assert.deepEqual(
    metrics.tiles.map((tile) => ({
      pageNumber: tile.pageNumber,
      row: tile.row,
      col: tile.col,
      offsetX: tile.offsetX,
      offsetY: tile.offsetY,
      sliceHeightPx: tile.sliceHeightPx,
    })),
    [
      { pageNumber: 1, row: 0, col: 0, offsetX: 0, offsetY: 0, sliceHeightPx: 600 },
      { pageNumber: 2, row: 1, col: 0, offsetX: 0, offsetY: 600, sliceHeightPx: 600 },
      { pageNumber: 3, row: 2, col: 0, offsetX: 0, offsetY: 1200, sliceHeightPx: 50 },
    ],
  );
});

test('viewer pagination grid resolves multiple horizontal tiles without deciding render policy', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 500,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  assert.equal(metrics.pagesX, 3);
  assert.equal(metrics.pagesY, 1);
  assert.equal(metrics.pageCount, 3);
  assert.deepEqual(
    metrics.tiles.map((tile) => ({
      pageNumber: tile.pageNumber,
      row: tile.row,
      col: tile.col,
      offsetX: tile.offsetX,
      offsetY: tile.offsetY,
      sliceWidthPx: tile.sliceWidthPx,
    })),
    [
      { pageNumber: 1, row: 0, col: 0, offsetX: 0, offsetY: 0, sliceWidthPx: 900 },
      { pageNumber: 2, row: 0, col: 1, offsetX: 900, offsetY: 0, sliceWidthPx: 900 },
      { pageNumber: 3, row: 0, col: 2, offsetX: 1800, offsetY: 0, sliceWidthPx: 100 },
    ],
  );
  assert.equal(metrics.hasHorizontalPagination, true);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer pagination grid resolves a real 2d tiling matrix in row-major order', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  assert.equal(metrics.pagesX, 3);
  assert.equal(metrics.pagesY, 3);
  assert.equal(metrics.pageCount, 9);
  assert.deepEqual(
    metrics.tiles.map((tile) => `${tile.pageNumber}:${tile.row},${tile.col}@${tile.offsetX},${tile.offsetY}`),
    [
      '1:0,0@0,0',
      '2:0,1@900,0',
      '3:0,2@1800,0',
      '4:1,0@0,600',
      '5:1,1@900,600',
      '6:1,2@1800,600',
      '7:2,0@0,1200',
      '8:2,1@900,1200',
      '9:2,2@1800,1200',
    ],
  );
});

test('viewer pagination grid handles exact edges and degenerate sizes safely', () => {
  const exact = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1800,
    scaledContentHeightPx: 1200,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  assert.equal(exact.pagesX, 2);
  assert.equal(exact.pagesY, 2);
  assert.deepEqual(
    exact.tiles.map((tile) => [tile.sliceWidthPx, tile.sliceHeightPx]),
    [
      [900, 600],
      [900, 600],
      [900, 600],
      [900, 600],
    ],
  );

  const degenerate = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 0,
    scaledContentHeightPx: 0,
    usablePageWidthPx: 0,
    usablePageHeightPx: 0,
  });
  assert.equal(degenerate.pagesX, 1);
  assert.equal(degenerate.pagesY, 1);
  assert.deepEqual(degenerate.tiles, [
    {
      pageNumber: 1,
      row: 0,
      col: 0,
      offsetX: 0,
      offsetY: 0,
      sliceWidthPx: 1,
      sliceHeightPx: 1,
    },
  ]);
});

test('viewer printed pages preserve 1x1 tile-to-page mapping', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 480,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(grid);
  assert.deepEqual(printedPages, [
    {
      pageNumber: 1,
      sourceTilePageNumber: 1,
      tileRow: 0,
      tileCol: 0,
      printOffsetX: 0,
      printOffsetY: 0,
      sliceWidthPx: 500,
      sliceHeightPx: 480,
      viewportWidthPx: 500,
      viewportHeightPx: 480,
      isLastColumn: true,
      isLastRow: true,
    },
  ]);
});

test('viewer printed pages linearize 1xN tiles in stable row-major order', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(grid);
  assert.deepEqual(
    printedPages.map((page) => ({
      pageNumber: page.pageNumber,
      tileRow: page.tileRow,
      tileCol: page.tileCol,
      printOffsetY: page.printOffsetY,
      sliceHeightPx: page.sliceHeightPx,
    })),
    [
      { pageNumber: 1, tileRow: 0, tileCol: 0, printOffsetY: 0, sliceHeightPx: 600 },
      { pageNumber: 2, tileRow: 1, tileCol: 0, printOffsetY: 600, sliceHeightPx: 600 },
      { pageNumber: 3, tileRow: 2, tileCol: 0, printOffsetY: 1200, sliceHeightPx: 50 },
    ],
  );
});

test('viewer printed pages linearize Mx1 tiles in stable row-major order', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 500,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(grid);
  assert.deepEqual(
    printedPages.map((page) => ({
      pageNumber: page.pageNumber,
      tileRow: page.tileRow,
      tileCol: page.tileCol,
      printOffsetX: page.printOffsetX,
      sliceWidthPx: page.sliceWidthPx,
    })),
    [
      { pageNumber: 1, tileRow: 0, tileCol: 0, printOffsetX: 0, sliceWidthPx: 900 },
      { pageNumber: 2, tileRow: 0, tileCol: 1, printOffsetX: 900, sliceWidthPx: 900 },
      { pageNumber: 3, tileRow: 0, tileCol: 2, printOffsetX: 1800, sliceWidthPx: 100 },
    ],
  );
});

test('viewer printed pages linearize MxN tiles independently from preview tile order', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const scrambledTiles = [
    grid.tiles[4],
    grid.tiles[0],
    grid.tiles[8],
    grid.tiles[3],
    grid.tiles[6],
    grid.tiles[2],
    grid.tiles[7],
    grid.tiles[1],
    grid.tiles[5],
  ];
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid({
    ...grid,
    tiles: scrambledTiles,
  });
  assert.deepEqual(
    printedPages.map((page) => `${page.pageNumber}:${page.tileRow},${page.tileCol}@${page.printOffsetX},${page.printOffsetY}`),
    [
      '1:0,0@0,0',
      '2:0,1@900,0',
      '3:0,2@1800,0',
      '4:1,0@0,600',
      '5:1,1@900,600',
      '6:1,2@1800,600',
      '7:2,0@0,1200',
      '8:2,1@900,1200',
      '9:2,2@1800,1200',
    ],
  );
});

test('viewer printed pages handle degenerate input safely', () => {
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid({
    scaledContentWidthPx: 0,
    scaledContentHeightPx: 0,
    usablePageWidthPx: 0,
    usablePageHeightPx: 0,
    tiles: [
      {
        pageNumber: 99,
        row: 0,
        col: 0,
        offsetX: 123,
        offsetY: 456,
        sliceWidthPx: 789,
        sliceHeightPx: 101,
      },
    ],
  });
  assert.deepEqual(printedPages, [
    {
      pageNumber: 1,
      sourceTilePageNumber: 99,
      tileRow: 0,
      tileCol: 0,
      printOffsetX: 0,
      printOffsetY: 0,
      sliceWidthPx: 1,
      sliceHeightPx: 1,
      viewportWidthPx: 1,
      viewportHeightPx: 1,
      isLastColumn: true,
      isLastRow: true,
    },
  ]);
});

test('viewer vertical pagination keeps a single page when content fits', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 480,
    previewContentHeightPx: 600,
  });
  assert.equal(metrics.pageCount, 1);
  assert.deepEqual(metrics.pageOffsetsPx, [0]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [480]);
  assert.equal(metrics.lastPageContentHeightPx, 480);
  assert.equal(metrics.hasPartialLastPage, true);
  assert.equal(metrics.pageHeightPx, 600);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer vertical pagination keeps a single page when content fits exactly', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 600,
    previewContentHeightPx: 600,
  });
  assert.equal(metrics.pageCount, 1);
  assert.deepEqual(metrics.pageOffsetsPx, [0]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [600]);
  assert.equal(metrics.lastPageContentHeightPx, 600);
  assert.equal(metrics.hasPartialLastPage, false);
  assert.equal(metrics.pageHeightPx, 600);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer vertical pagination resolves two pages when content overflows once', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 601,
    previewContentHeightPx: 600,
  });
  assert.equal(metrics.pageCount, 2);
  assert.deepEqual(metrics.pageOffsetsPx, [0, 600]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [600, 1]);
  assert.equal(metrics.lastPageContentHeightPx, 1);
  assert.equal(metrics.hasPartialLastPage, true);
  assert.equal(metrics.hasVerticalPagination, true);
});

test('viewer vertical pagination resolves exact two-page content without partial last page', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 1200,
    previewContentHeightPx: 600,
  });
  assert.equal(metrics.pageCount, 2);
  assert.deepEqual(metrics.pageOffsetsPx, [0, 600]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [600, 600]);
  assert.equal(metrics.lastPageContentHeightPx, 600);
  assert.equal(metrics.hasPartialLastPage, false);
});

test('viewer vertical pagination resolves N pages with stable offsets', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 2500,
    previewContentHeightPx: 600,
  });
  assert.equal(metrics.pageCount, 5);
  assert.deepEqual(metrics.pageOffsetsPx, [0, 600, 1200, 1800, 2400]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [600, 600, 600, 600, 100]);
  assert.equal(metrics.lastPageContentHeightPx, 100);
  assert.equal(metrics.hasPartialLastPage, true);
  assert.equal(metrics.pageHeightPx, 600);
});

test('viewer vertical pagination can derive the visible stack from 2d grid metrics', () => {
  const gridMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 1250,
    previewContentHeightPx: 600,
    paginationGridMetrics: gridMetrics,
  });
  assert.equal(metrics.pageCount, 3);
  assert.deepEqual(metrics.pageOffsetsPx, [0, 600, 1200]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [600, 600, 50]);
  assert.equal(metrics.pageHeightPx, 600);
  assert.equal(metrics.hasPartialLastPage, true);
  assert.equal(metrics.hasVerticalPagination, true);
});

test('viewer vertical pagination preserves single-tile semantics from a 1x1 grid', () => {
  const gridMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 480,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
  });
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 480,
    previewContentHeightPx: 600,
    paginationGridMetrics: gridMetrics,
  });
  assert.equal(gridMetrics.pagesX, 1);
  assert.equal(gridMetrics.pagesY, 1);
  assert.equal(gridMetrics.pageCount, 1);
  assert.deepEqual(
    gridMetrics.tiles.map((tile) => ({
      row: tile.row,
      col: tile.col,
      offsetX: tile.offsetX,
      offsetY: tile.offsetY,
    })),
    [{ row: 0, col: 0, offsetX: 0, offsetY: 0 }],
  );
  assert.equal(metrics.pageCount, 1);
  assert.deepEqual(metrics.pageOffsetsPx, [0]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [480]);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer vertical pagination clamps degenerate heights safely', () => {
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 0,
    previewContentHeightPx: 0,
  });
  assert.equal(metrics.pageCount, 1);
  assert.deepEqual(metrics.pageOffsetsPx, [0]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [1]);
  assert.equal(metrics.lastPageContentHeightPx, 0);
  assert.equal(metrics.hasPartialLastPage, false);
  assert.equal(metrics.pageHeightPx, 1);
  assert.equal(metrics.hasVerticalPagination, false);
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
