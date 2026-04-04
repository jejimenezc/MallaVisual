import { useEffect, useRef, type JSX } from 'react';
import { Button } from './Button';
import type {
  PublicationMode,
  PublicationProduct,
} from '../utils/publication-output.ts';
import {
  getPublicationActionButtonLabel,
  type OperationStatus,
} from '../utils/publication-feedback.ts';
import styles from './PublishModal.module.css';

export type PublishOrigin = 'editor' | 'viewer';
export type PublishActionAvailability = 'ready' | 'placeholder';
export type PublishActionKey = PublicationProduct;

interface PublishActionConfig {
  availability: PublishActionAvailability;
  status?: OperationStatus;
  detail?: string;
}

type PublishActions = Record<PublishActionKey, PublishActionConfig>;

interface Props {
  isOpen: boolean;
  origin: PublishOrigin;
  mode: PublicationMode;
  actions: PublishActions;
  onClose: () => void;
  onSelectProduct: (product: PublicationProduct) => Promise<void> | void;
  onGoToPresentation: () => void;
  onGoToDocument: () => void;
}

interface ProductDescriptor {
  key: PublicationProduct;
  title: string;
  description: string;
}

const PRODUCT_COPY: Record<PublicationProduct, ProductDescriptor> = {
  'snapshot-json': {
    key: 'snapshot-json',
    title: 'Respaldo de lectura',
    description: 'Descarga un archivo de datos para volver a abrir esta version especifica en el visor.',
  },
  print: {
    key: 'print',
    title: 'Impresion',
    description: 'Abre el dialogo de impresion con la configuracion documental visible en pantalla.',
  },
  pdf: {
    key: 'pdf',
    title: 'PDF',
    description: 'Prepara un documento paginado para guardarlo como PDF desde el navegador.',
  },
  'html-web': {
    key: 'html-web',
    title: 'Vista online',
    description: 'Abre una publicacion continua en otra pestaña para revision o difusion web.',
  },
  'html-download': {
    key: 'html-download',
    title: 'Archivo web (.html)',
    description: 'Descarga una version HTML autonoma para abrirla sin conexion.',
  },
  'html-paginated': {
    key: 'html-paginated',
    title: 'HTML paginado',
    description: 'Descarga una version web que conserva la division por paginas del modo documento.',
  },
  'html-embed': {
    key: 'html-embed',
    title: 'Codigo para insertar',
    description: 'Descarga una variante simplificada para embeber la malla en otro sitio.',
  },
};

const MODE_SECTIONS: Record<
  PublicationMode,
  {
    title: string;
    subtitle: string;
    sectionTitle: string;
    sectionDescription: string;
    products: PublicationProduct[];
    note: string;
    secondaryLabel: string;
  }
> = {
  presentation: {
    title: 'Publicar web/datos',
    subtitle: 'Genera salidas continuas para compartir en linea o respaldar la informacion visible.',
    sectionTitle: 'Visualizacion y respaldo',
    sectionDescription: 'Opciones pensadas para pantalla, apertura en navegador y respaldo de datos.',
    products: ['html-web', 'html-download', 'html-embed', 'snapshot-json'],
    note: 'Para PDF, impresion o HTML paginado, cambia al modo documento.',
    secondaryLabel: 'Ir al modo documento',
  },
  document: {
    title: 'Publicar documento',
    subtitle: 'Genera salidas paginadas para impresion, PDF o distribucion documental.',
    sectionTitle: 'Formato documento',
    sectionDescription: 'Salidas por pagina con margenes, orientacion y estructura editorial.',
    products: ['pdf', 'html-paginated', 'print'],
    note: 'Si necesitas una visualizacion continua o un respaldo de datos, vuelve al modo presentacion.',
    secondaryLabel: 'Volver al modo presentacion',
  },
};

const STATUS_LABEL: Record<OperationStatus, string> = {
  success: 'Completado',
  idle: '',
  waiting: '',
  running: '',
  error: '',
};

const STATUS_CLASS_BY_KEY: Record<OperationStatus, string> = {
  idle: styles.actionStatusIdle,
  waiting: styles.actionStatusWaiting,
  running: styles.actionStatusRunning,
  success: styles.actionStatusSuccess,
  error: styles.actionStatusError,
};

export function PublishModal({
  isOpen,
  origin,
  mode,
  actions,
  onClose,
  onSelectProduct,
  onGoToPresentation,
  onGoToDocument,
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

  const section = MODE_SECTIONS[mode];
  const isBusy = section.products.some((product) => actions[product].status === 'running');
  const footerSecondaryAction = mode === 'document' ? onGoToPresentation : onGoToDocument;
  const footerNote =
    origin === 'viewer'
      ? 'Las salidas usan el mismo layout que ves en el visor activo.'
      : 'Abre el visor en el modo adecuado si necesitas revisar la salida antes de publicarla.';

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
            {section.title}
          </h2>
          <p className={styles.subtitle} id="publish-modal-description">
            {section.subtitle}
          </p>
        </header>

        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="publish-modal-products-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} id="publish-modal-products-title">
                  {section.sectionTitle}
                </h3>
                <p className={styles.sectionDescription}>{section.sectionDescription}</p>
              </div>
            </div>

            <div className={styles.grid}>
              {section.products.map((product, index) => {
                const descriptor = PRODUCT_COPY[product];
                const action = actions[product];
                const status = action.status ?? 'idle';

                return (
                  <article key={product} className={styles.actionCard}>
                    <div className={styles.actionCardBody}>
                      <h4 className={styles.actionTitle}>{descriptor.title}</h4>
                      <p className={styles.actionDescription}>{descriptor.description}</p>
                      {status === 'success' ? (
                        <p className={`${styles.actionStatus} ${STATUS_CLASS_BY_KEY[status]}`}>
                          {STATUS_LABEL[status]}
                        </p>
                      ) : null}
                      <Button
                        ref={index === 0 ? initialFocusRef : undefined}
                        type="button"
                        variant={index === 0 ? 'primary' : 'default'}
                        aria-busy={status === 'running'}
                        className={status === 'success' ? styles.actionButtonSuccess : undefined}
                        disabled={status === 'running' || action.availability !== 'ready'}
                        onClick={() => void onSelectProduct(product)}
                      >
                        {getPublicationActionButtonLabel(product, status)}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionNote}>{section.note}</p>
          </section>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerNote}>{footerNote}</p>
          <div className={styles.footerActions}>
            <Button type="button" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" variant="secondary" onClick={footerSecondaryAction}>
              {section.secondaryLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
