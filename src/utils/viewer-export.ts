import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  createDefaultPublicationOutputConfig,
  normalizePublicationOutputConfig,
  type PublicationExportFlags,
  type PublicationOutputConfig,
} from './publication-output.ts';
import {
  applyViewerTheme,
  type ViewerRenderBandCell,
  type ViewerRenderBandRow,
  type ViewerRenderCell,
  type ViewerRenderItem,
  type ViewerRenderModel,
} from './viewer-theme.ts';
import {
  createDefaultViewerMeasuredPxPerMm,
  resolveViewerAxisXColumnSegments,
  resolveViewerAxisYLineSegments,
  resolveViewerContentPlacementMetrics,
  resolveViewerEffectivePrintScale,
  resolveViewerGridCutGuides,
  resolveViewerPageEditorialHeights,
  resolveViewerPageMetrics,
  resolveViewerPageSliceLayout,
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPrintPageCss,
  resolveViewerPrintedPageEditorialLayout,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPreviewPageMetrics,
  type ViewerPageSliceLayout,
} from './viewer-print.ts';

export interface PublicationExportInput {
  snapshot: MallaSnapshot;
  config?: Partial<PublicationOutputConfig>;
  variant: 'presentation' | 'print';
}

interface ViewerExportPayload {
  format: 'malla-viewer-export';
  version: 1;
  exportedAt: string;
  snapshot: MallaSnapshot;
  theme: ViewerTheme;
  flags: PublicationExportFlags;
  kind: 'standalone-html' | 'print-document';
  printSettings?: PublicationOutputConfig['printSettings'];
  variant: PublicationExportInput['variant'];
}

const VIEWER_PRINT_CUT_REFINEMENT_POLICY = {
  refineAxisX: true,
  refineAxisY: true,
} as const;

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const serializeJsonScript = (value: unknown): string =>
  JSON.stringify(value).replaceAll('<', '\\u003c');

const styleToString = (styles: Record<string, string | number | undefined>): string =>
  Object.entries(styles)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(';');

const borderStyleFromSnapshot = (value: 'none' | 'thin' | 'strong') => {
  if (value === 'none') return 'none';
  if (value === 'strong') return '2px solid rgba(15, 23, 42, 0.65)';
  return '1px solid rgba(15, 23, 42, 0.38)';
};

const resolveBandCellTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
  if (align === 'justify') return 'left';
  return align;
};

const cellTextFromType = (text: string, type: string, checked?: boolean): string => {
  if (type === 'checkbox') {
    return checked ? '\u2611 ' + text : '\u2610 ' + text;
  }
  return text;
};

const sanitizeFileNamePart = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 'malla';
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'malla';
};

export const buildViewerExportBaseName = (snapshot: MallaSnapshot): string => {
  const project = sanitizeFileNamePart(snapshot.projectName || 'malla');
  return `${project}-publicacion`;
};

const triggerFileDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const renderBandCellHtml = (cell: ViewerRenderBandCell, rowHeight: number, scale: number): string => {
  const body = cell.label
    ? `<div class="mve-band-metric"><span class="mve-band-metric-label">${escapeHtml(cell.label)}</span><span class="mve-band-metric-value">${escapeHtml(cell.text)}</span></div>`
    : `<span>${escapeHtml(cell.text)}</span>`;
  return `<div class="mve-band-cell" style="${styleToString({
    left: `${cell.left}px`,
    width: `${cell.width}px`,
    height: `${rowHeight}px`,
    background: cell.style.backgroundColor,
    color: cell.style.textColor,
    border: borderStyleFromSnapshot(cell.style.border),
    'text-align': resolveBandCellTextAlign(cell.style.textAlign),
    'font-size': `${cell.style.fontSizePx * scale}px`,
    padding: `${cell.style.paddingY * scale}px ${cell.style.paddingX * scale}px`,
    'font-weight': cell.bold || cell.style.bold ? 700 : 400,
    'font-style': cell.style.italic ? 'italic' : 'normal',
  })}">${body}</div>`;
};

const renderBandRowHtml = (row: ViewerRenderBandRow, width: number, scale: number): string =>
  `<div class="mve-band-row mve-band-row-${row.kind}" style="${styleToString({
    top: `${row.top}px`,
    height: `${row.height}px`,
    width: `${Math.max(width, 1)}px`,
  })}">${row.cells.map((cell) => renderBandCellHtml(cell, row.height, scale)).join('')}</div>`;

