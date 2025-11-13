// src/components/GlobalMenuBar/GlobalMenuBar.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import styles from './GlobalMenuBar.module.css';
import { useAppCommands } from '../../state/app-commands';

interface RecentProject {
  id: string;
  name: string;
  date: string;
}

interface GlobalMenuBarProps {
  hasProject: boolean;
  onNewProject: () => void;
  onImportProjectFile: (file: File) => Promise<void> | void;
  onExportProject: () => void;
  onCloseProject: () => void;
  getRecentProjects: () => RecentProject[];
  onOpenRecentProject: (id: string) => void;
  onShowIntro: () => void;
  onOpenProjectPalette: () => void;
}

type MenuKey =
  | 'archivo'
  | 'proyecto'
  | 'biblioteca'
  | 'publicar'
  | 'editar'
  | 'usuarios'
  | 'ayuda'
  | null;

type SubmenuKey = 'archivo-recientes' | 'biblioteca-plantillas' | 'biblioteca-maestros';

export function GlobalMenuBar({
  hasProject,
  onNewProject,
  onImportProjectFile,
  onExportProject,
  onCloseProject,
  getRecentProjects,
  onOpenRecentProject,
  onShowIntro,
  onOpenProjectPalette,
}: GlobalMenuBarProps): JSX.Element {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKey | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { commands, executeCommand } = useAppCommands();

  const undoCommand = commands.undo;
  const redoCommand = commands.redo;
  const canUndo = Boolean(undoCommand?.isEnabled);
  const canRedo = Boolean(redoCommand?.isEnabled);

  const handleToggleMenu = useCallback((menu: MenuKey) => {
    setOpenSubmenu(null);
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(null);
    setOpenSubmenu(null);
  }, []);

  const handleMenuTriggerClick = useCallback(
    (menu: MenuKey) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      handleToggleMenu(menu);
    },
    [handleToggleMenu],
  );

  const handleSubmenuToggle = useCallback(
    (submenu: SubmenuKey) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setOpenSubmenu((prev) => (prev === submenu ? null : submenu));
    },
    [],
  );

  useEffect(() => {
    if (openMenu !== 'archivo') return;
    setRecentProjects(getRecentProjects().slice(0, 10));
  }, [openMenu, getRecentProjects]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!openMenu) return undefined;
    const handleClickOutside = () => {
      handleCloseMenu();
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenu, handleCloseMenu]);

  const handleNewProject = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      onNewProject();
    },
    [handleCloseMenu, onNewProject],
  );

  const handleOpenProjectFromDisk = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      fileInputRef.current?.click();
    },
    [handleCloseMenu],
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      handleCloseMenu();
      void (async () => {
        try {
          await onImportProjectFile(file);
        } finally {
          event.target.value = '';
        }
      })();
    },
    [handleCloseMenu, onImportProjectFile],
  );

  const handleCloseProject = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      if (!hasProject) return;
      onCloseProject();
    },
    [handleCloseMenu, hasProject, onCloseProject],
  );

  const handleExportProjectClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      if (!hasProject) return;
      onExportProject();
    },
    [handleCloseMenu, hasProject, onExportProject],
  );

  const handleOpenRecent = useCallback(
    (projectId: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      onOpenRecentProject(projectId);
    },
    [handleCloseMenu, onOpenRecentProject],
  );

  const handleUndoClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      if (canUndo) {
        executeCommand('undo');
      }
    },
    [canUndo, executeCommand, handleCloseMenu],
  );

  const handleRedoClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      if (canRedo) {
        executeCommand('redo');
      }
    },
    [canRedo, executeCommand, handleCloseMenu],
  );

  const handleShowIntroClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      onShowIntro();
    },
    [handleCloseMenu, onShowIntro],
  );

  const handleOpenPaletteClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleCloseMenu();
      if (!hasProject) {
        return;
      }
      onOpenProjectPalette();
    },
    [handleCloseMenu, hasProject, onOpenProjectPalette],
  );

  const renderRecentProjects = useMemo(() => {
    if (recentProjects.length === 0) {
      return (
        <li className={styles.dropdownItemWrapper}>
          <span className={styles.dropdownLabelDisabled}>No hay proyectos recientes</span>
        </li>
      );
    }
    return recentProjects.map((project) => (
      <li key={project.id} className={styles.dropdownItemWrapper}>
        <button
          type="button"
          className={styles.dropdownItem}
          onClick={handleOpenRecent(project.id)}
        >
          <span className={styles.itemPrimary}>{project.name}</span>
          <span className={styles.itemSecondary}>
            {(() => {
              const date = new Date(project.date);
              if (Number.isNaN(date.getTime())) return project.date;
              return date.toLocaleString();
            })()}
          </span>
        </button>
      </li>
    ));
  }, [handleOpenRecent, recentProjects]);

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuSection}>
        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('archivo')}
          >
            Archivo
          </button>
          {openMenu === 'archivo' ? (
            <ul
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleNewProject}
                >
                  Nuevo proyecto…
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleOpenProjectFromDisk}
                >
                  Abrir proyecto…
                </button>
              </li>
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleSubmenuToggle('archivo-recientes')}
                >
                  Proyectos recientes
                  <span className={styles.caret}>▸</span>
                </button>
                {openSubmenu === 'archivo-recientes' ? (
                  <ul className={styles.submenuList}>{renderRecentProjects}</ul>
                ) : null}
              </li>
              {hasProject ? (
                <>
                  <li className={styles.dropdownSeparator} aria-hidden="true" />
                  <li className={styles.dropdownItemWrapper}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={handleCloseProject}
                    >
                      Cerrar proyecto
                    </button>
                  </li>
                  <li className={styles.dropdownItemWrapper}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={handleExportProjectClick}
                    >
                      Exportar proyecto…
                    </button>
                  </li>
                </>
              ) : null}
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Preferencias…
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('proyecto')}
          >
            Proyecto
          </button>
          {openMenu === 'proyecto' ? (
            <ul
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Propiedades…
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleOpenPaletteClick}
                  disabled={!hasProject}
                >                  Paleta de color…
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('biblioteca')}
          >
            Biblioteca
          </button>
          {openMenu === 'biblioteca' ? (
            <ul
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Nuevo proyecto desde plantilla
                  <span className={styles.caret}>▸</span>
                </button>
                {openSubmenu === 'biblioteca-plantillas' ? (
                  <ul className={styles.submenuList}>
                    <li className={styles.dropdownItemWrapper}>
                      <button type="button" className={styles.dropdownItem} disabled>
                        Modelo 1
                      </button>
                    </li>
                    <li className={styles.dropdownItemWrapper}>
                      <button type="button" className={styles.dropdownItem} disabled>
                        Modelo 2
                      </button>
                    </li>
                  </ul>
                ) : null}
              </li>
              <li className={`${styles.dropdownItemWrapper} ${styles.hasSubmenu}`}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleSubmenuToggle('biblioteca-maestros')}
                  disabled={!hasProject}
                >
                  Insertar bloques maestros
                  <span className={styles.caret}>▸</span>
                </button>
                {openSubmenu === 'biblioteca-maestros' ? (
                  <ul className={styles.submenuList}>
                    {['Básico 1', 'Básico 2', 'Básico 3'].map((label) => (
                      <li key={label} className={styles.dropdownItemWrapper}>
                        <button type="button" className={styles.dropdownItem} disabled>
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            </ul>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('publicar')}
            disabled={!hasProject}
          >
            Publicar
          </button>
          {openMenu === 'publicar' ? (
            <ul
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Generar PDF
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Generar imagen
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Obtener enlace (HTML)
                </button>
              </li>
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Configuración de salida…
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('editar')}
          >
            Editar
          </button>
          {openMenu === 'editar' ? (
            <ul
              className={styles.dropdown}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleUndoClick}
                  disabled={!canUndo}
                >
                  Deshacer
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleRedoClick}
                  disabled={!canRedo}
                >
                  Rehacer
                </button>
              </li>
              <li className={styles.dropdownSeparator} aria-hidden="true" />
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Buscar…
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>

      <div className={styles.menuSection}>
        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('usuarios')}
          >
            Usuarios
          </button>
          {openMenu === 'usuarios' ? (
            <ul
              className={`${styles.dropdown} ${styles.dropdownAlignEnd}`}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Settings
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Cerrar sesión
                </button>
              </li>
            </ul>
          ) : null}
        </div>

        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={handleMenuTriggerClick('ayuda')}
          >
            Ayuda
          </button>
          {openMenu === 'ayuda' ? (
            <ul
              className={`${styles.dropdown} ${styles.dropdownAlignEnd}`}
              onClick={(event) => event.stopPropagation()}
            >
              <li className={styles.dropdownItemWrapper}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleShowIntroClick}
                >
                  Reproducir introducción
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Documentación
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Atajos de teclado
                </button>
              </li>
              <li className={styles.dropdownItemWrapper}>
                <button type="button" className={styles.dropdownItem} disabled>
                  Acerca de…
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/json"
        className={styles.hiddenInput}
      />
    </div>
  );
}