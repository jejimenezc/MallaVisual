import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { AppCommandsProvider } from '../../state/app-commands';
import { GlobalMenuBar } from './GlobalMenuBar';

describe('GlobalMenuBar accessibility baseline', () => {
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

  const renderMenu = async () => {
    await act(async () => {
      root.render(
        <AppCommandsProvider>
          <GlobalMenuBar
            hasProject
            isMetaPanelEnabled={false}
            canToggleMetaPanel
            onNewProject={vi.fn()}
            onImportProjectFile={vi.fn()}
            onExportProject={vi.fn()}
            onOpenPreview={vi.fn()}
            onOpenPrintPreview={vi.fn()}
            onOpenPublishModal={vi.fn()}
            onImportPublicationFile={vi.fn()}
            onCloseProject={vi.fn()}
            onToggleMetaPanelEnabled={vi.fn()}
            getRecentProjects={() => [
              { id: 'p1', name: 'Proyecto demo', date: '2026-04-07T10:00:00.000Z' },
              { id: 'p2', name: 'Proyecto alfa', date: '2026-04-07T11:00:00.000Z' },
              { id: 'p3', name: 'Proyecto beta', date: '2026-04-07T12:00:00.000Z' },
            ]}
            onOpenProjectById={vi.fn()}
            onShowIntro={vi.fn()}
            onOpenProjectPalette={vi.fn()}
          />
        </AppCommandsProvider>,
      );
      await Promise.resolve();
    });
  };

  const flushAnimationFrame = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  test('abre Archivo con teclado y devuelve el foco al trigger al cerrar con Escape', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    expect(archivoTrigger).not.toBeNull();

    archivoTrigger?.focus();
    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const menu = container.querySelector<HTMLElement>('[data-menu-dropdown="archivo"]');
    const firstItem = menu?.querySelector<HTMLButtonElement>('button[role="menuitem"]');
    expect(menu).not.toBeNull();
    expect(firstItem).not.toBeNull();
    expect(document.activeElement).toBe(firstItem);

    await act(async () => {
      menu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });
    await flushAnimationFrame();

    expect(container.querySelector('[data-menu-dropdown="archivo"]')).toBeNull();
    expect(document.activeElement).toBe(archivoTrigger);
  });

  test('ArrowUp en el primer item cierra el menu y devuelve el foco al trigger', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    archivoTrigger?.focus();

    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const menu = container.querySelector<HTMLElement>('[data-menu-dropdown="archivo"]');
    const firstItem = menu?.querySelector<HTMLButtonElement>('button[role="menuitem"]');
    expect(document.activeElement).toBe(firstItem);

    await act(async () => {
      menu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[data-menu-dropdown="archivo"]')).toBeNull();
    expect(document.activeElement).toBe(archivoTrigger);
  });

  test('abre el submenu de recientes con teclado y enfoca su primer item', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    archivoTrigger?.focus();

    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const recentTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-menu-dropdown="archivo"] button[role="menuitem"]'),
    ).find((button) => button.textContent?.includes('Proyectos recientes'));
    expect(recentTrigger).not.toBeNull();

    recentTrigger?.focus();
    await act(async () => {
      recentTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });
    await flushAnimationFrame();

    const submenu = container.querySelector<HTMLElement>('[data-submenu-dropdown="archivo-recientes"]');
    const firstRecent = submenu?.querySelector<HTMLButtonElement>('button[role="menuitem"]');
    expect(submenu).not.toBeNull();
    expect(firstRecent).not.toBeNull();
    expect(firstRecent?.textContent).toContain('Proyecto demo');
    expect(document.activeElement).toBe(firstRecent);
  });

  test('en el submenu de recientes ArrowDown avanza de a un item sin saltos', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    archivoTrigger?.focus();

    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const recentTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-menu-dropdown="archivo"] button[role="menuitem"]'),
    ).find((button) => button.textContent?.includes('Proyectos recientes'));
    recentTrigger?.focus();

    await act(async () => {
      recentTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });
    await flushAnimationFrame();

    const submenu = container.querySelector<HTMLElement>('[data-submenu-dropdown="archivo-recientes"]');
    const items = submenu?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]');
    expect(items?.length).toBe(3);
    expect(document.activeElement).toBe(items?.[0] ?? null);

    await act(async () => {
      submenu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(items?.[1] ?? null);
  });

  test('ArrowLeft cierra recientes y devuelve el foco a su trigger', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    archivoTrigger?.focus();

    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const recentTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-menu-dropdown="archivo"] button[role="menuitem"]'),
    ).find((button) => button.textContent?.includes('Proyectos recientes'));
    expect(recentTrigger).not.toBeNull();

    recentTrigger?.focus();
    await act(async () => {
      recentTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });
    await flushAnimationFrame();

    const submenu = container.querySelector<HTMLElement>('[data-submenu-dropdown="archivo-recientes"]');
    expect(submenu).not.toBeNull();

    await act(async () => {
      submenu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await Promise.resolve();
    });
    await flushAnimationFrame();

    expect(container.querySelector('[data-submenu-dropdown="archivo-recientes"]')).toBeNull();
    expect(document.activeElement).toBe(recentTrigger);
  });

  test('los items simples exponen un nombre accesible unico', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    archivoTrigger?.focus();

    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await Promise.resolve();
    });

    const openProjectItem = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-menu-dropdown="archivo"] button[role="menuitem"]'),
    ).find((button) => button.getAttribute('aria-label') === 'Abrir proyecto');

    expect(openProjectItem).not.toBeNull();
    expect(openProjectItem?.textContent).toContain('Abrir proyecto');
  });

  test('ArrowRight entre menus principales mueve el foco real al siguiente trigger', async () => {
    await renderMenu();

    const archivoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-archivo');
    const proyectoTrigger = container.querySelector<HTMLButtonElement>('#global-menu-trigger-proyecto');

    archivoTrigger?.focus();
    await act(async () => {
      archivoTrigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(proyectoTrigger);
  });
});
