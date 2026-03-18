import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  resolveViewerAxisXColumnSegments,
  resolveViewerAxisYLineSegments,
  createDefaultViewerMeasuredPxPerMm,
  createDefaultViewerPrintSettings,
  normalizeViewerMeasuredPxPerMm,
  normalizeViewerPrintSettings,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePrintScale,
  resolveViewerGridCutGuides,
  resolveViewerPageEditorialHeights,
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerProtectedAxisXCuts,
  resolveViewerProtectedAxisYCuts,
  resolveViewerPaginationAxisCuts,
  resolveViewerPageMetrics,
  resolveViewerPageSliceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPrintedPageEditorialLayout,
  resolveViewerPrintCssVars,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPrintableTextLayout,
  resolveViewerPrintableLayoutModel,
  resolveViewerPanelMode,
  resolveViewerVerticalPaginationMetrics,
} from './viewer-print.ts';
import type { ViewerRenderModel } from './viewer-theme.ts';

const createViewerRenderModelFixture = (): ViewerRenderModel => ({
  projectName: 'Test',
  gridRows: 2,
  gridCols: 3,
  width: 450,
  height: 255,
  columnWidths: [120, 140, 160],
  rowHeights: [90, 110],
  colOffsets: [0, 130, 280],
  rowOffsets: [0, 100],
  bandsHeight: 40,
  bandsRenderRows: [
    {
      id: 'hdr-1',
      kind: 'header',
      top: 0,
      height: 18,
      cells: [
        {
          col: 0,
          text: 'A',
          left: 0,
          width: 120,
          style: {
            backgroundColor: '#fff',
            textColor: '#111',
            textAlign: 'center',
            border: 'thin',
            fontSizePx: 12,
            paddingX: 0,
            paddingY: 0,
            bold: false,
            italic: false,
          },
        },
        {
          col: 1,
          text: 'B',
          left: 130,
          width: 140,
          style: {
            backgroundColor: '#fff',
            textColor: '#111',
            textAlign: 'center',
            border: 'thin',
            fontSizePx: 12,
            paddingX: 0,
            paddingY: 0,
            bold: false,
            italic: false,
          },
        },
        {
          col: 2,
          text: 'C',
          left: 280,
          width: 160,
          style: {
            backgroundColor: '#fff',
            textColor: '#111',
            textAlign: 'center',
            border: 'thin',
            fontSizePx: 12,
            paddingX: 0,
            paddingY: 0,
            bold: false,
            italic: false,
          },
        },
      ],
    },
  ],
  items: [],
  theme: {
    gapX: 10,
    gapY: 10,
    minColumnWidth: 100,
    minRowHeight: 80,
    cellPadding: 0,
    blockBorderWidth: 1,
    blockBorderRadius: 8,
    typographyScale: 1,
    showHeaderFooter: true,
    headerText: '',
    footerText: '',
  },
});

const sortTilesRowMajor = <Tile extends { row: number; col: number; pageNumber: number }>(tiles: Tile[]): Tile[] =>
  [...tiles].sort((left, right) => {
    if (left.row !== right.row) return left.row - right.row;
    if (left.col !== right.col) return left.col - right.col;
    return left.pageNumber - right.pageNumber;
  });

const resolveViewerPrintPipelineScenario = (input: {
  settings?: Partial<ReturnType<typeof createDefaultViewerPrintSettings>>;
  baseContentWidthPx: number;
  baseContentHeightPx: number;
  measuredPxPerMm?: { pxPerMmX: number; pxPerMmY: number };
}) => {
  const settings = normalizeViewerPrintSettings({
    ...createDefaultViewerPrintSettings(),
    ...input.settings,
  });
  const pageMetrics = resolveViewerPageMetrics(settings);
  const printableLayoutModel = resolveViewerPrintableLayoutModel(settings);
  const previewMetrics = resolveViewerPreviewPageMetrics(pageMetrics, input.measuredPxPerMm ?? { pxPerMmX: 4, pxPerMmY: 4 });
  const editorialHeights = resolveViewerPageEditorialHeights({
    showDocumentTitle: settings.showDocumentTitle,
    documentTitleOverride: settings.documentTitleOverride,
    pageLayoutMode: settings.pageLayoutMode,
    showHeader: settings.showHeader,
    headerText: settings.headerText,
    showFooter: settings.showFooter,
    footerText: settings.footerText,
    showPageNumbers: settings.showPageNumbers,
    projectName: 'Pipeline Test',
    contentHeightMm: pageMetrics.contentHeightMm,
    pxPerMmY: (input.measuredPxPerMm ?? { pxPerMmX: 4, pxPerMmY: 4 }).pxPerMmY,
  });
  const effectiveScale = resolveViewerEffectivePrintScale({
    fitToWidth: settings.fitToWidth,
    manualScale: settings.scale,
    baseContentWidthPx: input.baseContentWidthPx,
    previewContentWidthPx: previewMetrics.contentWidthPx,
  });
  const contentPlacementMetrics = resolveViewerContentPlacementMetrics({
    baseContentWidthPx: input.baseContentWidthPx,
    baseContentHeightPx: input.baseContentHeightPx,
    previewContentWidthPx: previewMetrics.contentWidthPx,
    previewContentHeightPx: previewMetrics.contentHeightPx,
    scale: effectiveScale,
  });
  const gridMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
    usablePageWidthPx: previewMetrics.contentWidthPx,
    usablePageHeightPx: previewMetrics.contentHeightPx,
    firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
    continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(gridMetrics);

  return {
    settings,
    pageMetrics,
    printableLayoutModel,
    previewMetrics,
    editorialHeights,
    effectiveScale,
    contentPlacementMetrics,
    gridMetrics,
    printedPages,
  };
};

