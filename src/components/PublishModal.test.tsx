import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { PublishModal } from './PublishModal';
import type { PublishActionKey } from './PublishModal';

describe('PublishModal session copy', () => {
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

  const actions = Object.fromEntries(
    ([
      'snapshot-json',
      'pdf',
      'print',
      'html-web',
      'html-download',
      'html-paginated',
      'html-embed',
    ] as PublishActionKey[]).map((key) => [key, { availability: 'ready', status: 'idle' }]),
  ) as Record<PublishActionKey, { availability: 'ready'; status: 'idle' }>;

  test('oculta la publicacion oficial en sesion de diseno', async () => {
    await act(async () => {
      root.render(
        <PublishModal
          isOpen
          origin="editor"
          mode="presentation"
          session="design"
          actions={actions}
          onClose={vi.fn()}
          onSelectProduct={vi.fn()}
          onGoToPresentation={vi.fn()}
          onGoToDocument={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Publicaciones no oficiales');
    expect(container.textContent).not.toContain('Acta de datos certificada');
    expect(container.textContent).not.toContain('Emitir acta certificada');
  });

  test('muestra la publicacion oficial en sesion de certificacion', async () => {
    await act(async () => {
      root.render(
        <PublishModal
          isOpen
          origin="viewer"
          mode="presentation"
          session="certify"
          actions={actions}
          onClose={vi.fn()}
          onSelectProduct={vi.fn()}
          onGoToPresentation={vi.fn()}
          onGoToDocument={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Publicaciones oficiales');
    expect(container.textContent).toContain('Publicacion oficial');
    expect(container.textContent).toContain('Acta de datos certificada');
    expect(container.textContent).toContain('Emitir acta certificada');
    expect(container.textContent).toContain('Emitir archivo web');
  });
});
