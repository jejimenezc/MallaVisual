import { useMemo } from 'react';
import type React from 'react';
import type { ViewerPrintDocumentClassNames } from '../components/ViewerPrintDocument.tsx';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  applyViewerTheme,
  type ViewerRenderModel,
} from '../utils/viewer-theme.ts';
import {
  resolveViewerAxisXColumnSegments,
  resolveViewerAxisYLineSegments,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePrintScale,
  resolveViewerGridCutGuides,
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPageEditorialHeights,
  resolveViewerPageMetrics,
  resolveViewerPageSliceLayout,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintCssVars,
  resolveViewerPrintedPageEditorialLayout,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPrintPageCss,
  type ViewerPrintSettings,
} from '../utils/viewer-print.ts';

const VIEWER_PRINT_CUT_REFINEMENT_POLICY = {
  refineAxisX: true,
  refineAxisY: true,
} as const;

interface UseViewerLayoutModelArgs {
  snapshot: MallaSnapshot | null;
  theme: ViewerTheme;
  printSettings: ViewerPrintSettings;
  zoom: number;
  isPrintPreview: boolean;
  measuredPxPerMm: { pxPerMmX: number; pxPerMmY: number };
  styles: Record<string, string>;
}

interface PreviewTilePageModel {
  tile: ReturnType<typeof resolveViewerPaginationGridMetrics>['tiles'][number];
  editorialLayout: ReturnType<typeof resolveViewerPrintedPageEditorialLayout>;
  isPartialLastPage: boolean;
  sliceLayout: ReturnType<typeof resolveViewerPageSliceLayout>;
}

export interface ViewerLayoutModel {
  renderModel: ViewerRenderModel | null;
  pageMetrics: ReturnType<typeof resolveViewerPageMetrics>;
  previewMetrics: ReturnType<typeof resolveViewerPreviewPageMetrics>;
  printCssVars: ReturnType<typeof resolveViewerPrintCssVars>;
  previewCssVars: ReturnType<typeof resolveViewerPreviewCssVars>;
  editorialHeights: ReturnType<typeof resolveViewerPageEditorialHeights>;
  effectivePrintScale: number;
  effectivePrintScalePct: string;
  contentPlacementMetrics: ReturnType<typeof resolveViewerContentPlacementMetrics>;
  gridPaginationMetrics: ReturnType<typeof resolveViewerPaginationGridMetrics>;
  printedPages: ReturnType<typeof resolveViewerPrintedPagesFromPaginationGrid>;
  paginatedSurfaceLayout: ReturnType<typeof resolveViewerPaginatedSurfaceLayout>;
  previewTilePageModels: PreviewTilePageModel[];
  viewerPrintDocumentClassNames: ViewerPrintDocumentClassNames;
  printFrameStyle: React.CSSProperties | undefined;
  printContentBoxStyle: React.CSSProperties | undefined;
  previewCanvasInnerStyle: React.CSSProperties;
  printStyleText: string;
}