const assertViewerPaginationInvariants = (input: {
  gridMetrics: ReturnType<typeof resolveViewerPaginationGridMetrics>;
  printedPages: ReturnType<typeof resolveViewerPrintedPagesFromPaginationGrid>;
  fitToWidth?: boolean;
}) => {
  const { gridMetrics, printedPages } = input;
  const rowMajorTiles = sortTilesRowMajor(gridMetrics.tiles);

  assert.equal(gridMetrics.pageCount, gridMetrics.pagesX * gridMetrics.pagesY);
  assert.equal(gridMetrics.tiles.length, gridMetrics.pageCount);
  assert.equal(printedPages.length, gridMetrics.tiles.length);
  assert.deepEqual(gridMetrics.tiles, rowMajorTiles);

  rowMajorTiles.forEach((tile, index) => {
    assert.equal(tile.pageNumber, index + 1);
    assert.ok(tile.offsetX >= 0);
    assert.ok(tile.offsetY >= 0);
    assert.ok(tile.sliceWidthPx >= 1);
    assert.ok(tile.sliceHeightPx >= 1);
    assert.ok(tile.offsetX + tile.sliceWidthPx <= gridMetrics.scaledContentWidthPx || gridMetrics.scaledContentWidthPx === 0);
    assert.ok(tile.offsetY + tile.sliceHeightPx <= gridMetrics.scaledContentHeightPx || gridMetrics.scaledContentHeightPx === 0);
  });

  for (let row = 0; row < gridMetrics.pagesY; row += 1) {
    const rowTiles = rowMajorTiles.filter((tile) => tile.row === row);
    assert.equal(rowTiles.length, gridMetrics.pagesX);

    rowTiles.forEach((tile, colIndex) => {
      assert.equal(tile.col, colIndex);
      assert.equal(tile.offsetY, rowTiles[0]?.offsetY ?? 0);
      assert.equal(tile.sliceHeightPx, rowTiles[0]?.sliceHeightPx ?? 0);
      if (colIndex > 0) {
        const previousTile = rowTiles[colIndex - 1]!;
        assert.ok(tile.offsetX >= previousTile.offsetX + previousTile.sliceWidthPx);
      }
    });
  }

  for (let col = 0; col < gridMetrics.pagesX; col += 1) {
    const columnTiles = rowMajorTiles.filter((tile) => tile.col === col);
    assert.equal(columnTiles.length, gridMetrics.pagesY);
    columnTiles.forEach((tile, rowIndex) => {
      assert.equal(tile.row, rowIndex);
      assert.equal(tile.offsetX, columnTiles[0]?.offsetX ?? 0);
      if (rowIndex > 0) {
        const previousTile = columnTiles[rowIndex - 1]!;
        assert.ok(tile.offsetY >= previousTile.offsetY + previousTile.sliceHeightPx);
      }
    });
  }

  assert.deepEqual(
    printedPages.map((page) => ({
      pageNumber: page.pageNumber,
      tileRow: page.tileRow,
      tileCol: page.tileCol,
      printOffsetX: page.printOffsetX,
      printOffsetY: page.printOffsetY,
      sliceWidthPx: page.sliceWidthPx,
      sliceHeightPx: page.sliceHeightPx,
    })),
    rowMajorTiles.map((tile, index) => ({
      pageNumber: index + 1,
      tileRow: tile.row,
      tileCol: tile.col,
      printOffsetX: tile.offsetX,
      printOffsetY: tile.offsetY,
      sliceWidthPx: tile.sliceWidthPx,
      sliceHeightPx: tile.sliceHeightPx,
    })),
  );

  if (input.fitToWidth) {
    assert.equal(gridMetrics.pagesX, 1);
    assert.equal(gridMetrics.hasHorizontalPagination, false);
  }
};

test('viewer print settings defaults are stable', () => {
  assert.deepEqual(createDefaultViewerPrintSettings(), {
    paperSize: 'A3',
    orientation: 'portrait',
    scale: 1,
    fitToWidth: false,
    margins: 'normal',
    showDocumentTitle: false,
    documentTitleFontSize: 18,
    documentTitleOverride: '',
    pageLayoutMode: 'same-on-all-pages',
    showHeader: false,
    headerText: '',
    showFooter: false,
    footerText: '',
    showPageNumbers: false,
  });
});

test('viewer print settings normalization clamps scale and validates enums', () => {
  const normalized = normalizeViewerPrintSettings({
    paperSize: 'A3',
    orientation: 'landscape',
    scale: 2,
    fitToWidth: true,
    margins: 'wide',
    showDocumentTitle: true,
    documentTitleFontSize: 40,
    documentTitleOverride: 'Titulo',
    pageLayoutMode: 'first-page-only',
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showPageNumbers: true,
  });
  assert.equal(normalized.paperSize, 'A3');
  assert.equal(normalized.orientation, 'landscape');
  assert.equal(normalized.scale, 1.5);
  assert.equal(normalized.fitToWidth, true);
  assert.equal(normalized.margins, 'wide');
  assert.equal(normalized.showDocumentTitle, true);
  assert.equal(normalized.documentTitleFontSize, 32);
  assert.equal(normalized.documentTitleOverride, 'Titulo');
  assert.equal(normalized.pageLayoutMode, 'first-page-only');
  assert.equal(normalized.showHeader, true);
  assert.equal(normalized.headerText, 'Header');
  assert.equal(normalized.showFooter, true);
  assert.equal(normalized.footerText, 'Footer');
  assert.equal(normalized.showPageNumbers, true);

  const fallback = normalizeViewerPrintSettings({
    paperSize: 'Letter',
    orientation: 'diagonal',
    scale: 0.1,
    margins: 'zero',
    showDocumentTitle: 'yes',
    documentTitleFontSize: 0,
  });
  assert.equal(fallback.paperSize, 'A3');
  assert.equal(fallback.orientation, 'portrait');
  assert.equal(fallback.scale, 0.5);
  assert.equal(fallback.fitToWidth, false);
  assert.equal(fallback.margins, 'normal');
  assert.equal(fallback.showDocumentTitle, false);
  assert.equal(fallback.documentTitleFontSize, 16);
  assert.equal(fallback.documentTitleOverride, '');
  assert.equal(fallback.pageLayoutMode, 'same-on-all-pages');
  assert.equal(fallback.showHeader, false);
  assert.equal(fallback.headerText, '');
  assert.equal(fallback.showFooter, false);
  assert.equal(fallback.footerText, '');
  assert.equal(fallback.showPageNumbers, false);
});

