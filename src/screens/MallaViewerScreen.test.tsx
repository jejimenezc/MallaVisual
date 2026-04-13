import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { MallaViewerScreen } from './MallaViewerScreen.tsx';
import { createDefaultViewerTheme } from '../utils/viewer-theme.ts';
import { createDefaultViewerPrintSettings } from '../utils/viewer-print.ts';
import { MALLA_SNAPSHOT_PAYLOAD_KIND, type MallaSnapshot } from '../types/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import type { PublicationSessionMode } from '../types/publication-session.ts';

vi.mock('../utils/use-measured-px-per-mm.ts', () => ({
  useMeasuredPxPerMm: () => ({ pxPerMmX: 3.78, pxPerMmY: 3.78 }),
}));

vi.mock('../components/Header', () => ({
  Header: ({
    left,
    center,
    right,
    className,
  }: {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
  }) => (
    <header className={className}>
      <div>{left}</div>
      <div>{center}</div>
      <div>{right}</div>
    </header>
  ),
}));

vi.mock('../components/Button', () => ({
  Button: ({
    children,
    onClick,
    className,
    type = 'button',
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../components/ViewerPrintDocument.tsx', () => ({
  ViewerPrintDocument: () => null,
}));

vi.mock('../state/use-viewer-layout-model.ts', () => ({
  useViewerLayoutModel: ({ snapshot, theme, zoom }: { snapshot: MallaSnapshot; theme: ViewerTheme; zoom: number }) => ({
    renderModel: {
      projectName: snapshot.projectName,
      width: 220,
      height: 140,
      bandsRenderRows: [],
      items: [
        {
          id: 'piece-1',
          left: 0,
          top: 0,
          width: 220,
          height: 140,
          rows: 1,
          cols: 1,
          cellWidth: 200,
          cellHeight: 120,
          gridStyle: {
            width: '200px',
            height: '120px',
            gridTemplateColumns: 'repeat(1, 200px)',
            gridTemplateRows: 'repeat(1, 120px)',
            gap: '2px',
            padding: '4px',
          },
          cells: [
            {
              row: 0,
              col: 0,
              rowSpan: 1,
              colSpan: 1,
              type: 'text',
              text: 'Malla de prueba',
              checked: false,
              style: {
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
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
      theme,
    },
    pageMetrics: {},
    printCssVars: {},
    previewCssVars: {},
    effectivePrintScalePct: 100,
    contentPlacementMetrics: { scale: 1 },
    gridPaginationMetrics: { pagesX: 1, pagesY: 1 },
    printedPages: [],
    paginatedSurfaceLayout: null,
    previewTilePageModels: [],
    viewerPrintDocumentClassNames: {},
    printFrameStyle: {},
    printContentBoxStyle: {},
    previewCanvasInnerStyle: {
      width: `${220 * zoom}px`,
      height: `${140 * zoom}px`,
      transform: `scale(${zoom})`,
    },
    printStyleText: '',
  }),
}));

const snapshot: MallaSnapshot = {
  payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
  formatVersion: 1,
  createdAt: '2026-04-12T12:00:00.000Z',
  projectName: 'Proyecto WYSIWYG',
  grid: { rows: 1, cols: 1 },
  items: [],
};

describe('MallaViewerScreen presentation preview', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  async function renderViewer(input: {
    theme: ViewerTheme;
    publicationSession?: PublicationSessionMode;
    mode?: 'preview' | 'publication';
    snapshotOverride?: Partial<MallaSnapshot>;
  }) {
    await act(async () => {
      root.render(
        <MallaViewerScreen
          snapshot={{ ...snapshot, ...input.snapshotOverride }}
          mode={input.mode ?? 'preview'}
          publicationSession={input.publicationSession ?? 'design'}
          initialPanelMode="preview"
          theme={input.theme}
          printSettings={createDefaultViewerPrintSettings()}
          onThemeChange={vi.fn()}
          onPrintSettingsChange={vi.fn()}
          onBackToEditor={vi.fn()}
          onOpenPublishModal={vi.fn()}
          onImportPublicationFile={vi.fn()}
        />,
      );
      await Promise.resolve();
    });
  }

  test('muestra titulo, encabezado y pie en modo presentacion cuando estan activos', async () => {
    await renderViewer({
      theme: {
        ...createDefaultViewerTheme(),
        showTitle: true,
        titleText: 'Titulo visible',
        titleFontSize: 28,
        showHeaderFooter: true,
        headerText: 'Encabezado visible',
        footerText: 'Pie visible',
      },
    });

    expect(container.textContent).toContain('Titulo visible');
    expect(container.textContent).toContain('Encabezado visible');
    expect(container.textContent).toContain('Pie visible');
    expect(container.textContent).toContain('Malla de prueba');
  });

  test('muestra marca de version no trazable en diseno sin UUID', async () => {
    await renderViewer({
      theme: createDefaultViewerTheme(),
    });

    expect(container.textContent).toContain('Versión no trazable');
  });

  test('muestra copia oficial con UUID en certificacion activa', async () => {
    await renderViewer({
      theme: createDefaultViewerTheme(),
      publicationSession: 'certify',
      snapshotOverride: {
        snapshotId: 'uuid-cert-12345678',
      },
    });

    expect(container.textContent).toContain('Original certificado');
    expect(container.textContent).toContain('uuid-cer');
  });

  test('muestra derivado de UUID al abrir snapshot publicado', async () => {
    await renderViewer({
      theme: createDefaultViewerTheme(),
      mode: 'publication',
      publicationSession: 'certify',
      snapshotOverride: {
        snapshotId: 'uuid-derivado-87654321',
      },
    });

    expect(container.textContent).toContain('Copia fiel de');
    expect(container.textContent).toContain('uuid-der');
  });

  test('oculta bloques editoriales en modo presentacion cuando no estan activos', async () => {
    await renderViewer({
      theme: {
        ...createDefaultViewerTheme(),
        showTitle: false,
        titleText: 'Titulo oculto',
        showHeaderFooter: false,
        headerText: 'Encabezado oculto',
        footerText: 'Pie oculto',
      },
    });

    expect(container.textContent).not.toContain('Titulo oculto');
    expect(container.textContent).not.toContain('Encabezado oculto');
    expect(container.textContent).not.toContain('Pie oculto');
    expect(container.textContent).toContain('Malla de prueba');
  });
});
