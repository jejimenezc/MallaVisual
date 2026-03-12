import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  applyViewerTheme,
  createDefaultViewerTheme,
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  VIEWER_ZOOM_STEP,
} from '../utils/viewer-theme.ts';
import {
  createDefaultViewerPrintSettings,
  resolveViewerContentPlacementMetrics,
  resolveViewerAxisYLineSegments,
  resolveViewerGridCutGuides,
  resolveViewerPaginationGridMetrics,
  resolveViewerPageMetrics,
  resolveViewerPrintCssVars,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPreviewCssVars,
  resolveViewerPreviewPageMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPrintableTextLayout,
  resolveViewerPanelMode,
  resolveViewerVerticalPaginationMetrics,
  VIEWER_PRINT_MAX_SCALE,
  VIEWER_PRINT_MIN_SCALE,
  VIEWER_PRINT_SCALE_STEP,
  type ViewerPanelMode,
  type ViewerPaginationTile,
  type ViewerPrintedPage,
  type ViewerPrintPaperSize,
} from '../utils/viewer-print.ts';
import { useMeasuredPxPerMm } from '../utils/use-measured-px-per-mm.ts';
import styles from './MallaViewerScreen.module.css';

const VIEWER_PRINT_CUT_REFINEMENT_POLICY = {
  refineAxisX: false,
  refineAxisY: true,
} as const;