test('viewer effective print scale uses clamped manual scale when fit-to-width is disabled', () => {
  assert.equal(
    resolveViewerEffectivePrintScale({
      fitToWidth: false,
      manualScale: 2,
      baseContentWidthPx: 600,
      previewContentWidthPx: 400,
    }),
    1.5,
  );
});

test('viewer effective print scale computes fit-to-width without max clamp and handles degenerates', () => {
  assert.equal(
    resolveViewerEffectivePrintScale({
      fitToWidth: true,
      manualScale: 0.5,
      baseContentWidthPx: 200,
      previewContentWidthPx: 600,
    }),
    3,
  );
  assert.equal(
    resolveViewerEffectivePrintScale({
      fitToWidth: true,
      manualScale: 1,
      baseContentWidthPx: 0,
      previewContentWidthPx: 600,
    }),
    1,
  );
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
    ...createDefaultViewerPrintSettings(),
  });
  assert.equal(portrait.paperWidthMm, 297);
  assert.equal(portrait.paperHeightMm, 420);
  assert.equal(portrait.marginLeftMm, 12);
  assert.equal(portrait.marginTopMm, 12);
  assert.equal(portrait.contentWidthMm, 273);
  assert.equal(portrait.contentHeightMm, 396);
  assert.equal(portrait.contentScale, 1);

  const landscape = resolveViewerPageMetrics({
    ...createDefaultViewerPrintSettings(),
    orientation: 'landscape',
    margins: 'wide',
  });
  assert.equal(landscape.paperWidthMm, 420);
  assert.equal(landscape.paperHeightMm, 297);
  assert.equal(landscape.marginLeftMm, 18);
  assert.ok(landscape.contentHeightMm > 0);
  assert.ok(landscape.contentWidthMm > landscape.contentHeightMm);
});

test('viewer page metrics maps narrow normal and wide presets', () => {
  const narrow = resolveViewerPageMetrics({
    ...createDefaultViewerPrintSettings(),
    margins: 'narrow',
  });
  const normal = resolveViewerPageMetrics({
    ...createDefaultViewerPrintSettings(),
  });
  const wide = resolveViewerPageMetrics({
    ...createDefaultViewerPrintSettings(),
    margins: 'wide',
  });
  assert.equal(narrow.marginLeftMm, 8);
  assert.equal(normal.marginLeftMm, 12);
  assert.equal(wide.marginLeftMm, 18);
  assert.ok(narrow.contentWidthMm > normal.contentWidthMm);
  assert.ok(normal.contentWidthMm > wide.contentWidthMm);
});