const renderViewerCellHtml = (itemId: string, cell: ViewerRenderCell, scale: number): string =>
  `<div class="mve-cell" title="${escapeHtml(cell.text)}" style="${styleToString({
    'grid-row': `${cell.row + 1} / ${cell.row + cell.rowSpan + 1}`,
    'grid-column': `${cell.col + 1} / ${cell.col + cell.colSpan + 1}`,
    background: cell.style.backgroundColor,
    color: cell.style.textColor,
    border: borderStyleFromSnapshot(cell.style.border),
    'text-align': cell.style.textAlign,
    'font-size': `${cell.style.fontSizePx * scale}px`,
    padding: `${cell.style.paddingY * scale}px ${cell.style.paddingX * scale}px`,
    'font-weight': cell.style.bold ? 700 : 400,
    'font-style': cell.style.italic ? 'italic' : 'normal',
  })}" data-cell-id="${escapeHtml(`${itemId}-${cell.row}-${cell.col}`)}"><span>${escapeHtml(
    cellTextFromType(cell.text, cell.type, cell.checked),
  )}</span></div>`;

const renderViewerItemHtml = (
  item: ViewerRenderItem,
  theme: ViewerTheme,
  scale: number,
): string => {
  const gridWidth = item.cols * item.cellWidth * scale + Math.max(0, item.cols - 1) * 2 * scale;
  const gridHeight = item.rows * item.cellHeight * scale + Math.max(0, item.rows - 1) * 2 * scale;

  return `<article class="mve-piece" style="${styleToString({
    left: `${item.left}px`,
    top: `${item.top}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    'border-width': `${theme.blockBorderWidth * scale}px`,
    'border-radius': `${theme.blockBorderRadius * scale}px`,
  })}"><div class="mve-piece-grid" style="${styleToString({
    width: `${gridWidth}px`,
    height: `${gridHeight}px`,
    display: 'grid',
    'grid-template-columns': `repeat(${item.cols}, ${item.cellWidth * scale}px)`,
    'grid-template-rows': `repeat(${item.rows}, ${item.cellHeight * scale}px)`,
    gap: `${2 * scale}px`,
    padding: `${4 * scale}px`,
  })}">${item.cells.map((cell) => renderViewerCellHtml(item.id, cell, scale)).join('')}</div></article>`;
};

const renderFullCanvasHtml = (renderModel: ViewerRenderModel): string =>
  `${renderModel.bandsRenderRows
    .map((row) => renderBandRowHtml(row, renderModel.width, 1))
    .join('')}${renderModel.items
    .map((item) => renderViewerItemHtml(item, renderModel.theme, 1))
    .join('')}`;

const renderSliceCanvasHtml = (
  renderModel: ViewerRenderModel,
  sliceLayout: ViewerPageSliceLayout,
  scale: number,
): string => {
  const sliceLeftPx = sliceLayout.offsetX;
  const sliceTopPx = sliceLayout.offsetY;
  const sliceRightPx = sliceLayout.offsetX + sliceLayout.viewportWidthPx;
  const sliceBottomPx = sliceLayout.offsetY + sliceLayout.viewportHeightPx;
  const localWidthPx = sliceLayout.viewportWidthPx;

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
    }));

  return `<div class="mve-print-canvas" style="${styleToString({
    width: `${Math.max(localWidthPx, 1)}px`,
    height: `${Math.max(sliceLayout.viewportHeightPx, 1)}px`,
  })}">${visibleBandRows
    .map((row) => renderBandRowHtml(row, localWidthPx, scale))
    .join('')}${visibleItems.map((item) => renderViewerItemHtml(item, renderModel.theme, scale)).join('')}</div>`;
};

