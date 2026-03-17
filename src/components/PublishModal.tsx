import React, { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Button } from './Button';
import styles from './PublishModal.module.css';

export type PublishOrigin = 'editor' | 'viewer';
export type PublishActionAvailability = 'ready' | 'placeholder';
export type PublishActionKey = 'json' | 'pdf' | 'openWeb' | 'copyLink';

interface PublishActionConfig {
  availability: PublishActionAvailability;
  isRunning?: boolean;
}

interface PublishActions {
  json: PublishActionConfig;
  pdf: PublishActionConfig;
  openWeb: PublishActionConfig;
  copyLink: PublishActionConfig;
}

interface Props {
  isOpen: boolean;
  origin: PublishOrigin;
  actions: PublishActions;
  onClose: () => void;
  onDownloadJson: () => Promise<void> | void;
  onDownloadPdf: () => Promise<void> | void;
  onOpenPublishedVersion: () => Promise<void> | void;
  onCopyLink: () => Promise<void> | void;
  onGoToEditor: () => void;
  onGoToViewer: () => void;
}

const ACTION_TOOLTIPS: Record<PublishActionKey, string> = {
  json: 'Guarda el archivo para volver a editarlo o cargarlo en esta aplicación.',
  pdf: 'Prepara una salida estática para archivar, imprimir o distribuir fuera de la app.',
  openWeb: 'Abre la versión publicada en una pestaña para revisar o compartir.',
  copyLink: 'Copia la URL pública para reutilizarla donde necesites.',
};

const SHARED_SECTION_NOTE = 'Cualquier persona con el enlace podrá ver la versión consolidada.';

export function PublishModal({
  isOpen,
  origin,
  actions,
  onClose,
  onDownloadJson,
  onDownloadPdf,
  onOpenPublishedVersion,
  onCopyLink,
  onGoToEditor,
  onGoToViewer,
}: Props): JSX.Element | null {
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    initialFocusRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const footerSecondaryLabel = origin === 'viewer' ? 'Ir al editor' : 'Ver en modo Presentación';
  const footerSecondaryAction = origin === 'viewer' ? onGoToEditor : onGoToViewer;
  const footerNote =
    origin === 'viewer'
      ? 'Desde aquí puedes exportar esta versión o volver al editor para seguir ajustándola.'
      : 'Puedes revisar la salida en el viewer antes de compartir o exportar esta versión.';

  const runAction =
    (handler: () => Promise<void> | void, availability: PublishActionAvailability) =>
    () => {
      void handler();
      if (availability === 'placeholder') return;
    };

  const isBusy = Boolean(
    actions.json.isRunning ||
      actions.pdf.isRunning ||
      actions.openWeb.isRunning ||
      actions.copyLink.isRunning,
  );

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        aria-describedby="publish-modal-description"
        aria-busy={isBusy}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id="publish-modal-title">
            Publicar versión
          </h2>
          <p className={styles.subtitle} id="publish-modal-description">
            Elige qué salida quieres generar para esta versión consolidada.
          </p>
        </header>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="publish-modal-web-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-web-title">
                  Publicación Web
                </h3>
                <p className={styles.sectionDescription}>
                  Comparte una versión consolidada para visualización online.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <article className={styles.actionCard}>
                <Button
                  type="button"
                  variant="primary"
                  title={ACTION_TOOLTIPS.openWeb}
                  aria-busy={actions.openWeb.isRunning}
                  aria-disabled={actions.openWeb.availability === 'placeholder'}
                  disabled={actions.openWeb.isRunning}
                  onClick={runAction(onOpenPublishedVersion, actions.openWeb.availability)}
                >
                  {actions.openWeb.isRunning ? 'Abriendo...' : 'Abrir en Navegador'}
                </Button>
              </article>

              <article className={styles.actionCard}>
                <Button
                  type="button"
                  title={ACTION_TOOLTIPS.copyLink}
                  aria-busy={actions.copyLink.isRunning}
                  aria-disabled={actions.copyLink.availability === 'placeholder'}
                  disabled={actions.copyLink.isRunning}
                  onClick={runAction(onCopyLink, actions.copyLink.availability)}
                >
                  {actions.copyLink.isRunning ? 'Copiando...' : 'Copiar Enlace'}
                </Button>
              </article>
            </div>

            <p className={styles.sectionNote}>{SHARED_SECTION_NOTE}</p>
          </section>

          <section className={styles.section} aria-labelledby="publish-modal-files-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-files-title">
                  Formatos de Archivo
                </h3>
                <p className={styles.sectionDescription}>
                  Exporta esta versión para respaldo, archivo o impresión.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <article className={styles.actionCard}>
                <Button
                  ref={initialFocusRef}
                  type="button"
                  variant="primary"
                  title={ACTION_TOOLTIPS.json}
                  aria-busy={actions.json.isRunning}
                  disabled={actions.json.isRunning}
                  onClick={runAction(onDownloadJson, actions.json.availability)}
                >
                  {actions.json.isRunning ? 'Descargando...' : 'Descargar Respaldo (.json)'}
                </Button>
              </article>

              <article className={styles.actionCard}>
                <Button
                  type="button"
                  title={ACTION_TOOLTIPS.pdf}
                  aria-busy={actions.pdf.isRunning}
                  aria-disabled={actions.pdf.availability === 'placeholder'}
                  disabled={actions.pdf.isRunning}
                  onClick={runAction(onDownloadPdf, actions.pdf.availability)}
                >
                  {actions.pdf.isRunning ? 'Generando...' : 'Generar Archivo (.pdf)'}
                </Button>
              </article>
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerNote}>{footerNote}</p>
          <div className={styles.footerActions}>
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" variant="secondary" onClick={footerSecondaryAction}>
              {footerSecondaryLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
