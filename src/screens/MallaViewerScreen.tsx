import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Eye, Printer } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  applyViewerTheme,
  createDefaultViewerTheme,
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  VIEWER_THEME_MAX_TITLE_FONT_SIZE,
  VIEWER_THEME_MIN_TITLE_FONT_SIZE,
  VIEWER_THEME_TITLE_FONT_SIZE_STEP,
  VIEWER_ZOOM_STEP,
} from '../utils/viewer-theme.ts';
import {
  resolveViewerAxisXColumnSegments,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePrintScale,
  resolveViewerAxisYLineSegments,
  resolveViewerGridCutGuides,
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPageMetrics,
  resolveViewerPageEditorialHeights,
  resolveViewerPageSliceLayout,
  resolveViewerPrintCssVars,
  resolveViewerPrintedPageEditorialLayout,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPanelMode,
  VIEWER_PRINT_MAX_SCALE,
  VIEWER_PRINT_MIN_SCALE,
  VIEWER_PRINT_SCALE_STEP,
  VIEWER_PRINT_TITLE_FONT_SIZE_STEP,
  VIEWER_PRINT_TITLE_MAX_FONT_SIZE,
  VIEWER_PRINT_TITLE_MIN_FONT_SIZE,
  type ViewerPanelMode,
  type ViewerPaginationTile,
  type ViewerPrintedPage,
  type ViewerPrintPaperSize,
  type ViewerPrintSettings,
} from '../utils/viewer-print.ts';
import { useMeasuredPxPerMm } from '../utils/use-measured-px-per-mm.ts';
import { ViewerPrintDocument } from '../components/ViewerPrintDocument.tsx';
import styles from './MallaViewerScreen.module.css';

const VIEWER_PRINT_CUT_REFINEMENT_POLICY = {
  refineAxisX: true,
  refineAxisY: true,
} as const;

interface Props {
  snapshot: MallaSnapshot | null;
  mode: 'preview' | 'publication' | null;
  initialPanelMode?: ViewerPanelMode;
  theme: ViewerTheme;
  printSettings: ViewerPrintSettings;
  onThemeChange: (theme: ViewerTheme) => void;
  onPrintSettingsChange: (settings: ViewerPrintSettings) => void;
  onPanelModeChange?: (mode: ViewerPanelMode) => void;
  onBackToEditor: () => void;
  onOpenPublishModal: () => Promise<void> | void;
  onImportPublicationFile: (file: File) => Promise<void> | void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatSnapshotVersionId = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
};

const borderStyleFromSnapshot = (value: 'none' | 'thin' | 'strong') => {
  if (value === 'none') return 'none';
  if (value === 'strong') return '2px solid rgba(15, 23, 42, 0.65)';
  return '1px solid rgba(15, 23, 42, 0.38)';
};

const cellTextFromType = (text: string, type: string, checked?: boolean): string => {
  if (type === 'checkbox') {
    return checked ? `\u2611 ${text}` : `\u2610 ${text}`;
  }
  return text;
};

const resolveBandCellTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  if (align === 'justify') return 'left';
  return align;
};