const createViewerDocumentStyles = (): string => `
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

  .mve-export-root {
    width: 100%;
  }

  .mve-standalone-shell {
    min-height: 100vh;
    padding: 24px;
    background:
      radial-gradient(circle at top, rgba(54, 182, 182, 0.15), transparent 28%),
      linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .mve-standalone-header,
  .mve-standalone-footer {
    width: min(100%, max-content);
    margin: 0 auto 16px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(148, 163, 184, 0.28);
    backdrop-filter: blur(8px);
    white-space: pre-wrap;
  }

  .mve-standalone-footer {
    margin: 16px auto 0;
  }

  .mve-standalone-surface {
    width: max-content;
    margin: 0 auto;
    padding: 24px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.84);
    border: 1px solid rgba(148, 163, 184, 0.3);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14);
  }

  .mve-canvas,
  .mve-print-canvas {
    position: relative;
    overflow: hidden;
    background: transparent;
  }

  .mve-band-row {
    position: absolute;
    left: 0;
  }

  .mve-band-row-header .mve-band-cell {
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
  }

  .mve-band-row-metric .mve-band-cell {
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
  }

  .mve-band-cell {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    white-space: pre-wrap;
  }

  .mve-band-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    text-align: inherit;
    width: 100%;
  }

  .mve-band-metric-label {
    font-size: 0.78em;
    opacity: 0.72;
  }

  .mve-piece {
    position: absolute;
    border-style: solid;
    border-color: rgba(15, 23, 42, 0.16);
    background: rgba(255, 255, 255, 0.96);
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  }

  .mve-piece-grid {
    width: 100%;
    height: 100%;
  }

  .mve-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .mve-cell > span {
    width: 100%;
  }

  .mve-print-document {
    background: #cbd5e1;
    padding: 12mm 0;
  }

  .mve-print-sequence {
    display: flex;
    flex-direction: column;
    gap: 10mm;
    align-items: center;
  }

  .mve-print-page {
    position: relative;
    background: #fff;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
  }

  .mve-print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .mve-print-page-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .mve-print-header,
  .mve-print-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8mm;
    white-space: pre-wrap;
  }

  .mve-print-title {
    margin: 0;
    line-height: 1.1;
  }

  .mve-print-viewport {
    position: relative;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .mve-print-page-number {
    flex: 0 0 auto;
    text-align: right;
  }

  @media print {
    html, body {
      background: #fff;
    }

    .mve-standalone-shell {
      padding: 0;
      background: #fff;
    }

    .mve-standalone-surface {
      box-shadow: none;
      border: none;
      background: transparent;
    }

    .mve-print-document {
      padding: 0;
      background: #fff;
    }

    .mve-print-sequence {
      gap: 0;
    }

    .mve-print-page {
      box-shadow: none;
      margin: 0;
    }
  }
`;

const createStandaloneEditorialHtml = (renderModel: ViewerRenderModel, flags: PublicationExportFlags) => {
  if (!flags.includeEditorial || !renderModel.theme.showHeaderFooter) {
    return { header: '', footer: '' };
  }

  const headerText = renderModel.theme.headerText.trim();
  const footerText = renderModel.theme.footerText.trim();

  return {
    header: headerText
      ? `<header class="mve-standalone-header">${escapeHtml(headerText)}</header>`
      : '',
    footer: footerText
      ? `<footer class="mve-standalone-footer">${escapeHtml(footerText)}</footer>`
      : '',
  };
};

const resolvePublicationExportConfig = (
  value?: Partial<PublicationOutputConfig>,
): PublicationOutputConfig => {
  const defaults = createDefaultPublicationOutputConfig();
  return normalizePublicationOutputConfig({
    theme: value?.theme ?? defaults.theme,
    printSettings: value?.printSettings ?? defaults.printSettings,
    flags: value?.flags ?? defaults.flags,
  });
};

