import React, { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';
import { useAutosaveInfo } from '../../core/persistence/hooks.ts';
import { ActionPillButton } from '../ActionPillButton/ActionPillButton';
import type { PublicationSessionMode } from '../../types/publication-session.ts';

interface StatusBarProps {
  projectName: string;
  hasProject: boolean;
  schemaVersion: number;
  quickNavLabel?: string | null;
  onQuickNav?: (() => void) | null;
  isActiveProjectOnStandby?: boolean;
  publicationSession: PublicationSessionMode;
  onPublicationSessionChange: (session: PublicationSessionMode) => void;
  isDesignSessionDisabled?: boolean;
  isChromeVisible: boolean;
  onToggleChrome: () => void;
}

const SESSION_COPY: Record<PublicationSessionMode, string> = {
  design: 'Publicaciones sin registro oficial.',
  certify: '🟢 Certificación activa de publicaciones oficiales.',
};

export function StatusBar({
  projectName,
  hasProject,
  schemaVersion,
  quickNavLabel,
  onQuickNav,
  isActiveProjectOnStandby = false,
  publicationSession,
  onPublicationSessionChange,
  isDesignSessionDisabled = false,
  isChromeVisible,
  onToggleChrome,
}: StatusBarProps): JSX.Element {
  const { status, lastSaved } = useAutosaveInfo();
  const [pendingSession, setPendingSession] = useState<PublicationSessionMode | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const timeStr = lastSaved ? new Date(lastSaved).toLocaleTimeString() : '--';

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current != null) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

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

  const effectiveSession = pendingSession ?? publicationSession;

  const statusBarClassName = [
    styles.statusBar,
    isActiveProjectOnStandby ? styles.standby : '',
    hasProject && effectiveSession === 'certify' && !isActiveProjectOnStandby
      ? styles.certification
      : '',
    pendingSession ? styles.pending : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleSessionChange = (nextSession: PublicationSessionMode) => {
    if (
      pendingSession ||
      nextSession === publicationSession ||
      (nextSession === 'design' && isDesignSessionDisabled)
    ) {
      return;
    }

    setPendingSession(nextSession);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null;
      setPendingSession(null);
      onPublicationSessionChange(nextSession);
    }, 1000);
  };

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
          <div className={styles.sessionPanel}>
            <span className={styles.sessionLegend}>Régimen:</span>
            <div
              className={styles.segmentedControl}
              role="group"
              aria-label="Régimen de publicación"
              aria-busy={pendingSession ? 'true' : 'false'}
            >
              <ActionPillButton
                aria-pressed={effectiveSession === 'design'}
                className={`${styles.segmentButton} ${effectiveSession === 'design' ? styles.segmentButtonActive : ''}`.trim()}
                disabled={pendingSession !== null || isDesignSessionDisabled}
                title={
                  isDesignSessionDisabled
                    ? 'La publicación externa abierta solo admite régimen de certificación'
                    : undefined
                }
                onClick={() => handleSessionChange('design')}
              >
                Diseño
              </ActionPillButton>
              <span className={styles.segmentDivider} aria-hidden="true">
                |
              </span>
              <ActionPillButton
                aria-pressed={effectiveSession === 'certify'}
                className={`${styles.segmentButton} ${effectiveSession === 'certify' ? styles.segmentButtonActive : ''}`.trim()}
                disabled={pendingSession !== null}
                onClick={() => handleSessionChange('certify')}
              >
                Certificación
              </ActionPillButton>
            </div>
            <div className={styles.sessionMetaRow}>
              <span className={styles.sessionCopy}>{SESSION_COPY[effectiveSession]}</span>
              {pendingSession ? (
                <span className={styles.sessionPendingText}>Preparando cambio de régimen...</span>
              ) : null}
            </div>
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
