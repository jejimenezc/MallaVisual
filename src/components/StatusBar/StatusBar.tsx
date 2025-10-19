// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';
import { useAutosaveInfo } from '../../core/persistence/hooks.ts';
import { ActionPillButton } from '../ActionPillButton/ActionPillButton';

interface StatusBarProps {
  projectName: string;
  hasProject: boolean;
  schemaVersion: number;
  quickNavLabel?: string | null;
  onQuickNav?: (() => void) | null;
  isChromeVisible: boolean;
  onToggleChrome: () => void;
}

export function StatusBar({
  projectName,
  hasProject,
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

  const projectDisplayName = hasProject
    ? projectName?.trim().length > 0
      ? projectName
      : 'Sin nombre'
    : 'No hay proyecto activo';

  return (
    <div className={styles.statusBar}>
      <div className={styles.leftSection}>
        {hasProject ? (
          <span className={styles.projectLabel}>Proyecto activo:</span>
        ) : null}
        <span className={styles.projectName}>{projectDisplayName}</span>
        {hasProject ? (
          <span className={styles.autosaveTime}>{`Auto guardado: ${timeStr}`}</span>
        ) : null}
      </div>
      <div className={styles.centerSection}>
        {hasProject ? (
          <span className={`${styles.statusIndicator} ${statusClass}`}>
            <span className={styles.dot} aria-hidden="true">
              ●
            </span>
            {statusText}
          </span>
        ) : null}
        <span className={styles.schemaLabel}>{`schema v${schemaVersion}`}</span>
      </div>
      <div className={styles.rightSection}>
        {quickNavLabel && onQuickNav ? (
          <ActionPillButton onClick={onQuickNav}>
            {quickNavLabel}
          </ActionPillButton>
        ) : null}
        <ActionPillButton onClick={onToggleChrome}>
          {isChromeVisible ? 'Ocultar interfaz' : 'Mostrar interfaz'}
        </ActionPillButton>
      </div>
    </div>
  );
}