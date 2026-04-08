// src/components/GlobalMenuBar/GlobalMenuBar.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import styles from './GlobalMenuBar.module.css';
import { useAppCommands } from '../../state/app-commands';

interface RecentProject { id: string; name: string; date: string; }
interface GlobalMenuBarProps {
  hasProject: boolean; isMetaPanelEnabled: boolean; canToggleMetaPanel: boolean;
  onNewProject: () => void; onImportProjectFile: (file: File) => Promise<void> | void;
  onExportProject: () => void; onOpenPreview: () => void; onOpenPrintPreview: () => void;
  onOpenPublishModal: () => void; onImportPublicationFile: (file: File) => Promise<void> | void;
  onCloseProject: () => void; onToggleMetaPanelEnabled: () => void; getRecentProjects: () => RecentProject[];
  onOpenProjectById: (id: string) => void; onShowIntro: () => void; onOpenProjectPalette: () => void;
}

type PrimaryMenuKey = 'archivo' | 'proyecto' | 'biblioteca' | 'publicar' | 'editar' | 'usuarios' | 'ayuda';
type MenuKey = PrimaryMenuKey | null;
type SubmenuKey = 'archivo-recientes' | 'biblioteca-maestros';
type FocusTarget = 'first' | 'last';

const MENU_ORDER: PrimaryMenuKey[] = ['archivo', 'proyecto', 'biblioteca', 'publicar', 'editar', 'usuarios', 'ayuda'];

