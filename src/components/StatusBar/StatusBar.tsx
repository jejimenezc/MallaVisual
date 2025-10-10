// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';
import { useAutosaveInfo } from '../../core/persistence/hooks.ts';

interface StatusBarProps {
  projectName: string;
  schemaVersion: number;
  quickNavLabel?: string | null;
  onQuickNav?: (() => void) | null;
  isChromeVisible: boolean;
  onToggleChrome: () => void;
}

export function StatusBar({
  projectName,
  schemaVersion,
  quickNavLabel,
  onQuickNav,
  isChromeVisible,
  onToggleChrome,
}: StatusBarProps): JSX.Element {
  const { status, lastSaved } = useAutosaveInfo();
  const timeStr = lastSaved ? new Date(lastSaved).toLocaleTimeString() : '—';

  let statusClass = styles.idle;
  let statusText = 'Guardado';
  if (status === 'saving') {
    statusClass = styles.saving;
    statusText = 'Guardando…';
  } else if (status === 'error') {
    statusClass = styles.error;
    statusText = 'Error al guardar';
  }

  return (
    <div className={styles.statusBar}>
      <div className={styles.leftSection}>
        <span className={styles.projectLabel}>Proyecto activo:</span>
        <span className={styles.projectName}>{projectName || 'Sin nombre'}</span>
        <span className={styles.autosaveTime}>{`Auto guardado: ${timeStr}`}</span>
      </div>
      <div className={styles.centerSection}>
        <span className={`${styles.statusIndicator} ${statusClass}`}>
          <span className={styles.dot} aria-hidden="true">
            ●
          </span>
          {statusText}
        </span>
        <span className={styles.schemaLabel}>{`schema v${schemaVersion}`}</span>
      </div>
      <div className={styles.rightSection}>
        {quickNavLabel && onQuickNav ? (
          <button type="button" className={styles.quickNavButton} onClick={onQuickNav}>
            {quickNavLabel}
          </button>
        ) : null}
        <button type="button" className={styles.chromeToggle} onClick={onToggleChrome}>
          {isChromeVisible ? 'Ocultar interfaz' : 'Mostrar interfaz'}
        </button>
      </div>
    </div>
  );
}