export function useViewerLayoutModel({
  snapshot,
  theme,
  printSettings,
  zoom,
  isPrintPreview,
  measuredPxPerMm,
  styles,
}: UseViewerLayoutModelArgs): ViewerLayoutModel {
  const renderModel = useMemo(() => {
    if (!snapshot) return null;
    return applyViewerTheme(snapshot, theme);
  }, [snapshot, theme]);

  const pageMetrics = useMemo(
    () => resolveViewerPageMetrics(printSettings),
    [printSettings],
  );
  const previewMetrics = useMemo(
    () => resolveViewerPreviewPageMetrics(pageMetrics, measuredPxPerMm),
    [measuredPxPerMm, pageMetrics],
  );
  const printCssVars = useMemo(
    () => resolveViewerPrintCssVars(pageMetrics),
    [pageMetrics],
  );
  const previewCssVars = useMemo(
    () => resolveViewerPreviewCssVars(previewMetrics),
    [previewMetrics],
  );
  const editorialHeights = useMemo(
    () =>
      resolveViewerPageEditorialHeights({
        showDocumentTitle: printSettings.showDocumentTitle,
        documentTitleOverride: printSettings.documentTitleOverride,
        pageLayoutMode: printSettings.pageLayoutMode,
        showHeader: printSettings.showHeader,
        headerText: printSettings.headerText,
        showFooter: printSettings.showFooter,
        footerText: printSettings.footerText,
        showPageNumbers: printSettings.showPageNumbers,
        projectName: renderModel?.projectName ?? '',
        contentHeightMm: pageMetrics.contentHeightMm,
        pxPerMmY: measuredPxPerMm.pxPerMmY,
      }),
    [
      measuredPxPerMm.pxPerMmY,
      pageMetrics.contentHeightMm,
      printSettings.documentTitleOverride,
      printSettings.footerText,
      printSettings.headerText,
      printSettings.pageLayoutMode,
      printSettings.showDocumentTitle,
      printSettings.showFooter,
      printSettings.showHeader,
      printSettings.showPageNumbers,
      renderModel?.projectName,
    ],
  );
  const effectivePrintScale = useMemo(
    () =>
      resolveViewerEffectivePrintScale({
        fitToWidth: printSettings.fitToWidth,
        manualScale: printSettings.scale,
        baseContentWidthPx: renderModel?.width ?? 1,
        previewContentWidthPx: previewMetrics.contentWidthPx,
      }),
    [previewMetrics.contentWidthPx, printSettings.fitToWidth, printSettings.scale, renderModel?.width],
  );
  const effectivePrintScalePct = `${Math.round(effectivePrintScale * 100)}%`;
  const contentPlacementMetrics = useMemo(
    () =>
      resolveViewerContentPlacementMetrics({
        baseContentWidthPx: renderModel?.width ?? 1,
        baseContentHeightPx: renderModel?.height ?? 1,
        previewContentWidthPx: previewMetrics.contentWidthPx,
        previewContentHeightPx: previewMetrics.contentHeightPx,
        scale: effectivePrintScale,
      }),
    [
      effectivePrintScale,
      previewMetrics.contentHeightPx,
      previewMetrics.contentWidthPx,
      renderModel?.height,
      renderModel?.width,
    ],
  );
  const cutGuides = useMemo(
    () =>
      renderModel
        ? resolveViewerGridCutGuides({
            renderModel,
            scale: contentPlacementMetrics.scale,
          })
        : undefined,
    [contentPlacementMetrics.scale, renderModel],
  );
  const axisXColumnSegments = useMemo(
    () =>
      renderModel
        ? resolveViewerAxisXColumnSegments({
            renderModel,
            scale: contentPlacementMetrics.scale,
          })
        : undefined,
    [contentPlacementMetrics.scale, renderModel],
  );
  const axisYLineSegments = useMemo(
    () =>
      renderModel
        ? resolveViewerAxisYLineSegments({
            renderModel,
            scale: contentPlacementMetrics.scale,
          })
        : undefined,
    [contentPlacementMetrics.scale, renderModel],
  );
  const gridPaginationMetrics = useMemo(
    () =>
      resolveViewerPaginationGridMetrics({
        scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
        scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
        usablePageWidthPx: previewMetrics.contentWidthPx,
        usablePageHeightPx: previewMetrics.contentHeightPx,
        firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
        continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
        cutGuides,
        axisXColumnSegments,
        axisYLineSegments,
        refinementPolicy: VIEWER_PRINT_CUT_REFINEMENT_POLICY,
      }),
    [
      axisXColumnSegments,
      axisYLineSegments,
      contentPlacementMetrics.scaledContentHeightPx,
      contentPlacementMetrics.scaledContentWidthPx,
      cutGuides,
      editorialHeights.continuationPageUsableHeightPx,
      editorialHeights.firstPageUsableHeightPx,
      previewMetrics.contentHeightPx,
      previewMetrics.contentWidthPx,
    ],
  );
  const printedPages = useMemo(
    () => resolveViewerPrintedPagesFromPaginationGrid(gridPaginationMetrics),
    [gridPaginationMetrics],
  );
  const paginatedSurfaceLayout = useMemo(
    () =>
      resolveViewerPaginatedSurfaceLayout({
        previewMetrics,
        scaledSurfaceWidthPx: contentPlacementMetrics.scaledContentWidthPx,
        scaledSurfaceHeightPx: contentPlacementMetrics.scaledContentHeightPx,
      }),
    [
      contentPlacementMetrics.scaledContentHeightPx,
      contentPlacementMetrics.scaledContentWidthPx,
      previewMetrics,
    ],
  );
  const previewTilePageModels = useMemo(
    () =>
      gridPaginationMetrics.tiles.map((tile) => {
        const editorialLayout = resolveViewerPrintedPageEditorialLayout({
          showDocumentTitle: printSettings.showDocumentTitle,
          documentTitleOverride: printSettings.documentTitleOverride,
          pageLayoutMode: printSettings.pageLayoutMode,
          showHeader: printSettings.showHeader,
          headerText: printSettings.headerText,
          showFooter: printSettings.showFooter,
          footerText: printSettings.footerText,
          showPageNumbers: printSettings.showPageNumbers,
          projectName: renderModel?.projectName ?? '',
          pageIndex: tile.pageNumber - 1,
          pageCount: gridPaginationMetrics.pageCount,
          contentHeightMm: pageMetrics.contentHeightMm,
          pxPerMmY: measuredPxPerMm.pxPerMmY,
        });
        return {
          tile,
          editorialLayout,
          isPartialLastPage:
            tile.col === 0 &&
            tile.row === gridPaginationMetrics.pagesY - 1 &&
            tile.sliceHeightPx < tile.usablePageHeightPx,
          sliceLayout: resolveViewerPageSliceLayout({
            viewportWidthPx: tile.sliceWidthPx,
            viewportHeightPx: tile.sliceHeightPx,
            surfaceWidthPx: paginatedSurfaceLayout.scaledSurfaceWidthPx,
            surfaceHeightPx: paginatedSurfaceLayout.scaledSurfaceHeightPx,
            offsetX: tile.offsetX,
            offsetY: tile.offsetY,
          }),
        };
      }),
    [
      gridPaginationMetrics.pageCount,
      gridPaginationMetrics.pagesY,
      gridPaginationMetrics.tiles,
      measuredPxPerMm.pxPerMmY,
      pageMetrics.contentHeightMm,
      paginatedSurfaceLayout.scaledSurfaceHeightPx,
      paginatedSurfaceLayout.scaledSurfaceWidthPx,
      printSettings.documentTitleOverride,
      printSettings.footerText,
      printSettings.headerText,
      printSettings.pageLayoutMode,
      printSettings.showDocumentTitle,
      printSettings.showFooter,
      printSettings.showHeader,
      printSettings.showPageNumbers,
      renderModel?.projectName,
    ],
  );
  const viewerPrintDocumentClassNames = useMemo(
    () => ({
      sequence: styles.viewerPrintedPageSequence,
      page: `${styles.viewerCanvasFrame} ${styles.viewerPaginatedPageFrame} ${styles.viewerPaginatedPageFramePrint} ${styles.viewerPrintedPage}`,
      contentBox: `${styles.viewerPageContentBox} ${styles.viewerPaginatedPageContentBox} ${styles.viewerPaginatedPageContentBoxPrint}`,
      flow: `${styles.viewerPrintDocumentFlow} ${styles.viewerPaginatedPageFlow} ${styles.viewerPaginatedPageFlowPrint}`,
      traceBlock: styles.viewerTraceMark,
      traceSeal: styles.viewerTraceMarkSeal,
      traceText: styles.viewerTraceMarkText,
      headerBlock: styles.viewerPageHeaderBlock,
      header: styles.runtimeHeader,
      titleBlock: styles.viewerPageTitleBlock,
      title: styles.runtimeDocumentTitle,
      viewport: styles.viewerCanvasScaledViewport,
      canvas: styles.viewerCanvasScaled,
      footerBlock: styles.viewerPageFooterBlock,
      footer: styles.runtimeFooter,
      pageNumber: styles.viewerPageNumber,
      bandRow: styles.viewerBandRow,
      bandRowHeader: styles.viewerBandRowHeader,
      bandRowMetric: styles.viewerBandRowMetric,
      bandCell: styles.viewerBandCell,
      bandCellMetric: styles.viewerBandCellMetric,
      bandCellMetricLabel: styles.viewerBandCellMetricLabel,
      bandCellMetricValue: styles.viewerBandCellMetricValue,
      piece: styles.viewerPiece,
      pieceGrid: styles.viewerPieceGrid,
      cell: styles.viewerCell,
    }),
    [styles],
  );
  const printFrameStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPrintPreview) return undefined;
    return {
      width: `${paginatedSurfaceLayout.paperWidthPx}px`,
      height: `${paginatedSurfaceLayout.paperHeightPx}px`,
      minHeight: `${paginatedSurfaceLayout.paperHeightPx}px`,
      maxHeight: `${paginatedSurfaceLayout.paperHeightPx}px`,
      margin: '0 auto',
    };
  }, [
    isPrintPreview,
    paginatedSurfaceLayout.paperHeightPx,
    paginatedSurfaceLayout.paperWidthPx,
  ]);
  const printContentBoxStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPrintPreview) return undefined;
    return {
      width: `${paginatedSurfaceLayout.contentWidthPx}px`,
      height: `${paginatedSurfaceLayout.contentHeightPx}px`,
      minHeight: `${paginatedSurfaceLayout.contentHeightPx}px`,
      maxHeight: `${paginatedSurfaceLayout.contentHeightPx}px`,
      margin: `${paginatedSurfaceLayout.paperPaddingPx.top}px ${paginatedSurfaceLayout.paperPaddingPx.right}px ${paginatedSurfaceLayout.paperPaddingPx.bottom}px ${paginatedSurfaceLayout.paperPaddingPx.left}px`,
    };
  }, [
    isPrintPreview,
    paginatedSurfaceLayout.contentHeightPx,
    paginatedSurfaceLayout.contentWidthPx,
    paginatedSurfaceLayout.paperPaddingPx.bottom,
    paginatedSurfaceLayout.paperPaddingPx.left,
    paginatedSurfaceLayout.paperPaddingPx.right,
    paginatedSurfaceLayout.paperPaddingPx.top,
  ]);
  const previewCanvasInnerStyle = useMemo<React.CSSProperties>(() => {
    const width = `${contentPlacementMetrics.baseContentWidthPx}px`;
    const height = `${contentPlacementMetrics.baseContentHeightPx}px`;
    if (!isPrintPreview) {
      return {
        width,
        height,
        transform: `scale(${zoom})`,
      };
    }
    return {
      width,
      height,
      transform: `scale(${contentPlacementMetrics.scale})`,
    };
  }, [
    contentPlacementMetrics.baseContentHeightPx,
    contentPlacementMetrics.baseContentWidthPx,
    contentPlacementMetrics.scale,
    isPrintPreview,
    zoom,
  ]);
  const printStyleText = useMemo(() => resolveViewerPrintPageCss(pageMetrics), [pageMetrics]);

  return {
    renderModel,
    pageMetrics,
    previewMetrics,
    printCssVars,
    previewCssVars,
    editorialHeights,
    effectivePrintScale,
    effectivePrintScalePct,
    contentPlacementMetrics,
    gridPaginationMetrics,
    printedPages,
    paginatedSurfaceLayout,
    previewTilePageModels,
    viewerPrintDocumentClassNames,
    printFrameStyle,
    printContentBoxStyle,
    previewCanvasInnerStyle,
    printStyleText,
  };
}
