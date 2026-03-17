import React, { useEffect, useMemo, useRef } from 'react';
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
  json: 'Guarda el archivo para volver a editarlo o cargarlo en esta aplicacion.',
  pdf: 'Formato estatico ideal para archivar o imprimir.',
  openWeb: 'Genera una URL para visualizacion online.',
  copyLink: 'Genera una URL para visualizacion online.',
};

const SECTION_STATUS_LABEL: Record<PublishActionAvailability, string> = {
  ready: 'Disponible',
  placeholder: 'Proximamente',
};

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

  const webSectionStatus = useMemo<PublishActionAvailability>(() => {
    return actions.openWeb.availability === 'ready' || actions.copyLink.availability === 'ready'
      ? 'ready'
      : 'placeholder';
  }, [actions.copyLink.availability, actions.openWeb.availability]);

  const fileSectionStatus = useMemo<PublishActionAvailability>(() => {
    return actions.json.availability === 'ready' || actions.pdf.availability === 'ready'
      ? 'ready'
      : 'placeholder';
  }, [actions.json.availability, actions.pdf.availability]);

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
      : 'Puedes revisar la salida en el viewer antes de compartir o exportar esta version.';

  const runAction =
    (handler: () => Promise<void> | void, availability: PublishActionAvailability) =>
    () => {
      void handler();
      if (availability === 'placeholder') return;
    };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        aria-describedby="publish-modal-description"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title} id="publish-modal-title">
            Publicar version
          </h2>
          <p className={styles.subtitle} id="publish-modal-description">
            Elige explicitamente que salida quieres generar para esta version consolidada.
          </p>
        </header>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="publish-modal-web-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-web-title">
                  Publicacion Web
                </h3>
                <p className={styles.sectionDescription}>
                  Comparte una version consolidada para visualizacion online.
                </p>
              </div>
              <span className={styles.status}>{SECTION_STATUS_LABEL[webSectionStatus]}</span>
            </div>

            <div className={styles.grid}>
              <article className={styles.actionCard}>
                <div className={styles.actionHeader}>
                  <h4 className={styles.actionTitle}>Abrir en Navegador</h4>
                  {actions.openWeb.availability === 'placeholder' ? (
                    <span className={styles.status}>Proximamente</span>
                  ) : null}
                </div>
                <p className={styles.actionDescription}>
                  Abre la version publicada en una pestana para revisar o compartir.
                </p>
                <p className={styles.helper}>
                  Cualquier persona con el enlace podra ver la version consolidada.
                </p>
                <div className={styles.buttonRow}>
                  <Button
                    type="button"
                    variant="primary"
                    title={ACTION_TOOLTIPS.openWeb}
                    aria-disabled={actions.openWeb.availability === 'placeholder'}
                    disabled={actions.openWeb.isRunning}
                    onClick={runAction(onOpenPublishedVersion, actions.openWeb.availability)}
                  >
                    {actions.openWeb.isRunning ? 'Abriendo...' : 'Abrir en Navegador'}
                  </Button>
                </div>
              </article>

              <article className={styles.actionCard}>
                <div className={styles.actionHeader}>
                  <h4 className={styles.actionTitle}>Copiar Enlace</h4>
                  {actions.copyLink.availability === 'placeholder' ? (
                    <span className={styles.status}>Proximamente</span>
                  ) : null}
                </div>
                <p className={styles.actionDescription}>
                  Copia la URL publica para reutilizarla donde necesites.
                </p>
                <p className={styles.helper}>
                  Usa esta accion cuando la version online ya tenga una direccion disponible.
                </p>
                <div className={styles.buttonRow}>
                  <Button
                    type="button"
                    title={ACTION_TOOLTIPS.copyLink}
                    aria-disabled={actions.copyLink.availability === 'placeholder'}
                    disabled={actions.copyLink.isRunning}
                    onClick={runAction(onCopyLink, actions.copyLink.availability)}
                  >
                    {actions.copyLink.isRunning ? 'Copiando...' : 'Copiar Enlace'}
                  </Button>
                </div>
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
                  Exporta esta version para respaldo, archivo o impresion.
                </p>
              </div>
              <span className={styles.status}>{SECTION_STATUS_LABEL[fileSectionStatus]}</span>
            </div>

            <div className={styles.grid}>
              <article className={styles.actionCard}>
                <div className={styles.actionHeader}>
                  <h4 className={styles.actionTitle}>Descargar Respaldo (.json)</h4>
                </div>
                <p className={styles.actionDescription}>
                  Genera el snapshot consolidado y abre el guardado solo despues de tu click.
                </p>
                <p className={styles.helper}>{ACTION_TOOLTIPS.json}</p>
                <div className={styles.buttonRow}>
                  <Button
                    ref={initialFocusRef}
                    type="button"
                    variant="primary"
                    title={ACTION_TOOLTIPS.json}
                    disabled={actions.json.isRunning}
                    onClick={runAction(onDownloadJson, actions.json.availability)}
                  >
                    {actions.json.isRunning ? 'Descargando...' : 'Descargar Respaldo (.json)'}
                  </Button>
                </div>
              </article>

              <article className={styles.actionCard}>
                <div className={styles.actionHeader}>
                  <h4 className={styles.actionTitle}>Generar Documento (.pdf)</h4>
                  {actions.pdf.availability === 'placeholder' ? (
                    <span className={styles.status}>Proximamente</span>
                  ) : null}
                </div>
                <p className={styles.actionDescription}>
                  Prepara una salida estatica para archivar, imprimir o distribuir fuera de la app.
                </p>
                <p className={styles.helper}>{ACTION_TOOLTIPS.pdf}</p>
                <div className={styles.buttonRow}>
                  <Button
                    type="button"
                    title={ACTION_TOOLTIPS.pdf}
                    aria-disabled={actions.pdf.availability === 'placeholder'}
                    disabled={actions.pdf.isRunning}
                    onClick={runAction(onDownloadPdf, actions.pdf.availability)}
                  >
                    {actions.pdf.isRunning ? 'Generando...' : 'Generar Documento (.pdf)'}
                  </Button>
                </div>
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