test('viewer printable layout model maps page and scale for preview/print parity', () => {
  const model = resolveViewerPrintableLayoutModel({
    ...createDefaultViewerPrintSettings(),
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

test('viewer print pipeline keeps preview and print contracts aligned across a critical settings matrix', () => {
  const cases = [
    {
      name: 'A3 portrait normal 1x1',
      settings: {},
      baseContentWidthPx: 600,
      baseContentHeightPx: 500,
      expectedPagesX: 1,
      expectedPagesY: 1,
    },
    {
      name: 'carta portrait narrow Mx1',
      settings: {
        paperSize: 'carta' as const,
        margins: 'narrow' as const,
        scale: 1.5,
      },
      baseContentWidthPx: 1400,
      baseContentHeightPx: 320,
      expectedPagesX: 3,
      expectedPagesY: 1,
    },
    {
      name: 'oficio landscape wide 1xN',
      settings: {
        paperSize: 'oficio' as const,
        orientation: 'landscape' as const,
        margins: 'wide' as const,
        scale: 1.25,
        showDocumentTitle: true,
        showHeader: true,
        headerText: 'Header',
        showFooter: true,
        footerText: 'Footer',
        showPageNumbers: true,
      },
      baseContentWidthPx: 500,
      baseContentHeightPx: 1800,
      expectedPagesX: 1,
      expectedPagesY: 4,
    },
    {
      name: 'A2 landscape normal MxN',
      settings: {
        paperSize: 'A2' as const,
        orientation: 'landscape' as const,
        scale: 1.35,
      },
      baseContentWidthPx: 2200,
      baseContentHeightPx: 2200,
      expectedPagesX: 2,
      expectedPagesY: 2,
    },
    {
      name: 'A3 portrait wide fit-to-width 1xN',
      settings: {
        margins: 'wide' as const,
        scale: 1.5,
        fitToWidth: true,
        showDocumentTitle: true,
        showPageNumbers: true,
      },
      baseContentWidthPx: 1600,
      baseContentHeightPx: 2400,
      expectedPagesX: 1,
      expectedPagesY: 2,
      fitToWidth: true,
    },
  ];

  for (const testCase of cases) {
    const scenario = resolveViewerPrintPipelineScenario({
      settings: testCase.settings,
      baseContentWidthPx: testCase.baseContentWidthPx,
      baseContentHeightPx: testCase.baseContentHeightPx,
    });

    assert.deepEqual(scenario.printableLayoutModel, scenario.pageMetrics, testCase.name);
    assert.equal(scenario.gridMetrics.pagesX, testCase.expectedPagesX, testCase.name);
    assert.equal(scenario.gridMetrics.pagesY, testCase.expectedPagesY, testCase.name);
    assert.equal(
      scenario.gridMetrics.scaledContentWidthPx,
      scenario.contentPlacementMetrics.scaledContentWidthPx,
      testCase.name,
    );
    assert.equal(
      scenario.gridMetrics.scaledContentHeightPx,
      scenario.contentPlacementMetrics.scaledContentHeightPx,
      testCase.name,
    );
    assertViewerPaginationInvariants({
      gridMetrics: scenario.gridMetrics,
      printedPages: scenario.printedPages,
      fitToWidth: testCase.fitToWidth,
    });
  }
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

test('viewer paginated surface layout centralizes shared preview and print geometry', () => {
  assert.deepEqual(
    resolveViewerPaginatedSurfaceLayout({
      previewMetrics: {
        paperWidthMm: 297,
        paperHeightMm: 420,
        marginTopMm: 12,
        marginRightMm: 12,
        marginBottomMm: 12,
        marginLeftMm: 12,
        contentWidthMm: 273,
        contentHeightMm: 396,
        contentScale: 1,
        paperWidthPx: 1122,
        paperHeightPx: 1587,
        marginTopPx: 45,
        marginRightPx: 45,
        marginBottomPx: 45,
        marginLeftPx: 45,
        contentWidthPx: 1032,
        contentHeightPx: 1497,
      },
      scaledSurfaceWidthPx: 1800,
      scaledSurfaceHeightPx: 1250,
    }),
    {
      paperWidthPx: 1122,
      paperHeightPx: 1587,
      contentWidthPx: 1032,
      contentHeightPx: 1497,
      paperPaddingPx: {
        top: 45,
        right: 45,
        bottom: 45,
        left: 45,
      },
      scaledSurfaceWidthPx: 1800,
      scaledSurfaceHeightPx: 1250,
    },
  );
});

test('viewer page slice layout normalizes shared slice geometry', () => {
  assert.deepEqual(
    resolveViewerPageSliceLayout({
      viewportWidthPx: 900,
      viewportHeightPx: 560,
      surfaceWidthPx: 1800,
      surfaceHeightPx: 1250,
      offsetX: 900,
      offsetY: 560,
    }),
    {
      viewportWidthPx: 900,
      viewportHeightPx: 560,
      surfaceWidthPx: 1800,
      surfaceHeightPx: 1250,
      offsetX: 900,
      offsetY: 560,
    },
  );
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

test('viewer content placement metrics accepts effective scales above manual max', () => {
  const metrics = resolveViewerContentPlacementMetrics({
    baseContentWidthPx: 200,
    baseContentHeightPx: 100,
    previewContentWidthPx: 600,
    previewContentHeightPx: 500,
    scale: 3,
  });

  assert.equal(metrics.scaledContentWidthPx, 600);
  assert.equal(metrics.scaledContentHeightPx, 300);
  assert.equal(metrics.scale, 3);
  assert.equal(metrics.overflowsHorizontally, false);
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
  assert.deepEqual(metrics.cutGuides, { cutGuidesX: [0, 500], cutGuidesY: [0, 480] });
  assert.deepEqual(metrics.refinementPolicy, { refineAxisX: false, refineAxisY: true });
  assert.deepEqual(metrics.axisYLineSegments, []);
  assert.deepEqual(metrics.tiles, [
    {
      pageNumber: 1,
      row: 0,
      col: 0,
      offsetX: 0,
      offsetY: 0,
      sliceWidthPx: 500,
      sliceHeightPx: 480,
      usablePageHeightPx: 600,
    },
  ]);
  assert.equal(metrics.hasHorizontalPagination, false);
  assert.equal(metrics.hasVerticalPagination, false);
});

test('viewer grid cut guides derive scaled row and column boundaries from render model', () => {
  const renderModel = createViewerRenderModelFixture();

  assert.deepEqual(resolveViewerGridCutGuides({ renderModel, scale: 1.5 }), {
    cutGuidesX: [0, 180, 405, 660, 675],
    cutGuidesY: [0, 27, 195, 375, 383],
  });
});

test('viewer axisY line segments derive curricular line bounds from render model rows', () => {
  const renderModel = {
    ...createViewerRenderModelFixture(),
    gridCols: 2,
    width: 270,
    columnWidths: [120, 140],
    colOffsets: [0, 130],
    bandsRenderRows: [],
  };

  assert.deepEqual(resolveViewerAxisYLineSegments({ renderModel, scale: 1.5 }), [
    { rowIndex: 0, startPx: 60, endPx: 195, heightPx: 135 },
    { rowIndex: 1, startPx: 210, endPx: 375, heightPx: 165 },
  ]);
});

test('viewer axisX column segments derive curricular column bounds from render model', () => {
  const renderModel = createViewerRenderModelFixture();

  assert.deepEqual(resolveViewerAxisXColumnSegments({ renderModel, scale: 1.5 }), [
    { colIndex: 0, startPx: 0, endPx: 180, widthPx: 180, source: 'grid' },
    { colIndex: 1, startPx: 195, endPx: 405, widthPx: 210, source: 'grid' },
    { colIndex: 2, startPx: 420, endPx: 660, widthPx: 240, source: 'grid' },
  ]);
});

test('viewer axisX column segments ignore degenerate widths and dedupe matching band boundaries', () => {
  const renderModel = {
    ...createViewerRenderModelFixture(),
    width: 270,
    columnWidths: [120, 0, 140],
    colOffsets: [0, 130, 130],
    bandsRenderRows: [
      {
        id: 'band-1',
        kind: 'header' as const,
        top: 0,
        height: 20,
        cells: [
          {
            col: 0,
            text: 'A',
            left: 0,
            width: 120,
            style: createViewerRenderModelFixture().bandsRenderRows[0]!.cells[0]!.style,
          },
          {
            col: 2,
            text: 'C',
            left: 130,
            width: 140,
            style: createViewerRenderModelFixture().bandsRenderRows[0]!.cells[0]!.style,
          },
        ],
      },
    ],
  };

  assert.deepEqual(resolveViewerAxisXColumnSegments({ renderModel, scale: 1 }), [
    { colIndex: 0, startPx: 0, endPx: 120, widthPx: 120, source: 'grid' },
    { colIndex: 2, startPx: 130, endPx: 270, widthPx: 140, source: 'grid' },
  ]);
});

test('viewer axisY pagination cuts snap nominal boundaries to nearby natural guides', () => {
  assert.deepEqual(
    resolveViewerPaginationAxisCuts({
      totalSizePx: 1250,
      usablePageSizePx: 600,
      cutGuidesPx: [0, 560, 1180, 1250],
    }),
    {
      offsetsPx: [0, 560, 1160],
      sliceSizesPx: [560, 600, 90],
    },
  );
});

test('viewer axis pagination cuts stay geometric when guide snapping is disabled', () => {
  assert.deepEqual(
    resolveViewerPaginationAxisCuts({
      totalSizePx: 1250,
      usablePageSizePx: 600,
      cutGuidesPx: [0, 560, 1180, 1250],
      enableGuideSnapping: false,
    }),
    {
      offsetsPx: [0, 600, 1200],
      sliceSizesPx: [600, 600, 50],
    },
  );
});

test('viewer axisY pagination cuts fall back to geometric boundaries when no guide is close enough', () => {
  assert.deepEqual(
    resolveViewerPaginationAxisCuts({
      totalSizePx: 1250,
      usablePageSizePx: 600,
      cutGuidesPx: [0, 470, 1030, 1250],
    }),
    {
      offsetsPx: [0, 600, 1200],
      sliceSizesPx: [600, 600, 50],
    },
  );
});

test('viewer protected axisX cuts avoid splitting curricular columns between pages', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisXCuts({
      totalSizePx: 1250,
      usablePageSizePx: 600,
      cutGuidesX: [0, 540, 1080, 1250],
      columnSegmentsX: [
        { colIndex: 0, startPx: 0, endPx: 280, widthPx: 280, source: 'grid' },
        { colIndex: 1, startPx: 300, endPx: 540, widthPx: 240, source: 'grid' },
        { colIndex: 2, startPx: 560, endPx: 860, widthPx: 300, source: 'grid' },
        { colIndex: 3, startPx: 880, endPx: 1080, widthPx: 200, source: 'grid' },
        { colIndex: 4, startPx: 1100, endPx: 1250, widthPx: 150, source: 'grid' },
      ],
    }),
    {
      offsetsPx: [0, 540, 1080],
      sliceSizesPx: [540, 540, 170],
    },
  );
});

test('viewer protected axisX cuts keep an exact column boundary when the nominal cut already lands there', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisXCuts({
      totalSizePx: 1200,
      usablePageSizePx: 600,
      cutGuidesX: [0, 300, 600, 900, 1200],
      columnSegmentsX: [
        { colIndex: 0, startPx: 0, endPx: 300, widthPx: 300, source: 'grid' },
        { colIndex: 1, startPx: 300, endPx: 600, widthPx: 300, source: 'grid' },
        { colIndex: 2, startPx: 600, endPx: 900, widthPx: 300, source: 'grid' },
        { colIndex: 3, startPx: 900, endPx: 1200, widthPx: 300, source: 'grid' },
      ],
    }),
    {
      offsetsPx: [0, 600],
      sliceSizesPx: [600, 600],
    },
  );
});

test('viewer protected axisX cuts fall back inside an oversized curricular column', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisXCuts({
      totalSizePx: 1500,
      usablePageSizePx: 600,
      cutGuidesX: [0, 600, 1200, 1500],
      columnSegmentsX: [
        { colIndex: 0, startPx: 0, endPx: 700, widthPx: 700, source: 'grid' },
        { colIndex: 1, startPx: 720, endPx: 1100, widthPx: 380, source: 'grid' },
        { colIndex: 2, startPx: 1120, endPx: 1500, widthPx: 380, source: 'grid' },
      ],
    }),
    {
      offsetsPx: [0, 600, 1100],
      sliceSizesPx: [600, 500, 400],
    },
  );
});

test('viewer protected axisY cuts avoid splitting curricular lines between pages', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisYCuts({
      totalSizePx: 1250,
      usablePageSizePx: 600,
      cutGuidesY: [0, 540, 1080, 1250],
      lineSegmentsY: [
        { rowIndex: 0, startPx: 0, endPx: 300, heightPx: 300 },
        { rowIndex: 1, startPx: 320, endPx: 540, heightPx: 220 },
        { rowIndex: 2, startPx: 560, endPx: 860, heightPx: 300 },
        { rowIndex: 3, startPx: 880, endPx: 1080, heightPx: 200 },
        { rowIndex: 4, startPx: 1100, endPx: 1250, heightPx: 150 },
      ],
    }),
    {
      offsetsPx: [0, 540, 1080],
      sliceSizesPx: [540, 540, 170],
    },
  );
});