export function MallaViewerScreen({
  snapshot,
  mode,
  initialPanelMode = 'preview',
  theme,
  printSettings,
  onThemeChange,
  onPrintSettingsChange,
  onPanelModeChange,
  onBackToEditor,
  onOpenPublishModal,
  onImportPublicationFile,
}: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const printableRootRef = useRef<HTMLDivElement>(null);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isAppearanceOpen, setAppearanceOpen] = useState(true);
  const [viewerPanelMode, setViewerPanelMode] = useState<ViewerPanelMode>('preview');
  const [isPanning, setIsPanning] = useState(false);
  const [pointerMode] = useState<'select' | 'pan'>('pan');
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const renderModel = useMemo(() => {
    if (!snapshot) return null;
    return applyViewerTheme(snapshot, theme);
  }, [snapshot, theme]);

  const zoomPct = `${Math.round(zoom * 100)}%`;
  const isPrintPreview = viewerPanelMode === 'print-preview';
  const panelMode = resolveViewerPanelMode(isPrintPreview);
  const printScalePct = `${Math.round(printSettings.scale * 100)}%`;
  const measuredPxPerMm = useMeasuredPxPerMm();
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
  const gridPaginationMetrics = useMemo(
    () =>
      resolveViewerPaginationGridMetrics({
        scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
        scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
        usablePageWidthPx: previewMetrics.contentWidthPx,
        usablePageHeightPx: previewMetrics.contentHeightPx,
        firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
        continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
        cutGuides: renderModel
          ? resolveViewerGridCutGuides({
              renderModel,
              scale: contentPlacementMetrics.scale,
            })
          : undefined,
        axisXColumnSegments: renderModel
          ? resolveViewerAxisXColumnSegments({
              renderModel,
              scale: contentPlacementMetrics.scale,
            })
          : undefined,
        axisYLineSegments: renderModel
          ? resolveViewerAxisYLineSegments({
              renderModel,
              scale: contentPlacementMetrics.scale,
            })
          : undefined,
        refinementPolicy: VIEWER_PRINT_CUT_REFINEMENT_POLICY,
      }),
    [
      contentPlacementMetrics.scaledContentHeightPx,
      contentPlacementMetrics.scaledContentWidthPx,
      contentPlacementMetrics.scale,
      editorialHeights.continuationPageUsableHeightPx,
      editorialHeights.firstPageUsableHeightPx,
      previewMetrics.contentHeightPx,
      previewMetrics.contentWidthPx,
      renderModel,
    ],
  );
  const previewGridTiles = gridPaginationMetrics.tiles;
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

  const printStyleText = useMemo(() => {
    return resolveViewerPrintPageCss(pageMetrics);
  }, [pageMetrics]);
  const snapshotVersionText = snapshot
    ? `Versión Publicable (${formatSnapshotVersionId(snapshot.createdAt)})`
    : '';
  const snapshotModeText = isPrintPreview ? 'MODO DOCUMENTO' : 'MODO PRESENTACION';
  const snapshotMetaText =
    snapshotVersionText && snapshotModeText
      ? `${snapshotVersionText}\n${snapshotModeText}`
      : snapshotVersionText || snapshotModeText;

  const setZoomSafe = useCallback((value: number) => {
    setZoom(clamp(value, VIEWER_MIN_ZOOM, VIEWER_MAX_ZOOM));
  }, []);

  const setThemeSafe = useCallback(
    (next: ViewerTheme | ((prev: ViewerTheme) => ViewerTheme)) => {
      if (typeof next === 'function') {
        const updater = next as (prev: ViewerTheme) => ViewerTheme;
        onThemeChange(updater(theme));
        return;
      }
      onThemeChange(next);
    },
    [onThemeChange, theme],
  );

  const setPrintSettingsSafe = useCallback(
    (next: ViewerPrintSettings | ((prev: ViewerPrintSettings) => ViewerPrintSettings)) => {
      if (typeof next === 'function') {
        const updater = next as (prev: ViewerPrintSettings) => ViewerPrintSettings;
        onPrintSettingsChange(updater(printSettings));
        return;
      }
      onPrintSettingsChange(next);
    },
    [onPrintSettingsChange, printSettings],
  );

  const handleZoomIn = useCallback(() => {
    setZoomSafe(zoom + VIEWER_ZOOM_STEP);
  }, [setZoomSafe, zoom]);

  const handleZoomOut = useCallback(() => {
    setZoomSafe(zoom - VIEWER_ZOOM_STEP);
  }, [setZoomSafe, zoom]);

  const handleOpenImporter = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          await onImportPublicationFile(file);
        } finally {
          event.target.value = '';
        }
      })();
    },
    [onImportPublicationFile],
  );

  const handleViewportMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isPrintPreview || pointerMode !== 'pan' || event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
    window.getSelection()?.removeAllRanges();
    event.preventDefault();
  }, [isPrintPreview, pointerMode]);

  useEffect(() => {
    if (!isPanning) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      viewport.scrollLeft = panStartRef.current.scrollLeft - deltaX;
      viewport.scrollTop = panStartRef.current.scrollTop - deltaY;
    };
    const handleMouseUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  useEffect(() => {
    setViewerPanelMode(initialPanelMode);
  }, [initialPanelMode, mode]);

  useEffect(() => {
    onPanelModeChange?.(viewerPanelMode);
  }, [onPanelModeChange, viewerPanelMode]);

  const handleEnterPrintPreview = useCallback(() => {
    setViewerPanelMode('print-preview');
    setAppearanceOpen(true);
  }, []);

  const handleExitPrintPreview = useCallback(() => {
    setViewerPanelMode('preview');
  }, []);

  const cleanupPrintIframe = useCallback(() => {
    const iframe = printIframeRef.current;
    if (!iframe) return;
    iframe.remove();
    printIframeRef.current = null;
  }, []);

  useEffect(() => cleanupPrintIframe, [cleanupPrintIframe]);

  const handlePrintNow = useCallback(() => {
    const sourceRoot = printableRootRef.current;
    if (!sourceRoot) return;

    cleanupPrintIframe();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
    printIframeRef.current = iframe;

    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument;
    if (!frameWindow || !frameDocument) {
      cleanupPrintIframe();
      return;
    }

    frameDocument.open();
    frameDocument.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>MallaVisual Print</title></head><body></body></html>',
    );
    frameDocument.close();

    const { head, body } = frameDocument;
    const stylesheetNodes = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    );
    const inlineStyleNodes = Array.from(document.querySelectorAll<HTMLStyleElement>('style'));

    const stylesheetPromises = stylesheetNodes.map((source) => {
      const target = frameDocument.createElement('link');
      target.rel = 'stylesheet';
      target.href = source.href;
      head.appendChild(target);
      return new Promise<void>((resolve) => {
        target.addEventListener('load', () => resolve(), { once: true });
        target.addEventListener('error', () => resolve(), { once: true });
        window.setTimeout(() => resolve(), 1200);
      });
    });

    inlineStyleNodes.forEach((source) => {
      const target = frameDocument.createElement('style');
      target.textContent = source.textContent;
      head.appendChild(target);
    });

    const pageStyle = frameDocument.createElement('style');
    pageStyle.textContent = `${printStyleText}
html, body { margin: 0; padding: 0; background: #fff; }
body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`;
    head.appendChild(pageStyle);

    const printRootClone = sourceRoot.cloneNode(true);
    body.appendChild(printRootClone);

    void Promise.all(stylesheetPromises).finally(() => {
      const printNow = () => {
        if (printIframeRef.current !== iframe) return;
        frameWindow.focus();
        frameWindow.print();
      };
      const finish = () => {
        window.setTimeout(() => {
          if (printIframeRef.current === iframe) {
            cleanupPrintIframe();
          }
        }, 0);
      };
      frameWindow.onafterprint = finish;

      void frameDocument.fonts.ready
        .catch(() => undefined)
        .finally(() => window.requestAnimationFrame(printNow));

      window.setTimeout(() => {
        if (printIframeRef.current === iframe) {
          cleanupPrintIframe();
        }
      }, 4000);
    });
  }, [cleanupPrintIframe, printStyleText]);

  const canvasContent = useMemo(() => {
    if (!renderModel) return null;
    return (
      <>
        {renderModel.bandsRenderRows.map((row) => (
          <div
            key={`band-row-${row.kind}-${row.id}`}
            className={`${styles.viewerBandRow} ${row.kind === 'header' ? styles.viewerBandRowHeader : styles.viewerBandRowMetric}`}
            style={{
              top: `${row.top}px`,
              height: `${row.height}px`,
              width: `${Math.max(renderModel.width, 1)}px`,
            }}
          >
            {row.cells.map((cell, index) => (
              <div
                key={`band-cell-${row.kind}-${row.id}-${cell.col}-${index}`}
                className={styles.viewerBandCell}
                style={{
                  left: `${cell.left}px`,
                  width: `${cell.width}px`,
                  height: `${row.height}px`,
                  backgroundColor: cell.style.backgroundColor,
                  color: cell.style.textColor,
                  border: borderStyleFromSnapshot(cell.style.border),
                  textAlign: resolveBandCellTextAlign(cell.style.textAlign),
                  fontSize: `${cell.style.fontSizePx}px`,
                  padding: `${cell.style.paddingY}px ${cell.style.paddingX}px`,
                  fontWeight: cell.bold || cell.style.bold ? 700 : 400,
                  fontStyle: cell.style.italic ? 'italic' : 'normal',
                }}
              >
                {cell.label ? (
                  <div className={styles.viewerBandCellMetric}>
                    <span className={styles.viewerBandCellMetricLabel}>{cell.label}</span>
                    <span className={styles.viewerBandCellMetricValue}>{cell.text}</span>
                  </div>
                ) : (
                  <span>{cell.text}</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {renderModel.items.map((item) => (
          <article
            key={item.id}
            className={styles.viewerPiece}
            style={{
              left: `${item.left}px`,
              top: `${item.top}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              borderWidth: `${renderModel.theme.blockBorderWidth}px`,
              borderRadius: `${renderModel.theme.blockBorderRadius}px`,
            }}
          >
            <div className={styles.viewerPieceGrid} style={item.gridStyle}>
              {item.cells.map((cell) => (
                <div
                  key={`${item.id}-${cell.row}-${cell.col}`}
                  className={styles.viewerCell}
                  style={{
                    gridRow: `${cell.row + 1} / ${cell.row + cell.rowSpan + 1}`,
                    gridColumn: `${cell.col + 1} / ${cell.col + cell.colSpan + 1}`,
                    backgroundColor: cell.style.backgroundColor,
                    color: cell.style.textColor,
                    border: borderStyleFromSnapshot(cell.style.border),
                    textAlign: cell.style.textAlign,
                    fontSize: `${cell.style.fontSizePx}px`,
                    padding: `${cell.style.paddingY}px ${cell.style.paddingX}px`,
                    fontWeight: cell.style.bold ? 700 : 400,
                    fontStyle: cell.style.italic ? 'italic' : 'normal',
                  }}
                  title={cell.text}
                >
                  <span>{cellTextFromType(cell.text, cell.type, cell.checked)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </>
    );
  }, [renderModel]);

  const renderPrintSliceContent = useCallback(
    (sliceLayout: ReturnType<typeof resolveViewerPageSliceLayout>) => {
      if (!renderModel) return null;
      const scale = Math.max(contentPlacementMetrics.scale, 0.0001);
      const sliceLeftPx = sliceLayout.offsetX;
      const sliceTopPx = sliceLayout.offsetY;
      const sliceRightPx = sliceLayout.offsetX + sliceLayout.viewportWidthPx;
      const sliceBottomPx = sliceLayout.offsetY + sliceLayout.viewportHeightPx;
      const localWidthPx = sliceLayout.viewportWidthPx;
      const localHeightPx = sliceLayout.viewportHeightPx;

      const visibleBandRows = renderModel.bandsRenderRows
        .filter((row) => {
          const rowTopPx = row.top * scale;
          const rowHeightPx = row.height * scale;
          return rowTopPx + rowHeightPx > sliceTopPx && rowTopPx < sliceBottomPx;
        })
        .map((row) => ({
          ...row,
          top: row.top * scale - sliceTopPx,
          height: row.height * scale,
          cells: row.cells
            .filter((cell) => {
              const cellLeftPx = cell.left * scale;
              const cellWidthPx = cell.width * scale;
              return cellLeftPx + cellWidthPx > sliceLeftPx && cellLeftPx < sliceRightPx;
            })
            .map((cell) => ({
              ...cell,
              left: cell.left * scale - sliceLeftPx,
              width: cell.width * scale,
            })),
        }));

      const visibleItems = renderModel.items
        .filter(
          (item) =>
            item.left * scale + item.width * scale > sliceLeftPx &&
            item.left * scale < sliceRightPx &&
            item.top * scale + item.height * scale > sliceTopPx &&
            item.top * scale < sliceBottomPx,
        )
        .map((item) => ({
          ...item,
          left: item.left * scale - sliceLeftPx,
          top: item.top * scale - sliceTopPx,
          width: item.width * scale,
          height: item.height * scale,
          cellWidth: item.cellWidth * scale,
          cellHeight: item.cellHeight * scale,
          gridStyle: {
            width: item.cols * item.cellWidth * scale + Math.max(0, item.cols - 1) * 2 * scale,
            height: item.rows * item.cellHeight * scale + Math.max(0, item.rows - 1) * 2 * scale,
            gridTemplateColumns: `repeat(${item.cols}, ${item.cellWidth * scale}px)`,
            gridTemplateRows: `repeat(${item.rows}, ${item.cellHeight * scale}px)`,
            gap: `${2 * scale}px`,
            padding: `${4 * scale}px`,
          },
        }));

      return (
        <div
          className={styles.viewerCanvasScaled}
          style={{
            width: `${localWidthPx}px`,
            height: `${localHeightPx}px`,
            transform: 'none',
          }}
        >
          {visibleBandRows.map((row) => (
            <div
              key={`print-band-row-${row.kind}-${row.id}`}
              className={`${styles.viewerBandRow} ${row.kind === 'header' ? styles.viewerBandRowHeader : styles.viewerBandRowMetric}`}
              style={{
                top: `${row.top}px`,
                height: `${row.height}px`,
                width: `${Math.max(localWidthPx, 1)}px`,
              }}
            >
              {row.cells.map((cell, index) => (
                <div
                  key={`print-band-cell-${row.kind}-${row.id}-${cell.col}-${index}`}
                  className={styles.viewerBandCell}
                  style={{
                    left: `${cell.left}px`,
                    width: `${cell.width}px`,
                    height: `${row.height}px`,
                    backgroundColor: cell.style.backgroundColor,
                    color: cell.style.textColor,
                    border: borderStyleFromSnapshot(cell.style.border),
                    textAlign: resolveBandCellTextAlign(cell.style.textAlign),
                    fontSize: `${cell.style.fontSizePx * scale}px`,
                    padding: `${cell.style.paddingY * scale}px ${cell.style.paddingX * scale}px`,
                    fontWeight: cell.bold || cell.style.bold ? 700 : 400,
                    fontStyle: cell.style.italic ? 'italic' : 'normal',
                  }}
                >
                  {cell.label ? (
                    <div className={styles.viewerBandCellMetric}>
                      <span className={styles.viewerBandCellMetricLabel}>{cell.label}</span>
                      <span className={styles.viewerBandCellMetricValue}>{cell.text}</span>
                    </div>
                  ) : (
                    <span>{cell.text}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
          {visibleItems.map((item) => (
            <article
              key={`print-item-${item.id}`}
              className={styles.viewerPiece}
              style={{
                left: `${item.left}px`,
                top: `${item.top}px`,
                width: `${item.width}px`,
                height: `${item.height}px`,
                borderWidth: `${renderModel.theme.blockBorderWidth * scale}px`,
                borderRadius: `${renderModel.theme.blockBorderRadius * scale}px`,
              }}
            >
              <div className={styles.viewerPieceGrid} style={item.gridStyle}>
                {item.cells.map((cell) => (
                  <div
                    key={`print-${item.id}-${cell.row}-${cell.col}`}
                    className={styles.viewerCell}
                    style={{
                      gridRow: `${cell.row + 1} / ${cell.row + cell.rowSpan + 1}`,
                      gridColumn: `${cell.col + 1} / ${cell.col + cell.colSpan + 1}`,
                      backgroundColor: cell.style.backgroundColor,
                      color: cell.style.textColor,
                      border: borderStyleFromSnapshot(cell.style.border),
                      textAlign: cell.style.textAlign,
                      fontSize: `${cell.style.fontSizePx * scale}px`,
                      padding: `${cell.style.paddingY * scale}px ${cell.style.paddingX * scale}px`,
                      fontWeight: cell.style.bold ? 700 : 400,
                      fontStyle: cell.style.italic ? 'italic' : 'normal',
                    }}
                    title={cell.text}
                  >
                    <span>{cellTextFromType(cell.text, cell.type, cell.checked)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    },
    [contentPlacementMetrics.scale, renderModel],
  );

  if (!snapshot || !renderModel) {
    return (
      <section className={styles.viewerEmpty}>
        <h2>{mode === 'publication' ? 'Versión publicada' : 'Vista previa de malla'}</h2>
        <p>
          {mode === 'publication'
            ? 'No hay una versión publicada cargada.'
            : 'No hay datos para vista previa.'}
        </p>
        {mode === 'publication' ? (
          <Button type="button" variant="primary" onClick={handleOpenImporter}>
            Abrir versión publicada
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onBackToEditor}>
            Volver al editor
          </Button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportInputChange}
          accept="application/json"
          className={styles.hiddenInput}
        />
      </section>
    );
  }

  const renderPaginatedSurfacePage = (input: {
    key: string;
    sliceLayout: ReturnType<typeof resolveViewerPageSliceLayout>;
    variant: 'preview' | 'print';
    pageAttrs?: Record<string, string | undefined>;
    isPartialLastPage: boolean;
    editorialLayout: ReturnType<typeof resolveViewerPrintedPageEditorialLayout>;
  }) => {
    const frameClassName =
      input.variant === 'preview'
        ? `${styles.viewerCanvasFrame} ${styles.viewerPaginatedPageFrame} ${styles.viewerPaginatedPageFramePreview}`
        : `${styles.viewerCanvasFrame} ${styles.viewerPaginatedPageFrame} ${styles.viewerPaginatedPageFramePrint} ${styles.viewerPrintedPage}`;
    const contentBoxClassName =
      input.variant === 'preview'
        ? `${styles.viewerPageContentBox} ${styles.viewerPaginatedPageContentBox} ${styles.viewerPaginatedPageContentBoxPreview}`
        : `${styles.viewerPageContentBox} ${styles.viewerPaginatedPageContentBox} ${styles.viewerPaginatedPageContentBoxPrint}`;
    const flowClassName =
      input.variant === 'preview'
        ? `${styles.viewerPrintDocumentFlow} ${styles.viewerPaginatedPageFlow} ${styles.viewerPaginatedPageFlowPreview}`
        : `${styles.viewerPrintDocumentFlow} ${styles.viewerPaginatedPageFlow} ${styles.viewerPaginatedPageFlowPrint}`;

    return (
      <div
        key={input.key}
        className={frameClassName}
        style={input.variant === 'preview' ? printFrameStyle : undefined}
        data-partial-last-page={input.isPartialLastPage ? 'true' : undefined}
        {...input.pageAttrs}
      >
        <div className={contentBoxClassName} style={input.variant === 'preview' ? printContentBoxStyle : undefined}>
          <div className={flowClassName}>
            {input.editorialLayout.headerText ? (
              <div className={styles.viewerPageHeaderBlock}>
                <div className={styles.runtimeHeader}>{input.editorialLayout.headerText}</div>
              </div>
            ) : null}
            {input.editorialLayout.documentTitle ? (
              <div className={styles.viewerPageTitleBlock}>
                <h1
                  className={styles.runtimeDocumentTitle}
                  style={{ fontSize: `${printSettings.documentTitleFontSize}px` }}
                >
                  {input.editorialLayout.documentTitle}
                </h1>
              </div>
            ) : null}
            <div
              className={styles.viewerCanvasScaledViewport}
              style={{
                width: `${input.sliceLayout.viewportWidthPx}px`,
                height: `${input.sliceLayout.viewportHeightPx}px`,
              }}
            >
              {input.variant === 'preview' ? (
                <div
                  className={styles.viewerCanvasSliceTrack}
                  style={{
                    width: `${input.sliceLayout.surfaceWidthPx}px`,
                    height: `${input.sliceLayout.surfaceHeightPx}px`,
                    transform: `translate(-${input.sliceLayout.offsetX}px, -${input.sliceLayout.offsetY}px)`,
                  }}
                >
                  <div className={styles.viewerCanvasScaled} style={previewCanvasInnerStyle}>
                    {canvasContent}
                  </div>
                </div>
              ) : (
                renderPrintSliceContent(input.sliceLayout)
              )}
            </div>
            {input.editorialLayout.footerText || input.editorialLayout.pageNumberText ? (
              <div className={styles.viewerPageFooterBlock}>
                {input.editorialLayout.footerText ? (
                  <div className={styles.runtimeFooter}>{input.editorialLayout.footerText}</div>
                ) : (
                  <div />
                )}
                {input.editorialLayout.pageNumberText ? (
                  <div className={styles.viewerPageNumber}>{input.editorialLayout.pageNumberText}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewGridTile = (tile: ViewerPaginationTile) => {
    const editorialLayout = resolveViewerPrintedPageEditorialLayout({
      showDocumentTitle: printSettings.showDocumentTitle,
      documentTitleOverride: printSettings.documentTitleOverride,
      pageLayoutMode: printSettings.pageLayoutMode,
      showHeader: printSettings.showHeader,
      headerText: printSettings.headerText,
      showFooter: printSettings.showFooter,
      footerText: printSettings.footerText,
      showPageNumbers: printSettings.showPageNumbers,
      projectName: renderModel.projectName,
      pageIndex: tile.pageNumber - 1,
      pageCount: gridPaginationMetrics.pageCount,
      contentHeightMm: pageMetrics.contentHeightMm,
      pxPerMmY: measuredPxPerMm.pxPerMmY,
    });
    const isPartialLastPage =
      tile.col === 0 &&
      tile.row === gridPaginationMetrics.pagesY - 1 &&
      tile.sliceHeightPx < tile.usablePageHeightPx;
    const sliceLayout = resolveViewerPageSliceLayout({
      viewportWidthPx: tile.sliceWidthPx,
      viewportHeightPx: tile.sliceHeightPx,
      surfaceWidthPx: paginatedSurfaceLayout.scaledSurfaceWidthPx,
      surfaceHeightPx: paginatedSurfaceLayout.scaledSurfaceHeightPx,
      offsetX: tile.offsetX,
      offsetY: tile.offsetY,
    });

    return renderPaginatedSurfacePage({
      key: `preview-page-${tile.row}-${tile.col}`,
      variant: 'preview',
      sliceLayout,
      isPartialLastPage,
      editorialLayout,
      pageAttrs: {
        'data-grid-row': `${tile.row}`,
        'data-grid-col': `${tile.col}`,
      },
    });
  };

  const renderPrintedPage = (page: ViewerPrintedPage) => {
    const editorialLayout = resolveViewerPrintedPageEditorialLayout({
      showDocumentTitle: printSettings.showDocumentTitle,
      documentTitleOverride: printSettings.documentTitleOverride,
      pageLayoutMode: printSettings.pageLayoutMode,
      showHeader: printSettings.showHeader,
      headerText: printSettings.headerText,
      showFooter: printSettings.showFooter,
      footerText: printSettings.footerText,
      showPageNumbers: printSettings.showPageNumbers,
      projectName: renderModel.projectName,
      pageIndex: page.pageNumber - 1,
      pageCount: printedPages.length,
      contentHeightMm: pageMetrics.contentHeightMm,
      pxPerMmY: measuredPxPerMm.pxPerMmY,
    });
    const isPartialLastPage = page.tileCol === 0 && page.isLastRow && page.sliceHeightPx < page.usablePageHeightPx;

    const sliceLayout = resolveViewerPageSliceLayout({
      viewportWidthPx: page.viewportWidthPx,
      viewportHeightPx: page.viewportHeightPx,
      surfaceWidthPx: paginatedSurfaceLayout.scaledSurfaceWidthPx,
      surfaceHeightPx: paginatedSurfaceLayout.scaledSurfaceHeightPx,
      offsetX: page.printOffsetX,
      offsetY: page.printOffsetY,
    });

    return renderPaginatedSurfacePage({
      key: `printed-page-${page.pageNumber}`,
      variant: 'print',
      sliceLayout,
      isPartialLastPage,
      editorialLayout,
      pageAttrs: {
        'data-page-number': `${page.pageNumber}`,
        'data-tile-row': `${page.tileRow}`,
        'data-tile-col': `${page.tileCol}`,
      },
    });
  };

  const previewPaginatedGridSurface = isPrintPreview ? (
    <div
      className={styles.viewerPreviewPageStack}
      data-grid-pages-x={gridPaginationMetrics.pagesX}
      data-grid-pages-y={gridPaginationMetrics.pagesY}
      style={{
        gridTemplateColumns: `repeat(${gridPaginationMetrics.pagesX}, max-content)`,
      }}
    >
      {previewGridTiles.map(renderPreviewGridTile)}
    </div>
  ) : null;

  const printPreviewScreenContent = isPrintPreview ? (
    <>
      {previewPaginatedGridSurface}
    </>
  ) : (
    <div className={styles.viewerCanvasFrame}>
      <div className={styles.viewerPageContentBox}>
        <div className={styles.viewerPrintDocumentFlow}>
          <div className={styles.viewerCanvasScaledViewport}>
            <div className={styles.viewerCanvasScaled} style={previewCanvasInnerStyle}>
              {canvasContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const printDocumentContent = isPrintPreview ? (
    <div className={styles.printOnly}>
      <ViewerPrintDocument
        renderModel={renderModel}
        printedPages={printedPages}
        paginatedSurfaceLayout={paginatedSurfaceLayout}
        contentScale={contentPlacementMetrics.scale}
        printSettings={printSettings}
        pageMetrics={pageMetrics}
        pxPerMmY={measuredPxPerMm.pxPerMmY}
        classNames={{
          sequence: styles.viewerPrintedPageSequence,
          page: `${styles.viewerCanvasFrame} ${styles.viewerPaginatedPageFrame} ${styles.viewerPaginatedPageFramePrint} ${styles.viewerPrintedPage}`,
          contentBox: `${styles.viewerPageContentBox} ${styles.viewerPaginatedPageContentBox} ${styles.viewerPaginatedPageContentBoxPrint}`,
          flow: `${styles.viewerPrintDocumentFlow} ${styles.viewerPaginatedPageFlow} ${styles.viewerPaginatedPageFlowPrint}`,
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
        }}
      />
    </div>
  ) : null;

  return (
    <section className={styles.viewerScreen}>
      <Header
        className={`${styles.viewerHeader} ${isPrintPreview ? styles.viewerHeaderPrintMode : styles.viewerHeaderPreviewMode} ${styles.noPrint}`}
        left={
          <div className={styles.viewerHeaderLeft}>
            <div className={styles.viewerTitleWrap}>
              <h2
                className={styles.viewerTitle}
                title={renderModel.projectName}
              >
                {renderModel.projectName}
              </h2>
              <span className={styles.snapshotMeta} title={snapshotMetaText}>
                <span className={styles.snapshotMetaLine}>{snapshotVersionText}</span>
                <span className={styles.snapshotMetaModeLine}>
                  {isPrintPreview ? (
                    <Printer className={styles.snapshotMetaModeIcon} aria-hidden="true" size={12} />
                  ) : (
                    <Eye className={styles.snapshotMetaModeIcon} aria-hidden="true" size={12} />
                  )}
                  <strong className={styles.snapshotMetaModeLabel}>{snapshotModeText}</strong>
                </span>
              </span>
            </div>
            <Button type="button" onClick={onBackToEditor} className={styles.viewerBackButton}>
              Volver al editor
            </Button>
          </div>
        }
        center={
          isPrintPreview ? null : (
            <label className={styles.zoomControl}>
              <div className={styles.zoomControlGroup}>
                <button
                  type="button"
                  className={styles.zoomButton}
                  onClick={handleZoomOut}
                  disabled={zoom <= VIEWER_MIN_ZOOM}
                  aria-label="Reducir zoom"
                >
                  -
                </button>
                <input
                  className={styles.zoomSlider}
                  type="range"
                  min={VIEWER_MIN_ZOOM}
                  max={VIEWER_MAX_ZOOM}
                  step={VIEWER_ZOOM_STEP}
                  value={zoom}
                  onChange={(event) => setZoomSafe(Number(event.target.value))}
                  aria-label="Nivel de zoom de la publicación"
                />
                <button
                  type="button"
                  className={styles.zoomButton}
                  onClick={handleZoomIn}
                  disabled={zoom >= VIEWER_MAX_ZOOM}
                  aria-label="Aumentar zoom"
                >
                  +
                </button>
                <span className={styles.zoomValue}>{zoomPct}</span>
              </div>
              <div className={styles.pointerToggle} role="group" aria-label="Modo del puntero">
                <button
                  type="button"
                  className={styles.pointerToggleButton}
                  aria-pressed={false}
                  disabled
                  title="Selección deshabilitada en vista previa/publicación"
                >
                  👉🏻
                </button>
                <button
                  type="button"
                  className={`${styles.pointerToggleButton} ${styles.pointerToggleButtonActive}`}
                  aria-pressed={true}
                  title="Arrastre activo"
                >
                  🤚🏻
                </button>
              </div>
            </label>
          )
        }
        right={
          <div className={styles.viewerActions}>
            {isPrintPreview ? (
              <>
                <Button type="button" onClick={handleExitPrintPreview}>
                  Volver al Modo Presentación
                </Button>
                <Button
                  type="button"
                  onClick={() => void onOpenPublishModal()}
                  className={styles.viewerPublishCta}
                >
                  Publicar documento
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handlePrintNow}
                  className={styles.viewerPrintCta}
                >
                  Imprimir ahora
                </Button>
              </>
            ) : (
                <Button
                  type="button"
                  onClick={handleEnterPrintPreview}
                  title="Ir al Modo Documento para configurar la salida editorial y paginada"
                >
                  Ir al Modo Documento
                </Button>
            )}
            {!isPrintPreview && mode === 'preview' ? (
              <Button
                type="button"
                onClick={() => void onOpenPublishModal()}
                className={styles.viewerPublishCta}
              >
                Publicar Web/Datos
              </Button>
            ) : null}
            {!isPrintPreview && mode !== 'preview' ? (
              <Button type="button" onClick={handleOpenImporter}>
                Abrir publicación
              </Button>
            ) : null}
          </div>
        }
      />
      <div className={`${styles.viewerBody} ${!isAppearanceOpen ? styles.appearanceCollapsed : ''}`}>
        {!isAppearanceOpen ? (
          <Button
            type="button"
            className={`${styles.appearanceToggle} ${styles.appearanceToggleRestore} ${styles.noPrint}`}
            onClick={() => setAppearanceOpen(true)}
            aria-label="Mostrar panel lateral"
            title="Mostrar panel lateral"
          >
            ›
          </Button>
        ) : null}
        <aside
          className={`${styles.appearancePanel} ${isAppearanceOpen ? styles.appearanceOpen : ''} ${styles.noPrint}`}
        >
          <div className={styles.appearanceToggleRow}>
            <Button
              type="button"
              className={`${styles.appearanceToggle} ${styles.appearanceToggleHide}`}
              onClick={() => setAppearanceOpen(false)}
              aria-label="Ocultar panel lateral"
              title="Ocultar panel lateral"
            >
              ‹
            </Button>
          </div>
          {panelMode === 'preview' ? (
            <>
              <h3>Apariencia base</h3>
              <label className={`${styles.field} ${styles.scaleField}`}>
                <span>Separación horizontal</span>
                <input
                  className={styles.compactRange}
                  type="range"
                  min={0}
                  max={96}
                  value={theme.gapX}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapX: Number(event.target.value) }))}
                />
              </label>
              <label className={`${styles.field} ${styles.scaleField}`}>
                <span>Separación vertical</span>
                <input
                  className={styles.compactRange}
                  type="range"
                  min={0}
                  max={96}
                  value={theme.gapY}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapY: Number(event.target.value) }))}
                />
              </label>
              <label className={styles.field}>
                <span>Ancho mínimo de columnas</span>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={5}
                  value={theme.minColumnWidth}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, minColumnWidth: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Alto mínimo de líneas curriculares</span>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={5}
                  value={theme.minRowHeight}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, minRowHeight: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Espaciado de contenido</span>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={theme.cellPadding}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, cellPadding: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Marco de bloques curriculares</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={theme.blockBorderWidth}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, blockBorderWidth: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Curvatura de marcos</span>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={theme.blockBorderRadius}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, blockBorderRadius: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Escala general de textos</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={theme.typographyScale}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, typographyScale: Number(event.target.value) }))
                  }
                />
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={theme.showTitle}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, showTitle: event.target.checked }))
                  }
                />
                <span>Agregar título</span>
              </label>
              <label className={styles.field} title="Si queda vacío, se usa el nombre del proyecto.">
                <input
                  type="text"
                  value={theme.titleText}
                  placeholder="Personaliza el título de la salida web"
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, titleText: event.target.value }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Escala del título</span>
                <input
                  type="range"
                  min={VIEWER_THEME_MIN_TITLE_FONT_SIZE}
                  max={VIEWER_THEME_MAX_TITLE_FONT_SIZE}
                  step={VIEWER_THEME_TITLE_FONT_SIZE_STEP}
                  value={theme.titleFontSize}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, titleFontSize: Number(event.target.value) }))
                  }
                />
                <span className={styles.fieldHint}>{`${Math.round(theme.titleFontSize)} px`}</span>
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={theme.showHeaderFooter}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, showHeaderFooter: event.target.checked }))
                  }
                />
                <span>Marco editorial web mínimo</span>
              </label>
              <label className={styles.field}>
                <span>Encabezado web</span>
                <input
                  type="text"
                  value={theme.headerText}
                  placeholder="Texto opcional para la salida web"
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, headerText: event.target.value }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Pie web</span>
                <input
                  type="text"
                  value={theme.footerText}
                  placeholder="Texto opcional para la salida web"
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, footerText: event.target.value }))
                  }
                />
              </label>
              <Button type="button" onClick={() => onThemeChange(createDefaultViewerTheme())}>
                Restablecer
              </Button>
            </>
          ) : (
            <>
              <h3>Ajustes documentales</h3>
              <label className={styles.field}>
                <span>Tamaño de papel</span>
                <select
                  value={printSettings.paperSize}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({
                      ...prev,
                      paperSize: event.target.value as ViewerPrintPaperSize,
                    }))
                  }
                >
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                  <option value="carta">Carta</option>
                  <option value="oficio">Oficio</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Orientación</span>
                <select
                  value={printSettings.orientation}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({
                      ...prev,
                      orientation: event.target.value === 'landscape' ? 'landscape' : 'portrait',
                    }))
                  }
                >
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
              </label>
              <label className={`${styles.field} ${styles.scaleField}`}>
                <span>Escala</span>
                <input
                  className={styles.compactRange}
                  type="range"
                  min={VIEWER_PRINT_MIN_SCALE}
                  max={VIEWER_PRINT_MAX_SCALE}
                  step={VIEWER_PRINT_SCALE_STEP}
                  value={printSettings.scale}
                  disabled={printSettings.fitToWidth}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, scale: Number(event.target.value) }))
                  }
                />
                <span className={styles.fieldHint}>
                  {printSettings.fitToWidth ? `Auto: ${effectivePrintScalePct} · Manual: ${printScalePct}` : printScalePct}
                </span>
              </label>
              <label
                className={`${styles.toggleField} ${styles.inlineScaleToggle}`}
                title="Ocupa una sola página horizontal"
              >
                <input
                  type="checkbox"
                  checked={printSettings.fitToWidth}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, fitToWidth: event.target.checked }))
                  }
                />
                <span>Autoajustar</span>
              </label>
              <label className={styles.field}>
                <span>Márgenes</span>
                <select
                  value={printSettings.margins}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({
                      ...prev,
                      margins:
                        event.target.value === 'narrow' || event.target.value === 'wide'
                          ? event.target.value
                          : 'normal',
                    }))
                  }
                >
                  <option value="narrow">Estrechos</option>
                  <option value="normal">Normales</option>
                  <option value="wide">Amplios</option>
                </select>
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={printSettings.showDocumentTitle}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, showDocumentTitle: event.target.checked }))
                  }
                />
                <span>Mostrar título</span>
              </label>
              <label className={styles.field} title="Si queda vacío, se usa el título original.">
                <input
                  type="text"
                  value={printSettings.documentTitleOverride}
                  placeholder="Personaliza el título del documento"
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, documentTitleOverride: event.target.value }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Tamaño del título</span>
                <input
                  type="range"
                  min={VIEWER_PRINT_TITLE_MIN_FONT_SIZE}
                  max={VIEWER_PRINT_TITLE_MAX_FONT_SIZE}
                  step={VIEWER_PRINT_TITLE_FONT_SIZE_STEP}
                  value={printSettings.documentTitleFontSize}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, documentTitleFontSize: Number(event.target.value) }))
                  }
                />
                <span className={styles.fieldHint}>{`${Math.round(printSettings.documentTitleFontSize)} px`}</span>
              </label>
              <label
                className={styles.toggleField}
                title="Números de página, con formato: Página X de Y"
              >
                <input
                  type="checkbox"
                  checked={printSettings.showPageNumbers}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, showPageNumbers: event.target.checked }))
                  }
                />
                <span>Mostrar numeración</span>
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={printSettings.showHeader}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, showHeader: event.target.checked }))
                  }
                />
                <span>Encabezado</span>
              </label>
              <label className={styles.field}>
                <input
                  type="text"
                  value={printSettings.headerText}
                  placeholder="Personaliza el texto del encabezado"
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, headerText: event.target.value }))
                  }
                />
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={printSettings.showFooter}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, showFooter: event.target.checked }))
                  }
                />
                <span>Pie de página</span>
              </label>
              <label className={styles.field}>
                <input
                  type="text"
                  value={printSettings.footerText}
                  placeholder="Personaliza el texto del pie de página"
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({ ...prev, footerText: event.target.value }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Distribución de páginas</span>
                <select
                  value={printSettings.pageLayoutMode}
                  onChange={(event) =>
                    setPrintSettingsSafe((prev) => ({
                      ...prev,
                      pageLayoutMode:
                        event.target.value === 'first-page-only'
                          ? 'first-page-only'
                          : 'same-on-all-pages',
                    }))
                  }
                >
                  <option value="first-page-only">Solo en la primera página</option>
                  <option value="same-on-all-pages">Todas las páginas iguales</option>
                </select>
              </label>
            </>
          )}
        </aside>

        <div className={styles.viewerMain}>
          <div
            ref={printableRootRef}
            className={styles.viewerPrintableRoot}
            style={{
              ...(printCssVars as React.CSSProperties),
              ...(previewCssVars as React.CSSProperties),
            }}
            data-print-root
            data-grid-pages-x={gridPaginationMetrics.pagesX}
            data-grid-pages-y={gridPaginationMetrics.pagesY}
          >
            <div
              ref={viewportRef}
              className={`${styles.viewerViewport} ${isPanning ? styles.viewerViewportPanning : ''}`}
              onMouseDown={handleViewportMouseDown}
            >
              <div className={isPrintPreview ? styles.screenOnly : undefined}>{printPreviewScreenContent}</div>
              {printDocumentContent}
            </div>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportInputChange}
        accept="application/json"
        className={styles.hiddenInput}
      />
      {printStyleText ? <style>{printStyleText}</style> : null}
    </section>
  );
}

