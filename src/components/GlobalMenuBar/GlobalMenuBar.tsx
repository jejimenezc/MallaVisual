// src/components/GlobalMenuBar/GlobalMenuBar.tsx
import React, { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import styles from './GlobalMenuBar.module.css';

interface GlobalMenuBarProps {
  onExportProject: () => void;
  hasProject: boolean;
}

type MenuKey = 'archivo' | null;

export function GlobalMenuBar({
  onExportProject,
  hasProject,
}: GlobalMenuBarProps): JSX.Element {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);

  const handleToggleMenu = useCallback((menu: MenuKey) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleClickOutside = () => {
      setOpenMenu(null);
    };
    if (openMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => {
        window.removeEventListener('click', handleClickOutside);
      };
    }
    return undefined;
  }, [openMenu]);

  const handleExportClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      handleCloseMenu();
      if (!hasProject) return;
      onExportProject();
    },
    [handleCloseMenu, hasProject, onExportProject],
  );

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuSection}>
        <div className={styles.menuItem}>
          <button
            type="button"
            className={styles.menuTrigger}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleMenu('archivo');
            }}
          >
            Archivo
          </button>
          {openMenu === 'archivo' && (
            <ul className={styles.dropdown}>
              <li>
                <button type="button" className={styles.dropdownItem} disabled>
                  Nuevo proyecto…
                </button>
              </li>
              <li>
                <button type="button" className={styles.dropdownItem} disabled>
                  Abrir proyecto…
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleExportClick}
                  disabled={!hasProject}
                >
                  Exportar proyecto…
                </button>
              </li>
            </ul>
          )}
        </div>
        <button type="button" className={styles.menuTrigger} disabled>
          Plantillas
        </button>
        <button type="button" className={styles.menuTrigger} disabled>
          Premium
        </button>
        <button type="button" className={styles.menuTrigger} disabled>
          Publicar
        </button>
      </div>
      <div className={styles.menuSection}>
        <button type="button" className={styles.menuTrigger} disabled>
          Usuarios
        </button>
      </div>
    </div>
  );
}