test('viewer protected axisY cuts keep an exact line boundary when the nominal cut already lands there', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisYCuts({
      totalSizePx: 1200,
      usablePageSizePx: 600,
      cutGuidesY: [0, 300, 600, 900, 1200],
      lineSegmentsY: [
        { rowIndex: 0, startPx: 0, endPx: 300, heightPx: 300 },
        { rowIndex: 1, startPx: 300, endPx: 600, heightPx: 300 },
        { rowIndex: 2, startPx: 600, endPx: 900, heightPx: 300 },
        { rowIndex: 3, startPx: 900, endPx: 1200, heightPx: 300 },
      ],
    }),
    {
      offsetsPx: [0, 600],
      sliceSizesPx: [600, 600],
    },
  );
});

test('viewer protected axisY cuts fall back inside an oversized curricular line', () => {
  assert.deepEqual(
    resolveViewerProtectedAxisYCuts({
      totalSizePx: 1500,
      usablePageSizePx: 600,
      cutGuidesY: [0, 600, 1200, 1500],
      lineSegmentsY: [
        { rowIndex: 0, startPx: 0, endPx: 700, heightPx: 700 },
        { rowIndex: 1, startPx: 720, endPx: 1100, heightPx: 380 },
        { rowIndex: 2, startPx: 1120, endPx: 1500, heightPx: 380 },
      ],
    }),
    {
      offsetsPx: [0, 600, 1100],
      sliceSizesPx: [600, 500, 400],
    },
  );
});

test('viewer row and band pagination resolves multiple vertical tiles with stable axisY offsets', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesY: [0, 560, 1180, 1250],
    },
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 560, heightPx: 560 },
      { rowIndex: 1, startPx: 580, endPx: 1160, heightPx: 580 },
      { rowIndex: 2, startPx: 1180, endPx: 1250, heightPx: 70 },
    ],
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
      { pageNumber: 1, row: 0, col: 0, offsetX: 0, offsetY: 0, sliceHeightPx: 560 },
      { pageNumber: 2, row: 1, col: 0, offsetX: 0, offsetY: 560, sliceHeightPx: 600 },
      { pageNumber: 3, row: 2, col: 0, offsetX: 0, offsetY: 1160, sliceHeightPx: 90 },
    ],
  );
});