export const resolvePublicationOutputModel = (input: PublicationExportInput) => {
  const config = resolvePublicationExportConfig(input.config);
  const renderModel = applyViewerTheme(input.snapshot, config.theme);
  const printSettings = config.printSettings;
  const flags = config.flags;
  const measuredPxPerMm = createDefaultViewerMeasuredPxPerMm();
  const pageMetrics = resolveViewerPageMetrics(printSettings);
  const previewMetrics = resolveViewerPreviewPageMetrics(pageMetrics, measuredPxPerMm);
  const editorialConfig = flags.includeEditorial
    ? printSettings
    : {
        ...printSettings,
        showDocumentTitle: false,
        showHeader: false,
        showFooter: false,
        showPageNumbers: false,
      };
  const editorialHeights = resolveViewerPageEditorialHeights({
    showDocumentTitle: editorialConfig.showDocumentTitle,
    documentTitleOverride: editorialConfig.documentTitleOverride,
    pageLayoutMode: editorialConfig.pageLayoutMode,
    showHeader: editorialConfig.showHeader,
    headerText: editorialConfig.headerText,
    showFooter: editorialConfig.showFooter,
    footerText: editorialConfig.footerText,
    showPageNumbers: editorialConfig.showPageNumbers,
    projectName: renderModel.projectName,
    contentHeightMm: pageMetrics.contentHeightMm,
    pxPerMmY: measuredPxPerMm.pxPerMmY,
  });
  const effectivePrintScale = resolveViewerEffectivePrintScale({
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
    scale: effectivePrintScale,
  });
  const gridPaginationMetrics = resolveViewerPaginationGridMetrics({
    scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
    usablePageWidthPx: previewMetrics.contentWidthPx,
    usablePageHeightPx: previewMetrics.contentHeightPx,
    firstPageUsableHeightPx: editorialHeights.firstPageUsableHeightPx,
    continuationPageUsableHeightPx: editorialHeights.continuationPageUsableHeightPx,
    cutGuides: resolveViewerGridCutGuides({
      renderModel,
      scale: contentPlacementMetrics.scale,
    }),
    axisXColumnSegments: resolveViewerAxisXColumnSegments({
      renderModel,
      scale: contentPlacementMetrics.scale,
    }),
    axisYLineSegments: resolveViewerAxisYLineSegments({
      renderModel,
      scale: contentPlacementMetrics.scale,
    }),
    refinementPolicy: VIEWER_PRINT_CUT_REFINEMENT_POLICY,
  });
  const printedPages = resolveViewerPrintedPagesFromPaginationGrid({
    tiles: gridPaginationMetrics.tiles,
    scaledContentWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledContentHeightPx: contentPlacementMetrics.scaledContentHeightPx,
    usablePageWidthPx: previewMetrics.contentWidthPx,
    usablePageHeightPx: previewMetrics.contentHeightPx,
  });
  const paginatedSurfaceLayout = resolveViewerPaginatedSurfaceLayout({
    previewMetrics,
    scaledSurfaceWidthPx: contentPlacementMetrics.scaledContentWidthPx,
    scaledSurfaceHeightPx: contentPlacementMetrics.scaledContentHeightPx,
  });

  return {
    config,
    normalizedTheme: config.theme,
    normalizedPrintSettings: printSettings,
    normalizedFlags: flags,
    renderModel,
    pageMetrics,
    measuredPxPerMm,
    printedPages,
    paginatedSurfaceLayout,
    contentPlacementMetrics,
    previewMetrics,
    editorialHeights,
    paginationGridMetrics: gridPaginationMetrics,
    variant: input.variant,
    snapshot: input.snapshot,
  };
};

const createStandaloneHtmlFromResolvedModel = (
  resolved: ReturnType<typeof resolvePublicationOutputModel>,
): string => {
  const editorial = createStandaloneEditorialHtml(resolved.renderModel, resolved.normalizedFlags);
  const payload: ViewerExportPayload = {
    format: 'malla-viewer-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: resolved.snapshot,
    theme: resolved.normalizedTheme,
    flags: resolved.normalizedFlags,
    kind: 'standalone-html',
    printSettings: resolved.normalizedPrintSettings,
    variant: resolved.variant,
  };

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resolved.renderModel.projectName || 'Publicacion')}</title>
    <style>${createViewerDocumentStyles()}</style>
  </head>
  <body>
    <main class="mve-export-root mve-standalone-shell" data-export-kind="standalone-html" data-export-variant="${resolved.variant}">
      ${editorial.header}
      <section class="mve-standalone-surface">
        <div class="mve-canvas" style="${styleToString({
          width: `${Math.max(resolved.renderModel.width, 1)}px`,
          height: `${Math.max(resolved.renderModel.height, 1)}px`,
        })}">
          ${renderFullCanvasHtml(resolved.renderModel)}
        </div>
      </section>
      ${editorial.footer}
    </main>
    <script id="malla-export-payload" type="application/json">${serializeJsonScript(payload)}</script>
  </body>
