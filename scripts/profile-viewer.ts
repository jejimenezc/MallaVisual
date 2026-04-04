import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import { buildMallaSnapshotFromState } from '../src/utils/malla-snapshot.ts';
import { applyViewerTheme, createDefaultViewerTheme } from '../src/utils/viewer-theme.ts';
import {
  createDefaultViewerMeasuredPxPerMm,
  createDefaultViewerPrintSettings,
  resolveViewerAxisXColumnSegments,
  resolveViewerAxisYLineSegments,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePrintScale,
  resolveViewerGridCutGuides,
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPageEditorialHeights,
  resolveViewerPageMetrics,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintedPagesFromPaginationGrid,
} from '../src/utils/viewer-print.ts';

const iterations = 25;
const raw = fs.readFileSync('./docs/testing/fixtures/grid-2d.json', 'utf8');
const fixture = JSON.parse(raw);
const snapshot = buildMallaSnapshotFromState(fixture, {
  projectName: 'Grid 2D profiling',
  createdAt: '2026-03-22T00:00:00.000Z',
  snapshotId: 'profile-grid-2d',
  appVersion: 'profile',
});
const theme = createDefaultViewerTheme();
const printSettings = createDefaultViewerPrintSettings();
const measured = createDefaultViewerMeasuredPxPerMm();

const samples: Array<{
  theme: number;
  placement: number;
  pagination: number;
  total: number;
  pages: number;
  tiles: number;
  width: number;
  height: number;
}> = [];

for (let index = 0; index < iterations; index += 1) {
  const t0 = performance.now();
  const renderModel = applyViewerTheme(snapshot, theme);
  const t1 = performance.now();

  const pageMetrics = resolveViewerPageMetrics(printSettings);
  const previewMetrics = resolveViewerPreviewPageMetrics(pageMetrics, measured);
  const effectiveScale = resolveViewerEffectivePrintScale({
    fitToWidth: printSettings.fitToWidth,
    manualScale: printSettings.scale,
    baseContentWidthPx: renderModel.width,
    previewContentWidthPx: previewMetrics.contentWidthPx,
  });
  const contentPlacementMetrics = resolveViewerContentPlacementMetrics({
    baseContentWidthPx: renderModel.width,
    baseContentHeightPx: renderModel.height,
    previewContentWidthPx: previewMetrics.contentWidthPx,
    previewContentHeightPx: previewMetrics.contentHeightPx,
    scale: effectiveScale,
  });
  const t2 = performance.now();

  const editorialHeights = resolveViewerPageEditorialHeights({
    showDocumentTitle: printSettings.showDocumentTitle,
    documentTitleOverride: printSettings.documentTitleOverride,
    pageLayoutMode: printSettings.pageLayoutMode,
    showHeader: printSettings.showHeader,
    headerText: printSettings.headerText,
    showFooter: printSettings.showFooter,
    footerText: printSettings.footerText,
    showPageNumbers: printSettings.showPageNumbers,
    projectName: renderModel.projectName,
    contentHeightMm: pageMetrics.contentHeightMm,
    pxPerMmY: measured.pxPerMmY,
  });
  const cutGuides = resolveViewerGridCutGuides({
    renderModel,
    scale: contentPlacementMetrics.scale,
  });
  const axisXColumnSegments = resolveViewerAxisXColumnSegments({
    renderModel,
    scale: contentPlacementMetrics.scale,
  });
  const axisYLineSegments = resolveViewerAxisYLineSegments({
    renderModel,
    scale: contentPlacementMetrics.scale,
  });
  const gridMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
    usablePageWidthPx: previewMetrics.contentWidthPx,
    usablePageHeightPx: previewMetrics.contentHeightPx,
    firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
    continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
    cutGuides,
    axisXColumnSegments,
    axisYLineSegments,
    refinementPolicy: {
      refineAxisX: true,
      refineAxisY: true,
    },
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid(gridMetrics);
  const surfaceLayout = resolveViewerPaginatedSurfaceLayout({
    previewMetrics,
    scaledSurfaceWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledSurfaceHeightPx: contentPlacementMetrics.scaledContentHeightPx,
  });
  const t3 = performance.now();

  samples.push({
    theme: t1 - t0,
    placement: t2 - t1,
    pagination: t3 - t2,
    total: t3 - t0,
    pages: printedPages.length,
    tiles: gridMetrics.tiles.length,
    width: surfaceLayout.scaledSurfaceWidthPx,
    height: surfaceLayout.scaledSurfaceHeightPx,
  });
}

const average = (key: keyof (typeof samples)[number]) =>
  samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;

console.log(
  JSON.stringify(
    {
      fixture: 'grid-2d',
      iterations,
      averageMs: {
        applyViewerTheme: Number(average('theme').toFixed(2)),
        contentPlacement: Number(average('placement').toFixed(2)),
        paginationPipeline: Number(average('pagination').toFixed(2)),
        total: Number(average('total').toFixed(2)),
      },
      pages: samples[0]?.pages ?? 0,
      tiles: samples[0]?.tiles ?? 0,
      scaledSurface: {
        width: samples[0]?.width ?? 0,
        height: samples[0]?.height ?? 0,
      },
    },
    null,
    2,
  ),
);