test('viewer row and band pagination can protect curricular lines above guide snapping', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesY: [0, 560, 1180, 1250],
    },
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 320, heightPx: 320 },
      { rowIndex: 1, startPx: 340, endPx: 720, heightPx: 380 },
      { rowIndex: 2, startPx: 740, endPx: 1180, heightPx: 440 },
      { rowIndex: 3, startPx: 1200, endPx: 1250, heightPx: 50 },
    ],
  });
  assert.deepEqual(
    metrics.tiles.map((tile) => ({
      row: tile.row,
      offsetY: tile.offsetY,
      sliceHeightPx: tile.sliceHeightPx,
    })),
    [
      { row: 0, offsetY: 0, sliceHeightPx: 320 },
      { row: 1, offsetY: 320, sliceHeightPx: 400 },
      { row: 2, offsetY: 720, sliceHeightPx: 530 },
    ],
  );
});

test('viewer column pagination remains geometric on axisX while horizontal policy is pending', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1900,
    scaledContentHeightPx: 500,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesX: [0, 840, 1710, 1900],
    },
  });
  assert.equal(metrics.pagesX, 3);
  assert.equal(metrics.pagesY, 1);
  assert.deepEqual(metrics.refinementPolicy, { refineAxisX: false, refineAxisY: true });
  assert.deepEqual(
    metrics.tiles.map((tile) => ({
      pageNumber: tile.pageNumber,
      row: tile.row,
      col: tile.col,
      offsetX: tile.offsetX,
      sliceWidthPx: tile.sliceWidthPx,
    })),
    [
      { pageNumber: 1, row: 0, col: 0, offsetX: 0, sliceWidthPx: 900 },
      { pageNumber: 2, row: 0, col: 1, offsetX: 900, sliceWidthPx: 900 },
      { pageNumber: 3, row: 0, col: 2, offsetX: 1800, sliceWidthPx: 100 },
    ],
  );
});

test('viewer column pagination can protect curricular columns on axisX when refinement is enabled', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1250,
    scaledContentHeightPx: 500,
    usablePageWidthPx: 600,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesX: [0, 540, 1080, 1250],
    },
    axisXColumnSegments: [
      { colIndex: 0, startPx: 0, endPx: 280, widthPx: 280, source: 'grid' },
      { colIndex: 1, startPx: 300, endPx: 540, widthPx: 240, source: 'grid' },
      { colIndex: 2, startPx: 560, endPx: 860, widthPx: 300, source: 'grid' },
      { colIndex: 3, startPx: 880, endPx: 1080, widthPx: 200, source: 'grid' },
      { colIndex: 4, startPx: 1100, endPx: 1250, widthPx: 150, source: 'grid' },
    ],
    refinementPolicy: {
      refineAxisX: true,
    },
  });
  assert.equal(metrics.pagesX, 3);
  assert.equal(metrics.pagesY, 1);
  assert.deepEqual(metrics.refinementPolicy, { refineAxisX: true, refineAxisY: true });
  assert.deepEqual(metrics.axisXColumnSegments, [
    { colIndex: 0, startPx: 0, endPx: 280, widthPx: 280, source: 'grid' },
    { colIndex: 1, startPx: 300, endPx: 540, widthPx: 240, source: 'grid' },
    { colIndex: 2, startPx: 560, endPx: 860, widthPx: 300, source: 'grid' },
    { colIndex: 3, startPx: 880, endPx: 1080, widthPx: 200, source: 'grid' },
    { colIndex: 4, startPx: 1100, endPx: 1250, widthPx: 150, source: 'grid' },
  ]);
  assert.deepEqual(
    metrics.tiles.map((tile) => ({
      pageNumber: tile.pageNumber,
      row: tile.row,
      col: tile.col,
      offsetX: tile.offsetX,
      sliceWidthPx: tile.sliceWidthPx,
    })),
    [
      { pageNumber: 1, row: 0, col: 0, offsetX: 0, sliceWidthPx: 540 },
      { pageNumber: 2, row: 0, col: 1, offsetX: 540, sliceWidthPx: 540 },
      { pageNumber: 3, row: 0, col: 2, offsetX: 1080, sliceWidthPx: 170 },
    ],
  );
});

test('viewer pagination grid resolves multiple axisX tiles without deciding column render policy', () => {
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

test('viewer pagination grid combines protected axisX and axisY cuts in row-major order', () => {
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1250,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 600,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesX: [0, 540, 1080, 1250],
      cutGuidesY: [0, 560, 1180, 1250],
    },
    axisXColumnSegments: [
      { colIndex: 0, startPx: 0, endPx: 280, widthPx: 280, source: 'grid' },
      { colIndex: 1, startPx: 300, endPx: 540, widthPx: 240, source: 'grid' },
      { colIndex: 2, startPx: 560, endPx: 860, widthPx: 300, source: 'grid' },
      { colIndex: 3, startPx: 880, endPx: 1080, widthPx: 200, source: 'grid' },
      { colIndex: 4, startPx: 1100, endPx: 1250, widthPx: 150, source: 'grid' },
    ],
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 320, heightPx: 320 },
      { rowIndex: 1, startPx: 340, endPx: 720, heightPx: 380 },
      { rowIndex: 2, startPx: 740, endPx: 1180, heightPx: 440 },
      { rowIndex: 3, startPx: 1200, endPx: 1250, heightPx: 50 },
    ],
    refinementPolicy: {
      refineAxisX: true,
      refineAxisY: true,
    },
  });
  assert.deepEqual(
    metrics.tiles.map((tile) => `${tile.pageNumber}:${tile.row},${tile.col}@${tile.offsetX},${tile.offsetY}/${tile.sliceWidthPx}x${tile.sliceHeightPx}`),
    [
      '1:0,0@0,0/540x320',
      '2:0,1@540,0/540x320',
      '3:0,2@1080,0/170x320',
      '4:1,0@0,320/540x400',
      '5:1,1@540,320/540x400',
      '6:1,2@1080,320/170x400',
      '7:2,0@0,720/540x530',
      '8:2,1@540,720/540x530',
      '9:2,2@1080,720/170x530',
    ],
  );
});

