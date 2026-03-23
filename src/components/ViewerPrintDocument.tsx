import React from 'react';
import type { CSSProperties, JSX } from 'react';
import type { ViewerRenderBandCell, ViewerRenderBandRow, ViewerRenderCell, ViewerRenderItem, ViewerRenderModel } from '../utils/viewer-theme.ts';
import {
  resolveViewerPageSliceLayout,
  resolveViewerPrintedPageEditorialLayout,
  type ViewerPrintedPage,
  type ViewerResolvedPageMetrics,
  type ViewerPrintSettings,
  type ViewerPaginatedSurfaceLayout,
} from '../utils/viewer-print.ts';

export interface ViewerPrintDocumentClassNames {
  sequence: string;
  page: string;
  contentBox: string;
  flow: string;
  headerBlock: string;
  header: string;
  titleBlock: string;
  title: string;
  viewport: string;
  canvas: string;
  footerBlock: string;
  footer: string;
  pageNumber: string;
  bandRow: string;
  bandRowHeader: string;
  bandRowMetric: string;
  bandCell: string;
  bandCellMetric: string;
  bandCellMetricLabel: string;
  bandCellMetricValue: string;
  piece: string;
  pieceGrid: string;
  cell: string;
}

export const VIEWER_PRINT_DOCUMENT_EXPORT_CLASS_NAMES: ViewerPrintDocumentClassNames = {
  sequence: 'viewerPrintedPageSequence',
  page: 'viewerCanvasFrame viewerPaginatedPageFrame viewerPaginatedPageFramePrint viewerPrintedPage',
  contentBox: 'viewerPageContentBox viewerPaginatedPageContentBox viewerPaginatedPageContentBoxPrint',
  flow: 'viewerPrintDocumentFlow viewerPaginatedPageFlow viewerPaginatedPageFlowPrint',
  headerBlock: 'viewerPageHeaderBlock',
  header: 'runtimeHeader',
  titleBlock: 'viewerPageTitleBlock',
  title: 'runtimeDocumentTitle',
  viewport: 'viewerCanvasScaledViewport',
  canvas: 'viewerCanvasScaled',
  footerBlock: 'viewerPageFooterBlock',
  footer: 'runtimeFooter',
  pageNumber: 'viewerPageNumber',
  bandRow: 'viewerBandRow',
  bandRowHeader: 'viewerBandRowHeader',
  bandRowMetric: 'viewerBandRowMetric',
  bandCell: 'viewerBandCell',
  bandCellMetric: 'viewerBandCellMetric',
  bandCellMetricLabel: 'viewerBandCellMetricLabel',
  bandCellMetricValue: 'viewerBandCellMetricValue',
  piece: 'viewerPiece',
  pieceGrid: 'viewerPieceGrid',
  cell: 'viewerCell',
};

const joinClasses = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ');

const borderStyleFromSnapshot = (value: 'none' | 'thin' | 'strong') => {
  if (value === 'none') return 'none';
  if (value === 'strong') return '2px solid rgba(15, 23, 42, 0.65)';
  return '1px solid rgba(15, 23, 42, 0.38)';
};

const cellTextFromType = (text: string, type: string, checked?: boolean): string => {
  if (type === 'checkbox') {
    return checked ? '\u2611 ' + text : '\u2610 ' + text;
  }
  return text;
};

const resolveBandCellTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  if (align === 'justify') return 'left';
  return align;
};

const renderBandCellMetric = (
  classNames: ViewerPrintDocumentClassNames,
  cell: ViewerRenderBandCell,
): JSX.Element => (
  <div className={classNames.bandCellMetric}>
    <span className={classNames.bandCellMetricLabel}>{cell.label}</span>
    <span className={classNames.bandCellMetricValue}>{cell.text}</span>
  </div>
);

const renderBandRow = (
  classNames: ViewerPrintDocumentClassNames,
  row: ViewerRenderBandRow,
  indexPrefix: string,
  width: number,
  scale: number,
): JSX.Element => (
  <div
    key={`${indexPrefix}-band-row-${row.kind}-${row.id}`}
    className={joinClasses(
      classNames.bandRow,
      row.kind === 'header' ? classNames.bandRowHeader : classNames.bandRowMetric,
    )}
    style={{
      top: `${row.top}px`,
      height: `${row.height}px`,
      width: `${Math.max(width, 1)}px`,
    }}
  >
    {row.cells.map((cell, index) => (
      <div
        key={`${indexPrefix}-band-cell-${row.kind}-${row.id}-${cell.col}-${index}`}
        className={classNames.bandCell}
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
        {cell.label ? renderBandCellMetric(classNames, cell) : <span>{cell.text}</span>}
      </div>
    ))}
  </div>
);

