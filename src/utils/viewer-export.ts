import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createViewerPrintDocumentExportStyles,
  ViewerPrintDocument,
  VIEWER_PRINT_DOCUMENT_EXPORT_CLASS_NAMES,
} from '../components/ViewerPrintDocument.tsx';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  createDefaultPublicationOutputConfig,
  normalizePublicationOutputConfig,
  type PublicationExportFlags,
  type PublicationProduct,
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
  resolveViewerPaginatedSurfaceLayout,
  resolveViewerPaginationGridMetrics,
  resolveViewerPrintCssVars,
  resolveViewerPrintPageCss,
  resolveViewerPrintedPagesFromPaginationGrid,
  resolveViewerPreviewPageMetrics,
} from './viewer-print.ts';
import { logAppError } from '../core/runtime/logger.ts';

export interface PublicationExportInput {
  snapshot: MallaSnapshot;
  config?: Partial<PublicationOutputConfig>;
  product: PublicationProduct;
}

interface ViewerExportPayload {
  format: 'malla-viewer-export';
  version: 1;
  exportedAt: string;
  snapshot: MallaSnapshot;
  theme: ViewerTheme;
  flags: PublicationExportFlags;
  product: PublicationProduct;
  kind: 'standalone-html' | 'print-document';
  printSettings?: PublicationOutputConfig['printSettings'];
  variant: 'presentation' | 'print';
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

const openHtmlDocument = (html: string, target: '_blank' | '_self' = '_blank') => {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const opened = window.open(url, target, 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return opened;
};

const resolvePublicationVariantFromProduct = (
  product: PublicationProduct,
): 'presentation' | 'print' =>
  product === 'pdf' || product === 'print' || product === 'html-paginated'
    ? 'print'
    : 'presentation';

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
  .mve-standalone-title,
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

  .mve-standalone-title {
    font-weight: 700;
    line-height: 1.1;
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

  }
`;

const createStandaloneEditorialHtml = (renderModel: ViewerRenderModel, flags: PublicationExportFlags) => {
  if (!flags.includeEditorial) {
    return { title: '', header: '', footer: '' };
  }

  const titleText = renderModel.theme.titleText.trim() || renderModel.projectName.trim();
  const title =
    renderModel.theme.showTitle && titleText
      ? `<h1 class="mve-standalone-title" style="${styleToString({ 'font-size': `${renderModel.theme.titleFontSize}px` })}">${escapeHtml(titleText)}</h1>`
      : '';

  if (!renderModel.theme.showHeaderFooter) {
    return { title, header: '', footer: '' };
  }

  const headerText = renderModel.theme.headerText.trim();
  const footerText = renderModel.theme.footerText.trim();

  return {
    title,
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
    product: input.product,
    variant: resolvePublicationVariantFromProduct(input.product),
    snapshot: input.snapshot,
  };
};

const createStandaloneHtmlFromResolvedModel = (
  resolved: ReturnType<typeof resolvePublicationOutputModel>,
): string => {
  const includeEditorial =
    resolved.product !== 'html-embed' &&
    resolved.product !== 'html-paginated' &&
    resolved.normalizedFlags.includeEditorial;
  const editorial = createStandaloneEditorialHtml(resolved.renderModel, {
    ...resolved.normalizedFlags,
    includeEditorial,
  });
  const payload: ViewerExportPayload = {
    format: 'malla-viewer-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: resolved.snapshot,
    theme: resolved.normalizedTheme,
    flags: resolved.normalizedFlags,
    product: resolved.product,
    kind: 'standalone-html',
    printSettings: resolved.normalizedPrintSettings,
    variant: resolved.variant,
  };
  const shellClass = resolved.product === 'html-embed' ? 'mve-standalone-embed' : 'mve-standalone-shell';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resolved.renderModel.projectName || 'Publicacion')}</title>
    <style>${createViewerDocumentStyles()}</style>
  </head>
  <body>
    <main class="mve-export-root ${shellClass}" data-export-kind="standalone-html" data-export-product="${resolved.product}" data-export-variant="${resolved.variant}">
      ${editorial.title}
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
    product: resolved.product,
    kind: 'print-document',
    printSettings: resolved.normalizedPrintSettings,
    variant: resolved.variant,
  };
  const printPageCss = resolveViewerPrintPageCss(resolved.pageMetrics);
  const printCssVars = resolveViewerPrintCssVars(resolved.pageMetrics);
  const printSettings = resolved.normalizedFlags.includeEditorial
    ? resolved.normalizedPrintSettings
    : {
        ...resolved.normalizedPrintSettings,
        showDocumentTitle: false,
        showHeader: false,
        showFooter: false,
        showPageNumbers: false,
      };
  const pagesHtml = renderToStaticMarkup(
    createElement(ViewerPrintDocument, {
      renderModel: resolved.renderModel,
      printedPages: resolved.printedPages,
      paginatedSurfaceLayout: resolved.paginatedSurfaceLayout,
      contentScale: resolved.contentPlacementMetrics.scale,
      printSettings,
      pageMetrics: resolved.pageMetrics,
      pxPerMmY: resolved.measuredPxPerMm.pxPerMmY,
      classNames: VIEWER_PRINT_DOCUMENT_EXPORT_CLASS_NAMES,
      pageStyle: {
        width: `${resolved.previewMetrics.paperWidthPx}px`,
        height: `${resolved.previewMetrics.paperHeightPx}px`,
        minHeight: `${resolved.previewMetrics.paperHeightPx}px`,
        maxHeight: `${resolved.previewMetrics.paperHeightPx}px`,
      },
      contentBoxStyle: {
        width: `${resolved.paginatedSurfaceLayout.contentWidthPx}px`,
        height: `${resolved.paginatedSurfaceLayout.contentHeightPx}px`,
        minHeight: `${resolved.paginatedSurfaceLayout.contentHeightPx}px`,
        maxHeight: `${resolved.paginatedSurfaceLayout.contentHeightPx}px`,
        margin: `${resolved.paginatedSurfaceLayout.paperPaddingPx.top}px ${resolved.paginatedSurfaceLayout.paperPaddingPx.right}px ${resolved.paginatedSurfaceLayout.paperPaddingPx.bottom}px ${resolved.paginatedSurfaceLayout.paperPaddingPx.left}px`,
      },
    }),
  );

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resolved.renderModel.projectName || 'Exportacion PDF')}</title>
    <style>${createViewerDocumentStyles()}</style>
    <style>${createViewerPrintDocumentExportStyles()}</style>
    <style>${printPageCss}
html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { background: #fff; }</style>
  </head>
  <body>
    <main class="mve-export-root viewerPrintExportRoot" style="${styleToString(printCssVars as unknown as Record<string, string>)}" data-export-kind="print-document" data-export-product="${resolved.product}" data-export-variant="${resolved.variant}">
      ${pagesHtml}
    </main>
    <script id="malla-export-payload" type="application/json">${serializeJsonScript(payload)}</script>
  </body>
</html>`;
};

export const createViewerStandaloneHtml = (input: PublicationExportInput): string => {
  const resolved = resolvePublicationOutputModel(input);
  if (resolved.product === 'html-paginated') {
    return createPrintHtmlFromResolvedModel(resolved);
  }
  return createStandaloneHtmlFromResolvedModel(resolved);
};

export const createViewerPrintHtml = (input: PublicationExportInput): string => {
  const resolved = resolvePublicationOutputModel({
    ...input,
    product: input.product === 'print' ? 'print' : 'pdf',
  });
  return createPrintHtmlFromResolvedModel(resolved);
};

export const downloadViewerStandaloneHtml = (input: PublicationExportInput) => {
  const html = createViewerStandaloneHtml(input);
  const fileName = `${buildViewerExportBaseName(input.snapshot)}.html`;
  triggerFileDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), fileName);
};

export const openViewerStandaloneHtml = (input: PublicationExportInput) => {
  const html = createViewerStandaloneHtml(input);
  return openHtmlDocument(html);
};

export const openViewerPdfExport = (input: PublicationExportInput) => {
  const html = createViewerPrintHtml({
    ...input,
    product: input.product === 'print' ? 'print' : 'pdf',
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
  void fontsReady
    .catch((error) => {
      logAppError({
        scope: 'publication',
        severity: 'non-fatal',
        message: 'La carga de fuentes para exportacion fallo; se continuara con la salida.',
        error,
      });
      return undefined;
    })
    .finally(() => window.requestAnimationFrame(printNow));

  window.setTimeout(cleanup, 4000);
};
