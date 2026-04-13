import { describe, expect, test } from 'vitest';
import { MALLA_SNAPSHOT_PAYLOAD_KIND, type MallaSnapshot } from '../types/malla-snapshot.ts';
import { createDefaultViewerTheme } from './viewer-theme.ts';
import { createDefaultViewerPrintSettings } from './viewer-print.ts';
import {
  buildViewerExportBaseName,
  createViewerPrintHtml,
  createViewerStandaloneHtml,
  resolvePublicationOutputModel,
} from './viewer-export.ts';

const snapshot: MallaSnapshot = {
  payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
  formatVersion: 1,
  createdAt: '2026-03-18T12:00:00.000Z',
  projectName: 'Ingeniería Ñ',
  grid: {
    rows: 1,
    cols: 1,
  },
  bands: {
    headers: {
      rows: [
        {
          id: 'header-1',
          cells: [
            {
              col: 0,
              text: 'Semestre 1',
              style: {
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
                textAlign: 'center',
                border: 'thin',
                fontSizePx: 12,
                paddingX: 6,
                paddingY: 4,
                bold: true,
                italic: false,
              },
            },
          ],
        },
      ],
    },
  },
  items: [
    {
      id: 'piece-1',
      row: 0,
      col: 0,
      aspect: '1/1',
      rows: 1,
      cols: 1,
      merges: [],
      cells: [
        {
          row: 0,
          col: 0,
          rowSpan: 1,
          colSpan: 1,
          type: 'text',
          text: 'Calculo I',
          value: 'Calculo I',
          style: {
            backgroundColor: '#ffffff',
            textColor: '#111827',
            textAlign: 'center',
            border: 'thin',
            fontSizePx: 14,
            paddingX: 8,
            paddingY: 6,
            bold: false,
            italic: false,
          },
        },
      ],
    },
  ],
};