const renderViewerItem = (
  classNames: ViewerPrintDocumentClassNames,
  item: ViewerRenderItem,
  indexPrefix: string,
  borderWidthPx: number,
  borderRadiusPx: number,
  scale: number,
): JSX.Element => (
  <article
    key={`${indexPrefix}-item-${item.id}`}
    className={classNames.piece}
    style={{
      left: `${item.left}px`,
      top: `${item.top}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
      borderWidth: `${borderWidthPx}px`,
      borderRadius: `${borderRadiusPx}px`,
    }}
  >
    <div className={classNames.pieceGrid} style={item.gridStyle}>
      {item.cells.map((cell) => (
        <div
          key={`${indexPrefix}-${item.id}-${cell.row}-${cell.col}`}
          className={classNames.cell}
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
);

const resolveScaledSliceContent = (
  renderModel: ViewerRenderModel,
  sliceLayout: ReturnType<typeof resolveViewerPageSliceLayout>,
  scale: number,
) => {
  const safeScale = Math.max(scale, 0.0001);
  const sliceLeftPx = sliceLayout.offsetX;
  const sliceTopPx = sliceLayout.offsetY;
  const sliceRightPx = sliceLayout.offsetX + sliceLayout.viewportWidthPx;
  const sliceBottomPx = sliceLayout.offsetY + sliceLayout.viewportHeightPx;

  const visibleBandRows = renderModel.bandsRenderRows
    .filter((row) => {
      const rowTopPx = row.top * safeScale;
      const rowHeightPx = row.height * safeScale;
      return rowTopPx + rowHeightPx > sliceTopPx && rowTopPx < sliceBottomPx;
    })
    .map((row) => ({
      ...row,
      top: row.top * safeScale - sliceTopPx,
      height: row.height * safeScale,
      cells: row.cells
        .filter((cell) => {
          const cellLeftPx = cell.left * safeScale;
          const cellWidthPx = cell.width * safeScale;
          return cellLeftPx + cellWidthPx > sliceLeftPx && cellLeftPx < sliceRightPx;
        })
        .map((cell) => ({
          ...cell,
          left: cell.left * safeScale - sliceLeftPx,
          width: cell.width * safeScale,
        })),
    }));

  const visibleItems = renderModel.items
    .filter(
      (item) =>
        item.left * safeScale + item.width * safeScale > sliceLeftPx &&
        item.left * safeScale < sliceRightPx &&
        item.top * safeScale + item.height * safeScale > sliceTopPx &&
        item.top * safeScale < sliceBottomPx,
    )
    .map((item) => ({
      ...item,
      left: item.left * safeScale - sliceLeftPx,
      top: item.top * safeScale - sliceTopPx,
      width: item.width * safeScale,
      height: item.height * safeScale,
      cellWidth: item.cellWidth * safeScale,
      cellHeight: item.cellHeight * safeScale,
      gridStyle: {
        width: item.cols * item.cellWidth * safeScale + Math.max(0, item.cols - 1) * 2 * safeScale,
        height: item.rows * item.cellHeight * safeScale + Math.max(0, item.rows - 1) * 2 * safeScale,
        gridTemplateColumns: `repeat(${item.cols}, ${item.cellWidth * safeScale}px)`,
        gridTemplateRows: `repeat(${item.rows}, ${item.cellHeight * safeScale}px)`,
        gap: `${2 * safeScale}px`,
        padding: `${4 * safeScale}px`,
      },
    }));

  return {
    visibleBandRows,
    visibleItems,
  };
};

const renderSliceCanvas = (
  classNames: ViewerPrintDocumentClassNames,
  renderModel: ViewerRenderModel,
  sliceLayout: ReturnType<typeof resolveViewerPageSliceLayout>,
  scale: number,
  indexPrefix: string,
): JSX.Element => {
  const { visibleBandRows, visibleItems } = resolveScaledSliceContent(renderModel, sliceLayout, scale);

  return (
    <div
      className={classNames.canvas}
      style={{
        width: `${sliceLayout.viewportWidthPx}px`,
        height: `${sliceLayout.viewportHeightPx}px`,
        transform: 'none',
      }}
    >
      {visibleBandRows.map((row) =>
        renderBandRow(classNames, row, `${indexPrefix}-print`, sliceLayout.viewportWidthPx, Math.max(scale, 0.0001)),
      )}
      {visibleItems.map((item) =>
        renderViewerItem(
          classNames,
          item as ViewerRenderItem,
          `${indexPrefix}-print`,
          renderModel.theme.blockBorderWidth * Math.max(scale, 0.0001),
          renderModel.theme.blockBorderRadius * Math.max(scale, 0.0001),
          Math.max(scale, 0.0001),
        ),
      )}
    </div>
  );
};

interface ViewerPrintDocumentProps {
  renderModel: ViewerRenderModel;
  printedPages: ViewerPrintedPage[];
  paginatedSurfaceLayout: ViewerPaginatedSurfaceLayout;
  contentScale: number;
  printSettings: ViewerPrintSettings;
  pageMetrics: ViewerResolvedPageMetrics;
  pxPerMmY: number;
  classNames: ViewerPrintDocumentClassNames;
  pageStyle?: CSSProperties;
  contentBoxStyle?: CSSProperties;
}

export function ViewerPrintDocument({
  renderModel,
  printedPages,
  paginatedSurfaceLayout,
  contentScale,
  printSettings,
  pageMetrics,
  pxPerMmY,
  classNames,
  pageStyle,
  contentBoxStyle,
}: ViewerPrintDocumentProps): JSX.Element {
  const pageModels = React.useMemo(
    () =>
      printedPages.map((page) => ({
        page,
        editorialLayout: resolveViewerPrintedPageEditorialLayout({
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
          pxPerMmY,
        }),
        sliceLayout: resolveViewerPageSliceLayout({
          viewportWidthPx: page.viewportWidthPx,
          viewportHeightPx: page.viewportHeightPx,
          surfaceWidthPx: paginatedSurfaceLayout.scaledSurfaceWidthPx,
          surfaceHeightPx: paginatedSurfaceLayout.scaledSurfaceHeightPx,
          offsetX: page.printOffsetX,
          offsetY: page.printOffsetY,
        }),
        isPartialLastPage:
          page.tileCol === 0 && page.isLastRow && page.sliceHeightPx < page.usablePageHeightPx,
      })),
    [
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
      printedPages,
      pxPerMmY,
      renderModel.projectName,
    ],
  );

  return (
    <div className={classNames.sequence}>
      {pageModels.map(({ page, editorialLayout, sliceLayout, isPartialLastPage }) => {
        return (
          <div
            key={`printed-page-${page.pageNumber}`}
            className={classNames.page}
            style={pageStyle}
            data-page-number={`${page.pageNumber}`}
            data-tile-row={`${page.tileRow}`}
            data-tile-col={`${page.tileCol}`}
            data-partial-last-page={isPartialLastPage ? 'true' : undefined}
          >
            <div className={classNames.contentBox} style={contentBoxStyle}>
              <div className={classNames.flow}>
                {editorialLayout.headerText ? (
                  <div className={classNames.headerBlock}>
                    <div className={classNames.header}>{editorialLayout.headerText}</div>
                  </div>
                ) : null}
                {editorialLayout.documentTitle ? (
                  <div className={classNames.titleBlock}>
                    <h1
                      className={classNames.title}
                      style={{ fontSize: `${printSettings.documentTitleFontSize}px` }}
                    >
                      {editorialLayout.documentTitle}
                    </h1>
                  </div>
                ) : null}
                <div
                  className={classNames.viewport}
                  style={{
                    width: `${sliceLayout.viewportWidthPx}px`,
                    height: `${sliceLayout.viewportHeightPx}px`,
                  }}
                >
                  {renderSliceCanvas(
                    classNames,
                    renderModel,
                    sliceLayout,
                    contentScale,
                    `page-${page.pageNumber}`,
                  )}
                </div>
                {editorialLayout.footerText || editorialLayout.pageNumberText ? (
                  <div className={classNames.footerBlock}>
                    {editorialLayout.footerText ? <div className={classNames.footer}>{editorialLayout.footerText}</div> : <div />}
                    {editorialLayout.pageNumberText ? (
                      <div className={classNames.pageNumber}>{editorialLayout.pageNumberText}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const createViewerPrintDocumentExportStyles = (): string => `
  :root {
    color-scheme: light;
    font-family: Inter, "Segoe UI", sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #eef3f8;
    color: #0f172a;
  }

  body {
    min-height: 100vh;
  }

  .viewerPrintExportRoot {
    min-height: 100vh;
    padding: 24px;
    background:
      radial-gradient(circle at top, rgba(249, 207, 74, 0.14), transparent 28%),
      linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .viewerPrintedPageSequence {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .viewerPrintedPage {
    position: relative;
    background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 0.98) 100%);
    box-shadow:
      0 14px 34px rgba(15, 23, 42, 0.11),
      0 2px 6px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }

  .viewerCanvasFrame {
    width: max-content;
  }

  .viewerPaginatedPageFrame {
    position: relative;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    box-sizing: border-box;
    isolation: isolate;
  }

  .viewerPaginatedPageFramePrint {
  }

  .viewerPageContentBox {
    box-sizing: border-box;
    width: max-content;
  }

  .viewerPaginatedPageContentBoxPrint {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
  }

  .viewerPrintDocumentFlow {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 100%;
  }

  .viewerPaginatedPageFlowPrint {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: 100%;
    max-height: 100%;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .viewerCanvasScaledViewport {
    position: relative;
    width: max-content;
    height: max-content;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    max-width: 100%;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.5);
  }

  .viewerPageHeaderBlock,
  .viewerPageTitleBlock {
    width: 100%;
  }

  .viewerPageFooterBlock {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 0.5rem;
    width: 100%;
    margin-top: auto;
  }

  .runtimeHeader,
  .runtimeFooter {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    color: #0f172a;
    font-size: 0.875rem;
  }

  .runtimeDocumentTitle {
    box-sizing: border-box;
    margin: 0;
    width: 100%;
    max-width: 100%;
    color: #0f172a;
    font-size: 1.125rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .viewerPageNumber {
    color: #334155;
    font-size: 0.85rem;
    line-height: 1.2;
    text-align: right;
    white-space: nowrap;
  }

  .viewerCanvasScaled {
    position: relative;
    transform-origin: top left;
  }

  .viewerBandRow {
    position: absolute;
    left: 0;
  }

  .viewerBandRowHeader,
  .viewerBandRowMetric {
    z-index: 2;
  }

  .viewerBandCell {
    position: absolute;
    top: 0;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-wrap: anywhere;
    white-space: normal;
    user-select: text;
  }

  .viewerBandCellMetric {
    display: grid;
    width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 6px;
    line-height: 1.15;
  }

  .viewerBandCellMetricLabel {
    text-align: left;
    font-size: 0.72em;
    opacity: 0.86;
    overflow-wrap: anywhere;
  }

  .viewerBandCellMetricValue {
    text-align: right;
    white-space: nowrap;
  }

  .viewerPiece {
    position: absolute;
    border-style: solid;
    border-color: rgba(15, 23, 42, 0.18);
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }

  .viewerPieceGrid {
    display: grid;
  }

  .viewerCell {
    box-sizing: border-box;
    overflow-wrap: anywhere;
    display: flex;
    align-items: center;
    white-space: pre-wrap;
    user-select: text;
  }

  .viewerCell > span {
    width: 100%;
  }

  @media print {
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    body {
      min-height: auto;
    }

    .viewerPrintExportRoot {
      min-height: auto;
      padding: 0;
      background: #fff;
    }

    .viewerPrintedPageSequence {
      display: block;
    }

    .viewerPrintedPage {
      margin: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .viewerPrintedPage + .viewerPrintedPage {
      break-before: page;
      page-break-before: always;
    }

    .viewerPaginatedPageFramePrint {
      display: block !important;
      margin: 0 !important;
      width: auto !important;
      min-height: 0 !important;
      transform: none !important;
      transform-origin: top left !important;
      overflow: visible !important;
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .viewerPaginatedPageContentBoxPrint {
      box-sizing: border-box;
      margin: 0 !important;
      width: calc(var(--print-content-width-mm, 0) * 1mm) !important;
      min-height: calc(var(--print-content-height-mm, 0) * 1mm) !important;
      background: transparent !important;
      overflow: hidden;
      box-shadow: none !important;
    }

    .viewerPaginatedPageFramePrint .viewerPaginatedPageContentBoxPrint {
      display: block !important;
      height: auto !important;
      max-height: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .viewerPaginatedPageFlowPrint {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.35rem;
      width: 100% !important;
      max-width: 100% !important;
      min-height: calc(var(--print-content-height-mm, 0) * 1mm) !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .viewerCanvasScaledViewport {
      overflow: hidden;
      max-width: 100%;
      max-height: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .runtimeHeader,
    .runtimeFooter {
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 0;
      margin-bottom: 0.35rem;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .viewerPaginatedPageFramePrint .runtimeHeader,
    .viewerPaginatedPageFramePrint .runtimeFooter,
    .viewerPaginatedPageFramePrint .runtimeDocumentTitle {
      width: 100% !important;
      max-width: 100% !important;
    }

    .runtimeFooter {
      margin-top: 0.35rem;
      margin-bottom: 0;
    }

    .runtimeDocumentTitle,
    .viewerPageFooterBlock,
    .viewerBandRow,
    .viewerPiece {
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
  }
`;
