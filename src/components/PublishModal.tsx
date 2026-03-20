import { useEffect, useRef, type JSX } from 'react';
import { Button } from './Button';
import type {
  PublicationMode,
  PublicationProduct,
} from '../utils/publication-output.ts';
import styles from './PublishModal.module.css';

export type PublishOrigin = 'editor' | 'viewer';
export type PublishActionAvailability = 'ready' | 'placeholder';
export type PublishActionKey = PublicationProduct;

interface PublishActionConfig {
  availability: PublishActionAvailability;
  isRunning?: boolean;
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
  label: string;
}

const PRODUCT_COPY: Record<PublicationProduct, ProductDescriptor> = {
  'snapshot-json': {
    key: 'snapshot-json',
    title: 'Snapshot JSON',
    description: 'Descarga la version publicada como archivo JSON para volver a abrirla en el viewer.',
    label: 'Descargar snapshot',
  },
  print: {
    key: 'print',
    title: 'Impresion',
    description: 'Abre la salida documental actual en el flujo de impresion del navegador.',
    label: 'Imprimir ahora',
  },
  pdf: {
    key: 'pdf',
    title: 'PDF',
    description: 'Usa el documento visible como fuente de verdad para generar un PDF.',
    label: 'Exportar PDF',
  },
  'html-web': {
    key: 'html-web',
    title: 'HTML web',
    description: 'Version continua para pantalla, con marco editorial minimo si esta activado.',
    label: 'Abrir HTML web',
  },
  'html-download': {
    key: 'html-download',
    title: 'HTML download',
    description: 'Descarga la version web continua como archivo HTML autonomo.',
    label: 'Descargar HTML',
  },
  'html-paginated': {
    key: 'html-paginated',
    title: 'HTML paginado',
    description: 'Espejo documental del PDF, respetando paginas, margenes y cortes.',
    label: 'Descargar HTML paginado',
  },
  'html-embed': {
    key: 'html-embed',
    title: 'HTML embed',
    description: 'Version minima para incrustar la malla en otro sitio, sin linea editorial.',
    label: 'Descargar HTML embed',
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
    title: 'Publicar version actual',
    subtitle: 'Este modo publica productos web continuos, alineados con la vista de presentacion.',
    sectionTitle: 'Formato web',
    sectionDescription: 'Salidas continuas y no paginadas, optimizadas para pantallas o incrustacion.',
    products: ['html-web', 'html-download', 'html-embed', 'snapshot-json'],
    note: 'Para PDF, impresion o HTML paginado, cambia a Modo Documento.',
    secondaryLabel: 'Ir a Modo Documento',
  },
  document: {
    title: 'Publicar documento',
    subtitle: 'Este modo publica productos documentales alineados con la previsualizacion paginada.',
    sectionTitle: 'Formato documento',
    sectionDescription: 'Salidas con margenes, orientacion, paginacion y linea editorial documental.',
    products: ['pdf', 'html-paginated', 'print'],
    note: 'Si necesitas una version web continua, vuelve a Modo Presentacion.',
    secondaryLabel: 'Volver a Modo Presentacion',
  },
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
  const isBusy = section.products.some((product) => actions[product].isRunning);
  const footerSecondaryAction = mode === 'document' ? onGoToPresentation : onGoToDocument;
  const footerNote =
    origin === 'viewer'
      ? 'Las salidas disponibles respetan el modo activo para mantener el WYSIWYG por familia de producto.'
      : 'Abre el viewer en el modo adecuado si necesitas revisar visualmente la salida antes de publicarla.';

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
                return (
                  <article key={product} className={styles.actionCard}>
                    <div className={styles.actionCardBody}>
                      <h4 className={styles.actionTitle}>{descriptor.title}</h4>
                      <p className={styles.actionDescription}>{descriptor.description}</p>
                      <Button
                        ref={index === 0 ? initialFocusRef : undefined}
                        type="button"
                        variant={index === 0 ? 'primary' : 'default'}
                        aria-busy={action.isRunning}
                        disabled={action.isRunning || action.availability !== 'ready'}
                        onClick={() => void onSelectProduct(product)}
                      >
                        {action.isRunning ? 'Procesando...' : descriptor.label}
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