describe('viewer-export', () => {
  test('builds a stable export base name', () => {
    expect(buildViewerExportBaseName(snapshot)).toBe('ingenieria-n-publicacion');
  });

  test('creates standalone html without editor shell', () => {
    const html = createViewerStandaloneHtml({
      snapshot,
      config: {
        theme: {
          ...createDefaultViewerTheme(),
          showTitle: true,
          titleText: 'Titulo standalone',
          titleFontSize: 30,
          headerText: 'Cabecera standalone',
          footerText: 'Pie standalone',
        },
        flags: {
          includeEditorial: true,
          includeOverlay: false,
        },
      },
      product: 'html-web',
    });

    expect(html).toContain('mve-standalone-shell');
    expect(html).toContain('Titulo standalone');
    expect(html).toContain('Cabecera standalone');
    expect(html).toContain('Pie standalone');
    expect(html).toContain('Calculo I');
    expect(html).toContain('Versión no trazable');
    expect(html).toContain('data-traceability-mode="work"');
    expect(html).toContain('"includeOverlay":false');
    expect(html).not.toContain('GlobalMenuBar');
  });

  test('marks publication-mode web outputs as derived from the certified snapshot', () => {
    const html = createViewerStandaloneHtml({
      snapshot: {
        ...snapshot,
        snapshotId: 'uuid-derivado-87654321',
      },
      config: {
        theme: createDefaultViewerTheme(),
      },
      product: 'html-web',
      traceabilityMode: 'derived',
    });

    expect(html).toContain('Copia fiel de uuid-der');
    expect(html).toContain('data-traceability-mode="derived"');
  });

  test('creates print html and honors editorial flag', () => {
    const html = createViewerPrintHtml({
      snapshot,
      config: {
        theme: createDefaultViewerTheme(),
        printSettings: {
          ...createDefaultViewerPrintSettings(),
          showDocumentTitle: true,
          showHeader: true,
          headerText: 'Encabezado PDF',
          showFooter: true,
          footerText: 'Pie PDF',
          showPageNumbers: true,
        },
        flags: {
          includeEditorial: false,
          includeOverlay: false,
        },
      },
      product: 'pdf',
    });

    expect(html).toContain('Calculo I');
    expect(html).not.toContain('<div class="mve-print-header">Encabezado PDF</div>');
    expect(html).not.toContain('<div>Pie PDF</div>');
    expect(html).not.toContain('Pagina 1 de 1');
    expect(html).toContain('"kind":"print-document"');
    expect(html).toContain('Versión no trazable');
    expect(html).toContain('viewerPrintedPageSequence');
    expect(html).not.toContain('mve-print-page');
    expect(html).toContain('--print-content-width-mm');
  });

  test('print html resets preview page dimensions in print media', () => {
    const html = createViewerPrintHtml({
      snapshot,
      config: {
        theme: createDefaultViewerTheme(),
        printSettings: createDefaultViewerPrintSettings(),
      },
      product: 'pdf',
    });

    expect(html).toContain('.viewerPrintedPage {');
    expect(html).toContain('width: auto !important;');
    expect(html).toContain('height: auto !important;');
    expect(html).toContain('min-height: 0 !important;');
    expect(html).toContain('max-height: none !important;');
  });

  test('resolves shared config into print metrics', () => {
    const resolved = resolvePublicationOutputModel({
      snapshot,
      config: {
        theme: createDefaultViewerTheme(),
        printSettings: {
          ...createDefaultViewerPrintSettings(),
          paperSize: 'oficio',
          orientation: 'landscape',
          scale: 0.75,
          fitToWidth: false,
        },
      },
      product: 'html-paginated',
    });

    expect(resolved.normalizedPrintSettings.paperSize).toBe('oficio');
    expect(resolved.normalizedPrintSettings.orientation).toBe('landscape');
    expect(resolved.normalizedPrintSettings.scale).toBe(0.75);
    expect(resolved.pageMetrics.paperWidthMm).toBeGreaterThan(resolved.pageMetrics.paperHeightMm);
  });

  test('creates embed html without editorial shell', () => {
    const html = createViewerStandaloneHtml({
      snapshot,
      config: {
        theme: {
          ...createDefaultViewerTheme(),
          showHeaderFooter: true,
          headerText: 'Cabecera',
          footerText: 'Pie',
        },
      },
      product: 'html-embed',
    });

    expect(html).toContain('mve-standalone-embed');
    expect(html).toContain('data-export-product="html-embed"');
    expect(html).not.toContain('<header class="mve-standalone-header">');
    expect(html).not.toContain('<footer class="mve-standalone-footer">');
  });

  test('creates paginated html with the shared document renderer', () => {
    const html = createViewerStandaloneHtml({
      snapshot,
      config: {
        theme: createDefaultViewerTheme(),
        printSettings: {
          ...createDefaultViewerPrintSettings(),
          showDocumentTitle: true,
          documentTitleOverride: 'Documento paginado',
        },
      },
      product: 'html-paginated',
    });

    expect(html).toContain('viewerPrintExportRoot');
    expect(html).toContain('viewerPrintedPageSequence');
    expect(html).toContain('Documento paginado');
    expect(html).not.toContain('mve-print-page');
  });

  test('document outputs prioritize snapshot document profile over local print settings', () => {
    const html = createViewerPrintHtml({
      snapshot: {
        ...snapshot,
        snapshotId: 'uuid-cert-12345678',
        documentProfile: {
          profileVersion: 1,
          showDocumentTitle: true,
          documentTitleFontSize: 28,
          documentTitleOverride: 'Documento del snapshot',
          pageLayoutMode: 'first-page-only',
          showHeader: true,
          headerText: 'Header del snapshot',
          showFooter: true,
          footerText: 'Footer del snapshot',
          showPageNumbers: true,
        },
      },
      config: {
        theme: createDefaultViewerTheme(),
        printSettings: {
          ...createDefaultViewerPrintSettings(),
          showDocumentTitle: false,
          documentTitleOverride: 'Documento local',
          showHeader: false,
          headerText: 'Header local',
          showFooter: false,
          footerText: 'Footer local',
          showPageNumbers: false,
        },
      },
      product: 'pdf',
      traceabilityMode: 'official',
    });

    expect(html).toContain('Original certificado');
    expect(html).toContain('12345678');
    expect(html).toContain('Documento del snapshot');
    expect(html).toContain('Header del snapshot');
    expect(html).toContain('Footer del snapshot');
    expect(html).toContain('Pagina 1 de 1');
    expect(html).not.toContain('Documento local');
    expect(html).not.toContain('Header local');
    expect(html).not.toContain('Footer local');
  });
});