test('viewer fit-to-width keeps a single horizontal page while preserving vertical pagination', () => {
  const effectiveScale = resolveViewerEffectivePrintScale({
    fitToWidth: true,
    manualScale: 1,
    baseContentWidthPx: 1000,
    previewContentWidthPx: 500,
  });
  const metrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: Math.round(1000 * effectiveScale),
    scaledContentHeightPx: Math.round(1900 * effectiveScale),
    usablePageWidthPx: 500,
    usablePageHeightPx: 400,
    cutGuides: {
      cutGuidesX: [0, 500],
      cutGuidesY: [0, 520, 1100, 1900].map((value) => Math.round(value * effectiveScale)),
    },
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 520, heightPx: 520 },
      { rowIndex: 1, startPx: 520, endPx: 1100, heightPx: 580 },
      { rowIndex: 2, startPx: 1100, endPx: 1900, heightPx: 800 },
    ].map((segment) => ({
      ...segment,
      startPx: Math.round(segment.startPx * effectiveScale),
      endPx: Math.round(segment.endPx * effectiveScale),
      heightPx: Math.round(segment.heightPx * effectiveScale),
    })),
    refinementPolicy: {
      refineAxisX: true,
      refineAxisY: true,
    },
  });

  assert.equal(metrics.pagesX, 1);
  assert.equal(metrics.hasHorizontalPagination, false);
  assert.ok(metrics.pagesY > 1);
  assert.ok(metrics.tiles.every((tile) => tile.col === 0));
});

test('viewer pagination grid keeps first-page and continuation heights stable across scale changes', () => {
  const renderModel = {
    ...createViewerRenderModelFixture(),
    gridRows: 4,
    height: 1600,
    rowHeights: [360, 360, 360, 360],
    rowOffsets: [0, 400, 800, 1200],
  };
  const settings = normalizeViewerPrintSettings({
    ...createDefaultViewerPrintSettings(),
    showDocumentTitle: true,
    documentTitleOverride: 'Documento',
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showPageNumbers: true,
  });
  const pageMetrics = resolveViewerPageMetrics(settings);
  const previewMetrics = resolveViewerPreviewPageMetrics(pageMetrics, { pxPerMmX: 3, pxPerMmY: 3 });
  const scales = [1, 1.35, 1.5];

  for (const scale of scales) {
    const editorialHeights = resolveViewerPageEditorialHeights({
      showDocumentTitle: settings.showDocumentTitle,
      documentTitleOverride: settings.documentTitleOverride,
      pageLayoutMode: settings.pageLayoutMode,
      showHeader: settings.showHeader,
      headerText: settings.headerText,
      showFooter: settings.showFooter,
      footerText: settings.footerText,
      showPageNumbers: settings.showPageNumbers,
      projectName: renderModel.projectName,
      contentHeightMm: pageMetrics.contentHeightMm,
      pxPerMmY: 4,
    });
    const placement = resolveViewerContentPlacementMetrics({
      baseContentWidthPx: renderModel.width,
      baseContentHeightPx: renderModel.height,
      previewContentWidthPx: previewMetrics.contentWidthPx,
      previewContentHeightPx: previewMetrics.contentHeightPx,
      scale,
    });
    const grid = resolveViewerPaginationGridMetrics({
      scaledContentWidthPx: placement.scaledContentWidthPx,
      scaledContentHeightPx: placement.scaledContentHeightPx,
      usablePageWidthPx: previewMetrics.contentWidthPx,
      usablePageHeightPx: previewMetrics.contentHeightPx,
      firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
      continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
      cutGuides: resolveViewerGridCutGuides({ renderModel, scale }),
      axisXColumnSegments: resolveViewerAxisXColumnSegments({ renderModel, scale }),
      axisYLineSegments: resolveViewerAxisYLineSegments({ renderModel, scale }),
      refinementPolicy: {
        refineAxisX: true,
        refineAxisY: true,
      },
    });

    assert.equal(grid.pagesX, 1);
    assert.ok(grid.pagesY >= 2);
    assert.equal(grid.usablePageHeightsPxByRow[0], editorialHeights.firstPageUsableHeightPx);
    assert.equal(grid.usablePageHeightsPxByRow[1], editorialHeights.continuationPageUsableHeightPx);
    assert.ok(grid.tiles[0]!.sliceHeightPx <= editorialHeights.firstPageUsableHeightPx);
    assert.ok(grid.tiles[1]!.sliceHeightPx <= editorialHeights.continuationPageUsableHeightPx);
    assert.ok(grid.tiles[1]!.offsetY >= grid.tiles[0]!.offsetY + grid.tiles[0]!.sliceHeightPx);
  }
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
      usablePageHeightPx: 1,
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
      usablePageHeightPx: 600,
      isLastColumn: true,
      isLastRow: true,
    },
  ]);
});

test('viewer printed pages preserve grid invariants for real 2d layouts', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 1250,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 600,
    usablePageHeightPx: 600,
    firstPageUsableHeightPx: 320,
    continuationPageUsableHeightPx: 530,
    cutGuides: {
      cutGuidesX: [0, 540, 1080, 1250],
      cutGuidesY: [0, 320, 720, 1250],
    },
    axisXColumnSegments: [
      { colIndex: 0, startPx: 0, endPx: 280, widthPx: 280, source: 'grid' },
      { colIndex: 1, startPx: 300, endPx: 540, widthPx: 240, source: 'grid' },
      { colIndex: 2, startPx: 560, endPx: 860, widthPx: 300, source: 'grid' },
      { colIndex: 3, startPx: 880, endPx: 1080, widthPx: 200, source: 'grid' },
      { colIndex: 4, startPx: 1100, endPx: 1250, widthPx: 150, source: 'grid' },
    ],
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 320, heightPx: 320 },
      { rowIndex: 1, startPx: 340, endPx: 720, heightPx: 380 },
      { rowIndex: 2, startPx: 740, endPx: 1180, heightPx: 440 },
      { rowIndex: 3, startPx: 1200, endPx: 1250, heightPx: 50 },
    ],
    refinementPolicy: {
      refineAxisX: true,
      refineAxisY: true,
    },
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(grid);

  assertViewerPaginationInvariants({ gridMetrics: grid, printedPages });
  assert.equal(printedPages.length, 9);
  assert.equal(printedPages[0]!.usablePageHeightPx, 320);
  assert.equal(printedPages[3]!.usablePageHeightPx, 530);
  assert.equal(printedPages[8]!.isLastColumn, true);
  assert.equal(printedPages[8]!.isLastRow, true);
});

