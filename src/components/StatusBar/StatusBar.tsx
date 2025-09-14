// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';
import { useAutosaveInfo } from '../../core/persistence/hooks.ts';

interface StatusBarProps {
  projectName: string;
  screenTitle: string;
  schemaVersion: number;
  onExportProject: () => void;
  hasProject: boolean;
}

export function StatusBar({
  projectName,
  screenTitle,
  schemaVersion,
  onExportProject,
  hasProject,
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
    statusText = 'Cambios pendientes';
  }

  return (
    <div className={styles.statusBar}>
      <div className={styles.project}>{`Proyecto activo: ${projectName || 'Sin nombre'} · Auto guardado: ${timeStr}`}</div>
      <div className={styles.screen}>{screenTitle}</div>
      <div className={styles.indicators}>
        <span className={`${styles.status} ${statusClass}`}>
          <span className={styles.dot}>●</span>
          {statusText}
        </span>
        <button
          className={styles.exportButton}
          onClick={onExportProject}
          disabled={!hasProject}
        >
          Exportar proyecto…
        </button>
        <span>{`schema v${schemaVersion}`}</span>
      </div>
    </div>
  );
}