const getMenuItems = (container: Document | Element | null) =>
  container ? Array.from(container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')) : [];

export function GlobalMenuBar(props: GlobalMenuBarProps): JSX.Element {
  const {
    hasProject, isMetaPanelEnabled, canToggleMetaPanel, onNewProject, onImportProjectFile, onExportProject,
    onOpenPreview, onOpenPrintPreview, onOpenPublishModal, onImportPublicationFile, onCloseProject,
    onToggleMetaPanelEnabled, getRecentProjects, onOpenProjectById, onShowIntro, onOpenProjectPalette,
  } = props;
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKey | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const publicationInputRef = useRef<HTMLInputElement>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<PrimaryMenuKey, HTMLButtonElement | null>>>({});
  const pendingMenuFocusRef = useRef<{ menu: PrimaryMenuKey; target: FocusTarget } | null>(null);
  const pendingSubmenuFocusRef = useRef<{ submenu: SubmenuKey; target: FocusTarget } | null>(null);
  const { commands, executeCommand } = useAppCommands();
  const canUndo = Boolean(commands.undo?.isEnabled);
  const canRedo = Boolean(commands.redo?.isEnabled);

  const menuTriggerId = (menu: PrimaryMenuKey) => `global-menu-trigger-${menu}`;
  const menuDropdownId = (menu: PrimaryMenuKey) => `global-menu-dropdown-${menu}`;
  const submenuDropdownId = (submenu: SubmenuKey) => `global-submenu-dropdown-${submenu}`;

  const closeMenu = useCallback(() => { setOpenMenu(null); setOpenSubmenu(null); }, []);
  const closeMenuAndFocusTrigger = useCallback((menu: PrimaryMenuKey) => {
    closeMenu();
    triggerRefs.current[menu]?.focus();
  }, [closeMenu]);

  const focusAdjacentTrigger = useCallback((currentMenu: PrimaryMenuKey, direction: 1 | -1) => {
    const currentIndex = MENU_ORDER.indexOf(currentMenu);
    triggerRefs.current[MENU_ORDER[(currentIndex + direction + MENU_ORDER.length) % MENU_ORDER.length]]?.focus();
  }, []);

  const openMenuFromKeyboard = useCallback((menu: PrimaryMenuKey, target: FocusTarget = 'first') => {
    setOpenSubmenu(null);
    setOpenMenu(menu);
    pendingMenuFocusRef.current = { menu, target };
  }, []);

  const openAdjacentMenuFromKeyboard = useCallback((currentMenu: PrimaryMenuKey, direction: 1 | -1) => {
    const currentIndex = MENU_ORDER.indexOf(currentMenu);
    openMenuFromKeyboard(MENU_ORDER[(currentIndex + direction + MENU_ORDER.length) % MENU_ORDER.length], 'first');
  }, [openMenuFromKeyboard]);

  const focusMenuStep = useCallback((container: HTMLElement, direction: 1 | -1) => {
    const items = getMenuItems(container);
    if (!items.length) return;
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex = activeIndex === -1 ? (direction === 1 ? 0 : items.length - 1) : (activeIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }, []);

  const focusMenuBoundary = useCallback((container: HTMLElement, target: FocusTarget) => {
    const items = getMenuItems(container);
    (target === 'last' ? items[items.length - 1] : items[0])?.focus();
  }, []);

  const triggerKeyDown = useCallback((menu: PrimaryMenuKey) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); if (openMenu === menu) { openAdjacentMenuFromKeyboard(menu, 1); } else { focusAdjacentTrigger(menu, 1); } return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (openMenu === menu) { openAdjacentMenuFromKeyboard(menu, -1); } else { focusAdjacentTrigger(menu, -1); } return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); openMenuFromKeyboard(menu, 'first'); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); openMenuFromKeyboard(menu, 'last'); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (openMenu === menu) { closeMenuAndFocusTrigger(menu); } else { openMenuFromKeyboard(menu, 'first'); } return; }
    if (event.key === 'Escape' && openMenu === menu) { event.preventDefault(); closeMenuAndFocusTrigger(menu); }
  }, [closeMenuAndFocusTrigger, focusAdjacentTrigger, openAdjacentMenuFromKeyboard, openMenu, openMenuFromKeyboard]);

  const listKeyDown = useCallback((menu: PrimaryMenuKey) => (event: React.KeyboardEvent<HTMLUListElement>) => {
    const container = event.currentTarget;
    const items = getMenuItems(container);
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); focusMenuStep(container, 1); return; }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (activeIndex <= 0) {
        closeMenuAndFocusTrigger(menu);
      } else {
        focusMenuStep(container, -1);
      }
      return;
    }
    if (event.key === 'Home') { event.preventDefault(); focusMenuBoundary(container, 'first'); return; }
    if (event.key === 'End') { event.preventDefault(); focusMenuBoundary(container, 'last'); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); openAdjacentMenuFromKeyboard(menu, 1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); openAdjacentMenuFromKeyboard(menu, -1); return; }
    if (event.key === 'Escape') { event.preventDefault(); closeMenuAndFocusTrigger(menu); return; }
    if (event.key === 'Tab') closeMenu();
  }, [closeMenu, closeMenuAndFocusTrigger, focusMenuBoundary, focusMenuStep, openAdjacentMenuFromKeyboard]);

  const submenuTriggerKeyDown = useCallback((menu: PrimaryMenuKey, submenu: SubmenuKey) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setOpenSubmenu(submenu); pendingSubmenuFocusRef.current = { submenu, target: 'first' }; return; }
    if (event.key === 'ArrowLeft' && openSubmenu === submenu) { event.preventDefault(); event.stopPropagation(); setOpenSubmenu(null); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenuAndFocusTrigger(menu); }
  }, [closeMenuAndFocusTrigger, openSubmenu]);

  const submenuListKeyDown = useCallback((menu: PrimaryMenuKey, _submenu: SubmenuKey) => (event: React.KeyboardEvent<HTMLUListElement>) => {
    const container = event.currentTarget;
    if (event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); focusMenuStep(container, 1); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); focusMenuStep(container, -1); return; }
    if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); focusMenuBoundary(container, 'first'); return; }
    if (event.key === 'End') { event.preventDefault(); event.stopPropagation(); focusMenuBoundary(container, 'last'); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); const parentTrigger = container.parentElement?.querySelector<HTMLButtonElement>('button[role="menuitem"]'); parentTrigger?.focus(); setOpenSubmenu(null); return; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenuAndFocusTrigger(menu); return; }
    if (event.key === 'Tab') { event.stopPropagation(); closeMenu(); }
  }, [closeMenu, closeMenuAndFocusTrigger, focusMenuBoundary, focusMenuStep]);

  useEffect(() => { if (openMenu === 'archivo') setRecentProjects(getRecentProjects().slice(0, 10)); }, [getRecentProjects, openMenu]);
  useEffect(() => {
    const pending = pendingMenuFocusRef.current;
    if (!pending || openMenu !== pending.menu) return;
    const items = getMenuItems(menuBarRef.current?.querySelector(`[data-menu-dropdown="${pending.menu}"]`) ?? null);
    (pending.target === 'last' ? items[items.length - 1] : items[0])?.focus();
    pendingMenuFocusRef.current = null;
  }, [openMenu, openSubmenu]);
  useEffect(() => {
    const pending = pendingSubmenuFocusRef.current;
    if (!pending || openSubmenu !== pending.submenu) return;
    const items = getMenuItems(menuBarRef.current?.querySelector(`[data-submenu-dropdown="${pending.submenu}"]`) ?? null);
    (pending.target === 'last' ? items[items.length - 1] : items[0])?.focus();
    pendingSubmenuFocusRef.current = null;
  }, [openSubmenu]);
  useEffect(() => {
    if (typeof window === 'undefined' || !openMenu) return undefined;
    const handleClickOutside = () => closeMenu();
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [closeMenu, openMenu]);

  const runAndClose = (fn: () => void, enabled = true) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); event.stopPropagation(); closeMenu(); if (enabled) fn();
  };
  const runAsyncImport = (fn: (file: File) => Promise<void> | void) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; closeMenu(); try { await fn(file); } finally { event.target.value = ''; }
  };
  const openInput = (ref: React.RefObject<HTMLInputElement | null>) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); event.stopPropagation(); closeMenu(); ref.current?.click();
  };

  const recentItems = !recentProjects.length
    ? <li className={styles.dropdownItemWrapper} role="none"><span className={styles.dropdownLabelDisabled}>No hay proyectos recientes</span></li>
    : recentProjects.map((project) => (
      <li key={project.id} className={styles.dropdownItemWrapper} role="none">
        <button type="button" className={styles.dropdownItem} role="menuitem" aria-label={`${project.name}. ${Number.isNaN(new Date(project.date).getTime()) ? project.date : new Date(project.date).toLocaleString()}`} onClick={runAndClose(() => onOpenProjectById(project.id))}>
          <span className={styles.itemPrimary} aria-hidden="true">{project.name}</span>
          <span className={styles.itemSecondary} aria-hidden="true">{Number.isNaN(new Date(project.date).getTime()) ? project.date : new Date(project.date).toLocaleString()}</span>
        </button>
      </li>
    ));

  const triggerProps = (menu: PrimaryMenuKey) => ({
    id: menuTriggerId(menu),
    ref: (element: HTMLButtonElement | null) => { triggerRefs.current[menu] = element; },
    role: 'menuitem' as const,
    'aria-label': menu === 'publicar' ? 'Publicación' : menu === 'archivo' ? 'Archivo' : menu === 'proyecto' ? 'Proyecto' : menu === 'biblioteca' ? 'Biblioteca' : menu === 'editar' ? 'Editar' : menu === 'usuarios' ? 'Usuarios' : 'Ayuda',
    'aria-haspopup': 'menu' as const,
    'aria-expanded': openMenu === menu,
    'aria-controls': openMenu === menu ? menuDropdownId(menu) : undefined,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); setOpenSubmenu(null); setOpenMenu((prev) => (prev === menu ? null : menu)); },
    onKeyDown: triggerKeyDown(menu),
  });

  return (
    <div className={styles.menuBar} ref={menuBarRef} role="menubar" aria-label="Barra global de menús">
      <div className={styles.menuSection}>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('archivo')}><span aria-hidden="true">Archivo</span></button>
          {openMenu === 'archivo' ? (
            <ul id={menuDropdownId('archivo')} className={styles.dropdown} role="menu" aria-labelledby={menuTriggerId('archivo')} data-menu-dropdown="archivo" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('archivo')}>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Nuevo proyecto" onClick={runAndClose(onNewProject)}><span aria-hidden="true">Nuevo proyecto...</span></button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Abrir proyecto" onClick={openInput(fileInputRef)}><span aria-hidden="true">Abrir proyecto...</span></button></li>
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`} role="none">
                <button type="button" className={styles.dropdownItem} role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenSubmenu((prev) => (prev === 'archivo-recientes' ? null : 'archivo-recientes')); }} onKeyDown={submenuTriggerKeyDown('archivo', 'archivo-recientes')} aria-haspopup="menu" aria-expanded={openSubmenu === 'archivo-recientes'} aria-controls={openSubmenu === 'archivo-recientes' ? submenuDropdownId('archivo-recientes') : undefined}>Proyectos recientes<span className={styles.caret} aria-hidden="true">▸</span></button>
                {openSubmenu === 'archivo-recientes' ? <ul id={submenuDropdownId('archivo-recientes')} className={styles.submenuList} role="menu" data-submenu-dropdown="archivo-recientes" onKeyDown={submenuListKeyDown('archivo', 'archivo-recientes')}>{recentItems}</ul> : null}
              </li>
              {hasProject ? <><li className={styles.dropdownSeparator} aria-hidden="true" /><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Cerrar proyecto" onClick={runAndClose(onCloseProject, hasProject)}><span aria-hidden="true">Cerrar proyecto</span></button></li><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Exportar proyecto" onClick={runAndClose(onExportProject, hasProject)}><span aria-hidden="true">Exportar proyecto...</span></button></li></> : null}
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Preferencias" disabled><span aria-hidden="true">Preferencias...</span></button></li>
            </ul>
          ) : null}
        </div>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('proyecto')}><span aria-hidden="true">Proyecto</span></button>
          {openMenu === 'proyecto' ? (
            <ul id={menuDropdownId('proyecto')} className={styles.dropdown} role="menu" aria-labelledby={menuTriggerId('proyecto')} data-menu-dropdown="proyecto" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('proyecto')}>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Propiedades" disabled><span aria-hidden="true">Propiedades...</span></button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Paleta de color" onClick={runAndClose(onOpenProjectPalette, hasProject)} disabled={!hasProject}><span aria-hidden="true">Paleta de color...</span></button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" onClick={runAndClose(onToggleMetaPanelEnabled, hasProject && canToggleMetaPanel)} disabled={!hasProject || !canToggleMetaPanel}>{isMetaPanelEnabled ? '✓ ' : ''}Métricas por periodo</button></li>
            </ul>
          ) : null}
        </div>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('biblioteca')}><span aria-hidden="true">Biblioteca</span></button>
          {openMenu === 'biblioteca' ? (
            <ul id={menuDropdownId('biblioteca')} className={styles.dropdown} role="menu" aria-labelledby={menuTriggerId('biblioteca')} data-menu-dropdown="biblioteca" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('biblioteca')}>
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Nuevo proyecto desde plantilla<span className={styles.caret} aria-hidden="true">▸</span></button></li>
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`} role="none">
                <button type="button" className={styles.dropdownItem} role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpenSubmenu((prev) => (prev === 'biblioteca-maestros' ? null : 'biblioteca-maestros')); }} onKeyDown={submenuTriggerKeyDown('biblioteca', 'biblioteca-maestros')} aria-haspopup="menu" aria-expanded={openSubmenu === 'biblioteca-maestros'} aria-controls={openSubmenu === 'biblioteca-maestros' ? submenuDropdownId('biblioteca-maestros') : undefined} disabled={!hasProject}>Insertar bloques maestros<span className={styles.caret} aria-hidden="true">▸</span></button>
                {openSubmenu === 'biblioteca-maestros' ? <ul id={submenuDropdownId('biblioteca-maestros')} className={styles.submenuList} role="menu" data-submenu-dropdown="biblioteca-maestros" onKeyDown={submenuListKeyDown('biblioteca', 'biblioteca-maestros')}>{['Básico 1', 'Básico 2', 'Básico 3'].map((label) => <li key={label} className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>{label}</button></li>)}</ul> : null}
              </li>
            </ul>
          ) : null}
        </div>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('publicar')}>Publicación</button>
          {openMenu === 'publicar' ? (
            <ul id={menuDropdownId('publicar')} className={styles.dropdown} role="menu" aria-labelledby={menuTriggerId('publicar')} data-menu-dropdown="publicar" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('publicar')}>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Modo Presentación. Vista digital." onClick={runAndClose(onOpenPreview, hasProject)} disabled={!hasProject}><span className={styles.itemPrimary} aria-hidden="true">Modo Presentación</span><span className={styles.itemSecondary} aria-hidden="true">(Vista digital)</span></button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Modo Documento. Vista paginada." onClick={runAndClose(onOpenPrintPreview, hasProject)} disabled={!hasProject}><span className={styles.itemPrimary} aria-hidden="true">Modo Documento</span><span className={styles.itemSecondary} aria-hidden="true">(Vista paginada)</span></button></li>
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Publicar versión actual. Generar captura de la malla." onClick={runAndClose(onOpenPublishModal, hasProject)} disabled={!hasProject}><span className={styles.itemPrimary} aria-hidden="true">Publicar versión actual</span><span className={styles.itemSecondary} aria-hidden="true">(Generar captura de la malla)</span></button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" aria-label="Abrir versión publicada. Cargar malla externa." onClick={openInput(publicationInputRef)}><span className={styles.itemPrimary} aria-hidden="true">Abrir versión publicada...</span><span className={styles.itemSecondary} aria-hidden="true">(Cargar malla externa)</span></button></li>
            </ul>
          ) : null}
        </div>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('editar')}><span aria-hidden="true">Editar</span></button>
          {openMenu === 'editar' ? (
            <ul id={menuDropdownId('editar')} className={styles.dropdown} role="menu" aria-labelledby={menuTriggerId('editar')} data-menu-dropdown="editar" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('editar')}>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" onClick={runAndClose(() => executeCommand('undo'), canUndo)} disabled={!canUndo}>Deshacer</button></li>
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" onClick={runAndClose(() => executeCommand('redo'), canRedo)} disabled={!canRedo}>Rehacer</button></li>
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Buscar...</button></li>
            </ul>
          ) : null}
        </div>
      </div>
      <div className={styles.menuSection}>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('usuarios')}><span aria-hidden="true">Usuarios</span></button>
          {openMenu === 'usuarios' ? <ul id={menuDropdownId('usuarios')} className={`${styles.dropdown} ${styles.dropdownAlignEnd}`} role="menu" aria-labelledby={menuTriggerId('usuarios')} data-menu-dropdown="usuarios" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('usuarios')}><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Settings</button></li><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Cerrar sesión</button></li></ul> : null}
        </div>
        <div className={styles.menuItem}>
          <button type="button" className={styles.menuTrigger} {...triggerProps('ayuda')}><span aria-hidden="true">Ayuda</span></button>
          {openMenu === 'ayuda' ? <ul id={menuDropdownId('ayuda')} className={`${styles.dropdown} ${styles.dropdownAlignEnd}`} role="menu" aria-labelledby={menuTriggerId('ayuda')} data-menu-dropdown="ayuda" onClick={(event) => event.stopPropagation()} onKeyDown={listKeyDown('ayuda')}><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" onClick={runAndClose(onShowIntro)}>Reproducir introducción</button></li><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Documentación</button></li><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Atajos de teclado</button></li><li className={styles.dropdownItemWrapper} role="none"><button type="button" className={styles.dropdownItem} role="menuitem" disabled>Acerca de...</button></li></ul> : null}
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={runAsyncImport(onImportProjectFile)} accept="application/json" className={styles.hiddenInput} />
      <input type="file" ref={publicationInputRef} onChange={runAsyncImport(onImportPublicationFile)} accept="application/json" className={styles.hiddenInput} />
    </div>
  );
}