test('viewer printed pages linearize 1xN tiles in stable row-major order', () => {
  const grid = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: 500,
    scaledContentHeightPx: 1250,
    usablePageWidthPx: 900,
    usablePageHeightPx: 600,
    cutGuides: {
      cutGuidesY: [0, 560, 1180, 1250],
    },
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 320, heightPx: 320 },
      { rowIndex: 1, startPx: 340, endPx: 720, heightPx: 380 },
      { rowIndex: 2, startPx: 740, endPx: 1180, heightPx: 440 },
      { rowIndex: 3, startPx: 1200, endPx: 1250, heightPx: 50 },
    ],
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
      { pageNumber: 1, tileRow: 0, tileCol: 0, printOffsetY: 0, sliceHeightPx: 320 },
      { pageNumber: 2, tileRow: 1, tileCol: 0, printOffsetY: 320, sliceHeightPx: 400 },
      { pageNumber: 3, tileRow: 2, tileCol: 0, printOffsetY: 720, sliceHeightPx: 530 },
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
        usablePageHeightPx: 0,
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
      usablePageHeightPx: 1,
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
    cutGuides: {
      cutGuidesY: [0, 560, 1180, 1250],
    },
    axisYLineSegments: [
      { rowIndex: 0, startPx: 0, endPx: 320, heightPx: 320 },
      { rowIndex: 1, startPx: 340, endPx: 720, heightPx: 380 },
      { rowIndex: 2, startPx: 740, endPx: 1180, heightPx: 440 },
      { rowIndex: 3, startPx: 1200, endPx: 1250, heightPx: 50 },
    ],
  });
  const metrics = resolveViewerVerticalPaginationMetrics({
    scaledContentHeightPx: 1250,
    previewContentHeightPx: 600,
    paginationGridMetrics: gridMetrics,
  });
  assert.equal(metrics.pageCount, 3);
  assert.deepEqual(metrics.pageOffsetsPx, [0, 320, 720]);
  assert.deepEqual(metrics.pageSliceHeightsPx, [320, 400, 530]);
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

test('viewer printable text layout resolves first-page editorial content', () => {
  const layout = resolveViewerPrintableTextLayout({
    showHeader: true,
    headerText: '  Encabezado  ',
    showFooter: true,
    footerText: '  Pie  ',
    showDocumentTitle: true,
    documentTitleOverride: '',
    pageLayoutMode: 'same-on-all-pages',
    showPageNumbers: true,
    pageIndex: 0,
    pageCount: 3,
    projectName: '  Malla 2026  ',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  assert.equal(layout.headerText, 'Encabezado');
  assert.equal(layout.documentTitle, 'Malla 2026');
  assert.equal(layout.footerText, 'Pie');
  assert.equal(layout.pageNumberText, 'Pagina 1 de 3');
  assert.equal(layout.template, 'with-text-blocks');
});

test('viewer printable text layout omits title when toggle is disabled', () => {
  const layout = resolveViewerPrintableTextLayout({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: false,
    documentTitleOverride: 'Custom',
    pageLayoutMode: 'same-on-all-pages',
    showPageNumbers: false,
    pageIndex: 0,
    pageCount: 1,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  assert.equal(layout.documentTitle, '');
  assert.equal(layout.pageNumberText, '');
});

test('viewer page editorial layout keeps title on first page only', () => {
  const firstPage = resolveViewerPrintedPageEditorialLayout({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: true,
    documentTitleOverride: 'Titulo editorial',
    pageLayoutMode: 'same-on-all-pages',
    showPageNumbers: true,
    pageIndex: 0,
    pageCount: 4,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  const continuationPage = resolveViewerPrintedPageEditorialLayout({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: true,
    documentTitleOverride: 'Titulo editorial',
    pageLayoutMode: 'same-on-all-pages',
    showPageNumbers: true,
    pageIndex: 1,
    pageCount: 4,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  assert.equal(firstPage.documentTitle, 'Titulo editorial');
  assert.equal(continuationPage.documentTitle, '');
  assert.equal(continuationPage.headerText, 'Header');
  assert.equal(continuationPage.footerText, 'Footer');
  assert.equal(continuationPage.pageNumberText, 'Pagina 2 de 4');
});

test('viewer page editorial layout honors first-page-only mode for repeated blocks', () => {
  const firstPage = resolveViewerPrintedPageEditorialLayout({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: true,
    documentTitleOverride: '',
    pageLayoutMode: 'first-page-only',
    showPageNumbers: true,
    pageIndex: 0,
    pageCount: 3,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  const continuationPage = resolveViewerPrintedPageEditorialLayout({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: true,
    documentTitleOverride: '',
    pageLayoutMode: 'first-page-only',
    showPageNumbers: true,
    pageIndex: 1,
    pageCount: 3,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  assert.equal(firstPage.headerText, 'Header');
  assert.equal(firstPage.footerText, 'Footer');
  assert.equal(firstPage.pageNumberText, 'Pagina 1 de 3');
  assert.equal(continuationPage.headerText, '');
  assert.equal(continuationPage.footerText, '');
  assert.equal(continuationPage.pageNumberText, 'Pagina 2 de 3');
  assert.equal(continuationPage.template, 'with-text-blocks');
});

test('viewer page editorial heights derive different usable heights for first and continuation pages', () => {
  const heights = resolveViewerPageEditorialHeights({
    showHeader: true,
    headerText: 'Header',
    showFooter: true,
    footerText: 'Footer',
    showDocumentTitle: true,
    documentTitleOverride: '',
    pageLayoutMode: 'first-page-only',
    showPageNumbers: true,
    projectName: 'Documento',
    contentHeightMm: 396,
    pxPerMmY: 4,
  });
  assert.equal(heights.firstPageTemplate, 'with-text-blocks');
  assert.equal(heights.continuationPageTemplate, 'with-text-blocks');
  assert.ok(heights.firstPageUsableHeightPx < heights.continuationPageUsableHeightPx);
});