interface Props {
  snapshot: MallaSnapshot | null;
  mode: 'preview' | 'publication' | null;
  theme: ViewerTheme;
  onThemeChange: (theme: ViewerTheme) => void;
  onBackToEditor: () => void;
  onPublish: () => Promise<void> | void;
  onImportPublicationFile: (file: File) => Promise<void> | void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatSnapshotDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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
  theme,
  onThemeChange,
  onBackToEditor,
  onPublish,
  onImportPublicationFile,
}: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const printableRootRef = useRef<HTMLDivElement>(null);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isAppearanceOpen, setAppearanceOpen] = useState(true);
  const [viewerPanelMode, setViewerPanelMode] = useState<ViewerPanelMode>('preview');
  const [printSettings, setPrintSettings] = useState(() => createDefaultViewerPrintSettings());
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
  const contentPlacementMetrics = useMemo(
    () =>
      resolveViewerContentPlacementMetrics({
        baseContentWidthPx: renderModel?.width ?? 1,
        baseContentHeightPx: renderModel?.height ?? 1,
        previewContentWidthPx: previewMetrics.contentWidthPx,
        previewContentHeightPx: previewMetrics.contentHeightPx,
        scale: pageMetrics.contentScale,
      }),
    [
      pageMetrics.contentScale,
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
        cutGuides: renderModel
          ? resolveViewerGridCutGuides({
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
      previewMetrics.contentHeightPx,
      previewMetrics.contentWidthPx,
      renderModel,
    ],
  );
  const verticalPaginationMetrics = useMemo(
    () =>
      resolveViewerVerticalPaginationMetrics({
        scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
        previewContentHeightPx: previewMetrics.contentHeightPx,
        paginationGridMetrics: gridPaginationMetrics,
      }),
    [
      contentPlacementMetrics.scaledContentHeightPx,
      gridPaginationMetrics,
      previewMetrics.contentHeightPx,
    ],
  );
  const previewGridTiles = gridPaginationMetrics.tiles;
  const printedPages = useMemo(
    () => resolveViewerPrintedPagesFromPaginationGrid(gridPaginationMetrics),
    [gridPaginationMetrics],
  );

  const printFrameStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPrintPreview) return undefined;
    return {
      ...(printCssVars as React.CSSProperties),
      ...(previewCssVars as React.CSSProperties),
      width: `${previewMetrics.paperWidthPx}px`,
      height: `${previewMetrics.paperHeightPx}px`,
      minHeight: `${previewMetrics.paperHeightPx}px`,
      maxHeight: `${previewMetrics.paperHeightPx}px`,
      margin: '0 auto',
    };
  }, [
    isPrintPreview,
    printCssVars,
    previewCssVars,
    previewMetrics.paperHeightPx,
    previewMetrics.paperWidthPx,
  ]);

  const printContentBoxStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPrintPreview) return undefined;
    return {
      width: `${previewMetrics.contentWidthPx}px`,
      height: `${previewMetrics.contentHeightPx}px`,
      minHeight: `${previewMetrics.contentHeightPx}px`,
      maxHeight: `${previewMetrics.contentHeightPx}px`,
      margin: `${previewMetrics.marginTopPx}px ${previewMetrics.marginRightPx}px ${previewMetrics.marginBottomPx}px ${previewMetrics.marginLeftPx}px`,
    };
  }, [
    isPrintPreview,
    previewMetrics.contentHeightPx,
    previewMetrics.contentWidthPx,
    previewMetrics.marginBottomPx,
    previewMetrics.marginLeftPx,
    previewMetrics.marginRightPx,
    previewMetrics.marginTopPx,
  ]);

  const previewCanvasViewportStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isPrintPreview) return undefined;
    return {
      width: `${contentPlacementMetrics.scaledContentWidthPx}px`,
      height: `${contentPlacementMetrics.scaledContentHeightPx}px`,
    };
  }, [
    contentPlacementMetrics.scaledContentHeightPx,
    contentPlacementMetrics.scaledContentWidthPx,
    isPrintPreview,
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
  const documentTextLayout = useMemo(
    () =>
      resolveViewerPrintableTextLayout({
        showHeaderFooter: renderModel?.theme.showHeaderFooter ?? false,
        headerText: renderModel?.theme.headerText ?? '',
        footerText: renderModel?.theme.footerText ?? '',
        showDocumentTitle: printSettings.showDocumentTitle,
        projectName: renderModel?.projectName ?? '',
      }),
    [
      renderModel?.projectName,
      renderModel?.theme.footerText,
      renderModel?.theme.headerText,
      renderModel?.theme.showHeaderFooter,
      printSettings.showDocumentTitle,
    ],
  );

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
    setViewerPanelMode('preview');
  }, [mode]);

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

  if (!snapshot || !renderModel) {
    return (
      <section className={styles.viewerEmpty}>
        <h2>{mode === 'publication' ? 'Version publicada' : 'Vista previa de malla'}</h2>
        <p>
          {mode === 'publication'
            ? 'No hay una version publicada cargada.'
            : 'No hay datos para vista previa.'}
        </p>
        {mode === 'publication' ? (
          <Button type="button" variant="primary" onClick={handleOpenImporter}>
            Abrir version publicada
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

  const renderPreviewGridTile = (tile: ViewerPaginationTile) => {
    const isPartialLastPage =
      tile.col === 0 &&
      tile.row === gridPaginationMetrics.pagesY - 1 &&
      verticalPaginationMetrics.hasPartialLastPage;

    return (
      <div
        key={`preview-page-${tile.row}-${tile.col}`}
        className={`${styles.viewerCanvasFrame} ${styles.viewerCanvasFramePrint}`}
        style={printFrameStyle}
        data-partial-last-page={isPartialLastPage ? 'true' : undefined}
        data-grid-row={tile.row}
        data-grid-col={tile.col}
      >
        <div className={styles.viewerPageContentBox} style={printContentBoxStyle}>
          <div className={styles.viewerPrintDocumentFlow}>
            <div
              className={styles.viewerCanvasScaledViewport}
              style={{
                ...previewCanvasViewportStyle,
                width: `${tile.sliceWidthPx}px`,
                height: `${tile.sliceHeightPx}px`,
              }}
            >
              <div
                className={styles.viewerCanvasSliceTrack}
                style={{
                  width: `${contentPlacementMetrics.scaledContentWidthPx}px`,
                  height: `${contentPlacementMetrics.scaledContentHeightPx}px`,
                  transform: `translate(-${tile.offsetX}px, -${tile.offsetY}px)`,
                }}
              >
                <div className={styles.viewerCanvasScaled} style={previewCanvasInnerStyle}>
                  {canvasContent}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrintedPage = (page: ViewerPrintedPage) => {
    const isPartialLastPage =
      page.tileCol === 0 &&
      page.isLastRow &&
      page.sliceHeightPx < gridPaginationMetrics.usablePageHeightPx;

    return (
      <div
        key={`printed-page-${page.pageNumber}`}
        className={`${styles.viewerCanvasFrame} ${styles.viewerCanvasFramePrint} ${styles.viewerPrintedPage}`}
        style={printFrameStyle}
        data-page-number={page.pageNumber}
        data-tile-row={page.tileRow}
        data-tile-col={page.tileCol}
        data-partial-last-page={isPartialLastPage ? 'true' : undefined}
      >
        <div className={styles.viewerPageContentBox} style={printContentBoxStyle}>
          <div className={styles.viewerPrintDocumentFlow}>
            <div
              className={styles.viewerCanvasScaledViewport}
              style={{
                width: `${page.viewportWidthPx}px`,
                height: `${page.viewportHeightPx}px`,
              }}
            >
              <div
                className={styles.viewerCanvasSliceTrack}
                style={{
                  width: `${contentPlacementMetrics.scaledContentWidthPx}px`,
                  height: `${contentPlacementMetrics.scaledContentHeightPx}px`,
                  transform: `translate(-${page.printOffsetX}px, -${page.printOffsetY}px)`,
                }}
              >
                <div className={styles.viewerCanvasScaled} style={previewCanvasInnerStyle}>
                  {canvasContent}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const previewDocumentIntro =
    isPrintPreview && (documentTextLayout.headerText || documentTextLayout.documentTitle) ? (
      <div
        className={styles.viewerPreviewDocumentIntro}
        style={previewCssVars as React.CSSProperties}
      >
        {documentTextLayout.headerText ? (
          <div className={styles.runtimeHeader}>{documentTextLayout.headerText}</div>
        ) : null}
        {documentTextLayout.documentTitle ? (
          <h1
            className={styles.runtimeDocumentTitle}
            style={{ fontWeight: renderModel.theme.titleWeight === 'bold' ? 700 : 400 }}
          >
            {documentTextLayout.documentTitle}
          </h1>
        ) : null}
      </div>
    ) : null;

  const previewDocumentOutro =
    isPrintPreview && documentTextLayout.footerText ? (
      <div
        className={styles.viewerPreviewDocumentIntro}
        style={previewCssVars as React.CSSProperties}
      >
        <div className={styles.runtimeFooter}>{documentTextLayout.footerText}</div>
      </div>
    ) : null;

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
      {previewDocumentIntro}
      {previewPaginatedGridSurface}
      {previewDocumentOutro}
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
      {documentTextLayout.headerText ? (
        <div className={styles.viewerPrintedTextBlock}>
          <div className={styles.runtimeHeader}>{documentTextLayout.headerText}</div>
        </div>
      ) : null}
      {documentTextLayout.documentTitle ? (
        <div className={styles.viewerPrintedTextBlock}>
          <h1
            className={styles.runtimeDocumentTitle}
            style={{ fontWeight: renderModel.theme.titleWeight === 'bold' ? 700 : 400 }}
          >
            {documentTextLayout.documentTitle}
          </h1>
        </div>
      ) : null}
      <div className={styles.viewerPrintedPageSequence}>{printedPages.map(renderPrintedPage)}</div>
      {documentTextLayout.footerText ? (
        <div className={styles.viewerPrintedTextBlock}>
          <div className={styles.runtimeFooter}>{documentTextLayout.footerText}</div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <section className={styles.viewerScreen}>
      <Header
        className={`${styles.viewerHeader} ${styles.noPrint}`}
        left={
          <div className={styles.viewerTitleWrap}>
            <h2
              className={styles.viewerTitle}
              style={{ fontWeight: renderModel.theme.titleWeight === 'bold' ? 700 : 400 }}
            >
              {renderModel.projectName}
            </h2>
            <span className={styles.snapshotMeta}>
              {mode === 'publication' ? 'Viendo publicacion' : 'Vista previa'} -{' '}
              {formatSnapshotDate(snapshot.createdAt)}
              {isPrintPreview ? ' - Modo impresion' : ''}
            </span>
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
                  aria-label="Nivel de zoom de la publicacion"
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
                  title="Seleccion deshabilitada en vista previa/publicacion"
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
            <Button type="button" onClick={onBackToEditor}>
              Volver al editor
            </Button>
            {isPrintPreview ? (
              <>
                <Button type="button" onClick={handleExitPrintPreview}>
                  Volver a vista previa
                </Button>
                <Button type="button" variant="primary" onClick={handlePrintNow}>
                  Imprimir ahora
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleEnterPrintPreview}>
                Vista de impresion
              </Button>
            )}
            {!isPrintPreview && mode === 'preview' ? (
              <Button type="button" onClick={() => void onPublish()}>
                Publicar esta version
              </Button>
            ) : null}
            {!isPrintPreview && mode !== 'preview' ? (
              <Button type="button" onClick={handleOpenImporter}>
                Abrir publicacion
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
              <h3>Apariencia v1</h3>
              <label className={styles.field}>
                <span>Gap columnas</span>
                <input
                  type="range"
                  min={0}
                  max={96}
                  value={theme.gapX}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapX: Number(event.target.value) }))}
                />
              </label>
              <label className={styles.field}>
                <span>Gap filas</span>
                <input
                  type="range"
                  min={0}
                  max={96}
                  value={theme.gapY}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, gapY: Number(event.target.value) }))}
                />
              </label>
              <label className={styles.field}>
                <span>Ancho minimo columna</span>
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
                <span>Alto minimo fila</span>
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
                <span>Padding celdas</span>
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
                <span>Borde bloques</span>
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
                <span>Radio borde</span>
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
                <span>Escala tipografica</span>
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
              <label className={styles.field}>
                <span>Peso titulo</span>
                <select
                  value={theme.titleWeight}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({
                      ...prev,
                      titleWeight: event.target.value === 'normal' ? 'normal' : 'bold',
                    }))
                  }
                >
                  <option value="bold">Bold</option>
                  <option value="normal">Normal</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Header text</span>
                <input
                  type="text"
                  value={theme.headerText}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, headerText: event.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Footer text</span>
                <input
                  type="text"
                  value={theme.footerText}
                  onChange={(event) => setThemeSafe((prev) => ({ ...prev, footerText: event.target.value }))}
                />
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={theme.showHeaderFooter}
                  onChange={(event) =>
                    setThemeSafe((prev) => ({ ...prev, showHeaderFooter: event.target.checked }))
                  }
                />
                <span>Mostrar header/footer</span>
              </label>
              <Button type="button" onClick={() => onThemeChange(createDefaultViewerTheme())}>
                Restablecer
              </Button>
            </>
          ) : (
            <>
              <h3>Configuracion de impresion</h3>
              <label className={styles.field}>
                <span>Tamano de papel</span>
                <select
                  value={printSettings.paperSize}
                  onChange={(event) =>
                    setPrintSettings((prev) => ({
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
                <span>Orientacion</span>
                <select
                  value={printSettings.orientation}
                  onChange={(event) =>
                    setPrintSettings((prev) => ({
                      ...prev,
                      orientation: event.target.value === 'landscape' ? 'landscape' : 'portrait',
                    }))
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Escala</span>
                <input
                  type="range"
                  min={VIEWER_PRINT_MIN_SCALE}
                  max={VIEWER_PRINT_MAX_SCALE}
                  step={VIEWER_PRINT_SCALE_STEP}
                  value={printSettings.scale}
                  onChange={(event) =>
                    setPrintSettings((prev) => ({ ...prev, scale: Number(event.target.value) }))
                  }
                />
                <span className={styles.fieldHint}>{printScalePct}</span>
              </label>
              <label className={styles.field}>
                <span>Margenes</span>
                <select
                  value={printSettings.margins}
                  onChange={(event) =>
                    setPrintSettings((prev) => ({
                      ...prev,
                      margins:
                        event.target.value === 'narrow' || event.target.value === 'wide'
                          ? event.target.value
                          : 'normal',
                    }))
                  }
                >
                  <option value="narrow">Narrow</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={printSettings.showDocumentTitle}
                  onChange={(event) =>
                    setPrintSettings((prev) => ({ ...prev, showDocumentTitle: event.target.checked }))
                  }
                />
                <span>Mostrar titulo del documento</span>
              </label>
              <div className={styles.printActions}>
                <Button type="button" onClick={handleExitPrintPreview}>
                  Volver a vista previa
                </Button>
                <Button type="button" variant="primary" onClick={handlePrintNow}>
                  Imprimir ahora
                </Button>
              </div>
            </>
          )}
        </aside>

        <div className={styles.viewerMain}>
          <div
            ref={printableRootRef}
            className={styles.viewerPrintableRoot}
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

