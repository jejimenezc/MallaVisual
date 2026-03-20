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
    title: 'Respaldo de Lectura',
    description: 'Descarga un archivo de datos para volver a cargar esta versión específica en el visor de la aplicación.',
    label: 'Descargar respaldo',
  },
  print: {
    key: 'print',
    title: 'Impresión',
    description: 'Envía el documento directamente a la impresora o al gestor de impresión de tu equipo.',
    label: 'Imprimir ahora',
  },
  pdf: {
    key: 'pdf',
    title: 'PDF',
    description: 'Crea un documento PDF fiel a la previsualización, con márgenes y numeración de páginas.',
    label: 'Exportar PDF',
  },
  'html-web': {
    key: 'html-web',
    title: 'Vista Online',
    description: 'Enlace para visualizar la malla en el navegador, con el diseño editorial activo.',
    label: 'Abrir vista online',
  },
  'html-download': {
    key: 'html-download',
    title: 'Archivo Web (.html)',
    description: 'Descarga la versión para abrirla en cualquier navegador sin necesidad de internet.',
    label: 'Descargar archivo web',
  },
  'html-paginated': {
    key: 'html-paginated',
    title: 'HTML Paginado',
    description: 'Versión web que respeta la división por hojas, idéntica al formato impreso.',
    label: 'Descargar HTML paginado',
  },
  'html-embed': {
    key: 'html-embed',
    title: 'Código para Insertar',
    description: 'Versión simplificada para integrar la malla dentro de otra página web o plataforma institucional.',
    label: 'Descargar código',
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
    title: 'Publicar Web/Datos',
    subtitle: 'Genera formatos de visualización continua para compartir en línea o respaldar información.',
    sectionTitle: 'Visualización y respaldo',
    sectionDescription: 'Opciones pensadas para pantallas, navegación continua y respaldo de datos.',
    products: ['html-web', 'html-download', 'html-embed', 'snapshot-json'],
    note: 'Para PDF, impresión o HTML paginado, cambia al Modo Documento.',
    secondaryLabel: 'Ir al Modo Documento',
  },
  document: {
    title: 'Publicar Documento',
    subtitle: 'Genera archivos estructurados en páginas, ideales para impresión o envío de documentos oficiales.',
    sectionTitle: 'Formato documento',
    sectionDescription: 'Salidas organizadas por páginas, con márgenes, orientación y estructura editorial.',
    products: ['pdf', 'html-paginated', 'print'],
    note: 'Si necesitas una visualización continua o un respaldo de datos, vuelve al Modo Presentación.',
    secondaryLabel: 'Volver al Modo Presentación',
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
      ? 'Los archivos generados mantienen exactamente el diseño y la organización que ves en pantalla.'
      : 'Abre el visor en el modo adecuado si necesitas revisar visualmente la salida antes de publicarla.';

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
