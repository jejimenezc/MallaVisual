import React from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';
import { useAutosaveInfo } from '../../core/persistence/hooks.ts';
import { ActionPillButton } from '../ActionPillButton/ActionPillButton';
import {
  PUBLICATION_SESSION_LABEL,
  type PublicationSessionMode,
} from '../../types/publication-session.ts';

interface StatusBarProps {
  projectName: string;
  hasProject: boolean;
  schemaVersion: number;
  quickNavLabel?: string | null;
  onQuickNav?: (() => void) | null;
  isActiveProjectOnStandby?: boolean;
  publicationSession: PublicationSessionMode;
  onPublicationSessionChange: (session: PublicationSessionMode) => void;
  isChromeVisible: boolean;
  onToggleChrome: () => void;
}

export function StatusBar({
  projectName,
  hasProject,
  schemaVersion,
  quickNavLabel,
  onQuickNav,
  isActiveProjectOnStandby = false,
  publicationSession,
  onPublicationSessionChange,
  isChromeVisible,
  onToggleChrome,
}: StatusBarProps): JSX.Element {
  const { status, lastSaved } = useAutosaveInfo();
  const timeStr = lastSaved ? new Date(lastSaved).toLocaleTimeString() : '--';

  let statusClass = styles.idle;
  let statusText = 'Guardado';
  if (status === 'saving') {
    statusClass = styles.saving;
    statusText = 'Guardando...';
  } else if (status === 'error') {
    statusClass = styles.error;
    statusText = 'Error al guardar';
  }
  if (isActiveProjectOnStandby) {
    statusClass = styles.standbyStatus;
    statusText = 'En espera';
  }

  const projectDisplayName = hasProject
    ? projectName?.trim().length > 0
      ? projectName
      : 'Sin nombre'
    : 'No hay proyecto activo';

  const statusBarClassName = [
    styles.statusBar,
    isActiveProjectOnStandby ? styles.standby : '',
    hasProject && publicationSession === 'certify' ? styles.certification : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={statusBarClassName}>
      <div className={styles.leftSection}>
        {hasProject ? <span className={styles.projectLabel}>Proyecto activo:</span> : null}
        <span className={styles.projectName}>{projectDisplayName}</span>
        {hasProject ? (
          <>
            <span className={styles.autosaveTime}>{`Auto guardado: ${timeStr}`}</span>
            <span className={`${styles.statusIndicator} ${statusClass}`}>
              <span className={styles.dot} aria-hidden="true">
                *
              </span>
              {statusText}
            </span>
          </>
        ) : null}
        <span className={styles.schemaLabel}>{`schema v${schemaVersion}`}</span>
      </div>
      <div className={styles.centerSection}>
        {hasProject ? (
          <div className={styles.sessionToggle} role="group" aria-label="Sesion de trabajo">
            <span className={styles.sessionLabel}>Sesion:</span>
            <ActionPillButton
              aria-pressed={publicationSession === 'design'}
              className={`${styles.sessionButton} ${publicationSession === 'design' ? styles.sessionButtonActive : ''}`.trim()}
              onClick={() => onPublicationSessionChange('design')}
            >
              {PUBLICATION_SESSION_LABEL.design}
            </ActionPillButton>
            <ActionPillButton
              aria-pressed={publicationSession === 'certify'}
              className={`${styles.sessionButton} ${publicationSession === 'certify' ? styles.sessionButtonActive : ''}`.trim()}
              onClick={() => onPublicationSessionChange('certify')}
            >
              {PUBLICATION_SESSION_LABEL.certify}
            </ActionPillButton>
          </div>
        ) : null}
      </div>
      <div className={styles.rightSection}>
        {quickNavLabel && onQuickNav ? (
          <ActionPillButton onClick={onQuickNav}>{quickNavLabel}</ActionPillButton>
        ) : null}
        <ActionPillButton onClick={onToggleChrome}>
          {isChromeVisible ? 'Ocultar interfaz' : 'Mostrar interfaz'}
        </ActionPillButton>
      </div>
    </div>
  );
}
