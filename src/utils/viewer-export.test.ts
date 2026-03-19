import { describe, expect, test } from 'vitest';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import { createDefaultViewerTheme } from './viewer-theme.ts';
import { createDefaultViewerPrintSettings } from './viewer-print.ts';
import {
  buildViewerExportBaseName,
  createViewerPrintHtml,
  createViewerStandaloneHtml,
  resolvePublicationOutputModel,
} from './viewer-export.ts';

const snapshot: MallaSnapshot = {
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
          headerText: 'Cabecera standalone',
          footerText: 'Pie standalone',
        },
        flags: {
          includeEditorial: true,
          includeOverlay: false,
        },
      },
      variant: 'presentation',
    });

    expect(html).toContain('mve-standalone-shell');
    expect(html).toContain('Cabecera standalone');
    expect(html).toContain('Pie standalone');
    expect(html).toContain('Calculo I');
    expect(html).toContain('"includeOverlay":false');
    expect(html).not.toContain('GlobalMenuBar');
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
      variant: 'print',
    });

    expect(html).toContain('Calculo I');
    expect(html).not.toContain('<div class="mve-print-header">Encabezado PDF</div>');
    expect(html).not.toContain('<div>Pie PDF</div>');
    expect(html).not.toContain('<div class="mve-print-page-number">Pagina 1 de 1</div>');
    expect(html).toContain('"kind":"print-document"');
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
      variant: 'print',
    });

    expect(resolved.normalizedPrintSettings.paperSize).toBe('oficio');
    expect(resolved.normalizedPrintSettings.orientation).toBe('landscape');
    expect(resolved.normalizedPrintSettings.scale).toBe(0.75);
    expect(resolved.pageMetrics.paperWidthMm).toBeGreaterThan(resolved.pageMetrics.paperHeightMm);
  });
});