</html>`;
};

const createPrintHtmlFromResolvedModel = (
  resolved: ReturnType<typeof resolvePublicationOutputModel>,
): string => {
  const payload: ViewerExportPayload = {
    format: 'malla-viewer-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: resolved.snapshot,
    theme: resolved.normalizedTheme,
    flags: resolved.normalizedFlags,
    kind: 'print-document',
    printSettings: resolved.normalizedPrintSettings,
    variant: resolved.variant,
  };
  const printPageCss = resolveViewerPrintPageCss(resolved.pageMetrics);

  const pagesHtml = resolved.printedPages
    .map((page) => {
      const editorialLayout = resolveViewerPrintedPageEditorialLayout({
        showDocumentTitle: resolved.normalizedFlags.includeEditorial && resolved.normalizedPrintSettings.showDocumentTitle,
        documentTitleOverride: resolved.normalizedPrintSettings.documentTitleOverride,
        pageLayoutMode: resolved.normalizedPrintSettings.pageLayoutMode,
        showHeader: resolved.normalizedFlags.includeEditorial && resolved.normalizedPrintSettings.showHeader,
        headerText: resolved.normalizedPrintSettings.headerText,
        showFooter: resolved.normalizedFlags.includeEditorial && resolved.normalizedPrintSettings.showFooter,
        footerText: resolved.normalizedPrintSettings.footerText,
        showPageNumbers: resolved.normalizedFlags.includeEditorial && resolved.normalizedPrintSettings.showPageNumbers,
        projectName: resolved.renderModel.projectName,
        pageIndex: page.pageNumber - 1,
        pageCount: resolved.printedPages.length,
        contentHeightMm: resolved.pageMetrics.contentHeightMm,
        pxPerMmY: resolved.measuredPxPerMm.pxPerMmY,
      });
      const sliceLayout = resolveViewerPageSliceLayout({
        viewportWidthPx: page.viewportWidthPx,
        viewportHeightPx: page.viewportHeightPx,
        surfaceWidthPx: resolved.paginatedSurfaceLayout.scaledSurfaceWidthPx,
        surfaceHeightPx: resolved.paginatedSurfaceLayout.scaledSurfaceHeightPx,
        offsetX: page.printOffsetX,
        offsetY: page.printOffsetY,
      });

      return `<section class="mve-print-page" data-page-number="${page.pageNumber}">
        <div class="mve-print-page-content" style="${styleToString({
          width: `${resolved.pageMetrics.paperWidthMm}mm`,
          height: `${resolved.pageMetrics.paperHeightMm}mm`,
          padding: `${resolved.pageMetrics.marginTopMm}mm ${resolved.pageMetrics.marginRightMm}mm ${resolved.pageMetrics.marginBottomMm}mm ${resolved.pageMetrics.marginLeftMm}mm`,
        })}">
          ${editorialLayout.headerText ? `<div class="mve-print-header">${escapeHtml(editorialLayout.headerText)}</div>` : ''}
          ${editorialLayout.documentTitle ? `<h1 class="mve-print-title" style="${styleToString({ 'font-size': `${resolved.normalizedPrintSettings.documentTitleFontSize}px` })}">${escapeHtml(editorialLayout.documentTitle)}</h1>` : ''}
          <div class="mve-print-viewport" style="${styleToString({
            width: `${sliceLayout.viewportWidthPx}px`,
            height: `${sliceLayout.viewportHeightPx}px`,
          })}">
            ${renderSliceCanvasHtml(resolved.renderModel, sliceLayout, resolved.contentPlacementMetrics.scale)}
          </div>
          ${
            editorialLayout.footerText || editorialLayout.pageNumberText
              ? `<div class="mve-print-footer"><div>${escapeHtml(editorialLayout.footerText)}</div><div class="mve-print-page-number">${escapeHtml(editorialLayout.pageNumberText)}</div></div>`
              : ''
          }
        </div>
      </section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resolved.renderModel.projectName || 'Exportacion PDF')}</title>
    <style>${createViewerDocumentStyles()}</style>
    <style>${printPageCss}
html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { background: #fff; }</style>
  </head>
  <body>
    <main class="mve-export-root mve-print-document" data-export-kind="print-document" data-export-variant="${resolved.variant}">
      <div class="mve-print-sequence">${pagesHtml}</div>
    </main>
    <script id="malla-export-payload" type="application/json">${serializeJsonScript(payload)}</script>
  </body>
</html>`;
};

export const createViewerStandaloneHtml = (input: PublicationExportInput): string => {
  const resolved = resolvePublicationOutputModel(input);
  if (resolved.variant === 'print') {
    return createPrintHtmlFromResolvedModel(resolved);
  }
  return createStandaloneHtmlFromResolvedModel(resolved);
};

export const createViewerPrintHtml = (input: PublicationExportInput): string => {
  const resolved = resolvePublicationOutputModel({
    ...input,
    variant: 'print',
  });
  return createPrintHtmlFromResolvedModel(resolved);
};

export const downloadViewerStandaloneHtml = (input: PublicationExportInput) => {
  const html = createViewerStandaloneHtml(input);
  const fileName = `${buildViewerExportBaseName(input.snapshot)}.html`;
  triggerFileDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
};

export const openViewerPdfExport = (input: PublicationExportInput) => {
  const html = createViewerPrintHtml({
    ...input,
    variant: 'print',
  });
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

  const cleanup = () => {
    iframe.remove();
  };

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;
  if (!frameWindow || !frameDocument) {
    cleanup();
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const printNow = () => {
    frameWindow.focus();
    frameWindow.print();
  };

  frameWindow.onafterprint = () => {
    window.setTimeout(cleanup, 0);
  };

  const fontsReady = 'fonts' in frameDocument ? frameDocument.fonts.ready : Promise.resolve();
  void fontsReady.catch(() => undefined).finally(() => window.requestAnimationFrame(printNow));

  window.setTimeout(cleanup, 4000);
};
