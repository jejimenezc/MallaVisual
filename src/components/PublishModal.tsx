import React, { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Button } from './Button';
import styles from './PublishModal.module.css';

export type PublishOrigin = 'editor' | 'viewer';
export type PublishActionAvailability = 'ready' | 'placeholder';
export type PublishActionKey = 'json' | 'pdf' | 'html';

interface PublishActionConfig {
  availability: PublishActionAvailability;
  isRunning?: boolean;
}

interface PublishActions {
  json: PublishActionConfig;
  pdf: PublishActionConfig;
  html: PublishActionConfig;
}

interface Props {
  isOpen: boolean;
  origin: PublishOrigin;
  actions: PublishActions;
  onClose: () => void;
  onDownloadJson: () => Promise<void> | void;
  onDownloadPdf: () => Promise<void> | void;
  onDownloadHtml: () => Promise<void> | void;
  onGoToEditor: () => void;
  onGoToViewer: () => void;
}

const ACTION_TOOLTIPS: Record<PublishActionKey, string> = {
  json: 'Guarda el archivo para volver a editarlo o cargarlo en esta aplicacion.',
  pdf: 'Abre el flujo de exportacion PDF usando la salida imprimible de esta version.',
  html: 'Genera un viewer standalone, limpio y listo para abrir fuera de la app.',
};

export function PublishModal({
  isOpen,
  origin,
  actions,
  onClose,
  onDownloadJson,
  onDownloadPdf,
  onDownloadHtml,
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

  const footerSecondaryLabel = origin === 'viewer' ? 'Ir al editor' : 'Ver en modo Presentacion';
  const footerSecondaryAction = origin === 'viewer' ? onGoToEditor : onGoToViewer;
  const footerNote =
    origin === 'viewer'
      ? 'Desde aqui puedes exportar esta version o volver al editor para seguir ajustandola.'
      : 'Puedes revisar la salida en el viewer antes de exportarla.';

  const runAction =
    (handler: () => Promise<void> | void, availability: PublishActionAvailability) =>
    () => {
      void handler();
      if (availability === 'placeholder') return;
    };

  const isBusy = Boolean(actions.json.isRunning || actions.pdf.isRunning || actions.html.isRunning);

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
            Exportar version
          </h2>
          <p className={styles.subtitle} id="publish-modal-description">
            Elige que salida quieres generar para esta version consolidada.
          </p>
        </header>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="publish-modal-web-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-web-title">
                  Viewer Standalone
                </h3>
                <p className={styles.sectionDescription}>
                  Exporta una publicacion HTML autonoma, sin shell ni controles del editor.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <article className={styles.actionCard}>
                <Button
                  type="button"
                  variant="primary"
                  title={ACTION_TOOLTIPS.html}
                  aria-busy={actions.html.isRunning}
                  disabled={actions.html.isRunning}
                  onClick={runAction(onDownloadHtml, actions.html.availability)}
                >
                  {actions.html.isRunning ? 'Generando...' : 'Descargar Viewer (.html)'}
                </Button>
              </article>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="publish-modal-files-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-files-title">
                  Formatos de Archivo
                </h3>
                <p className={styles.sectionDescription}>
                  Exporta esta version para respaldo, archivo o distribucion fuera de la app.
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
                  disabled={actions.pdf.isRunning}
                  onClick={runAction(onDownloadPdf, actions.pdf.availability)}
                >
                  {actions.pdf.isRunning ? 'Preparando...' : 'Exportar PDF'}
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
