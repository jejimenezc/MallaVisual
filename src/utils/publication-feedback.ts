import type { PublicationSessionMode } from '../types/publication-session.ts';
import type { PublicationProduct } from './publication-output.ts';

export type OperationStatus = 'idle' | 'waiting' | 'running' | 'success' | 'error';
export type PublicationOperationKey = PublicationProduct | 'import-publication';

export interface PublicationOperationState {
  key: PublicationOperationKey;
  status: OperationStatus;
  message: string;
  detail?: string;
}

export interface PublicationActionCopy {
  idleLabel: string;
  runningLabel: string;
  waitingLabel?: string;
  successLabel: string;
  errorLabel: string;
  statusDetail: string;
  tooltip: string;
}

export const PUBLICATION_ACTION_COPY: Record<PublicationProduct, PublicationActionCopy> = {
  'snapshot-json': {
    idleLabel: 'Descargar respaldo',
    runningLabel: 'Generando respaldo...',
    successLabel: 'Respaldo descargado',
    errorLabel: 'Reintentar respaldo',
    statusDetail: 'Genera un archivo JSON para reabrir exactamente esta version publicada en el visor.',
    tooltip: 'Descarga un snapshot JSON para respaldo o revision posterior en la app.',
  },
  pdf: {
    idleLabel: 'Exportar PDF',
    runningLabel: 'Preparando PDF...',
    waitingLabel: 'Continuar en el navegador',
    successLabel: 'PDF listo',
    errorLabel: 'Reintentar PDF',
    statusDetail: 'Abre la salida documental para guardar como PDF desde el navegador, manteniendo la paginacion activa.',
    tooltip: 'Prepara la salida documental y delega el guardado final al navegador o impresora PDF.',
  },
  print: {
    idleLabel: 'Imprimir ahora',
    runningLabel: 'Preparando impresion...',
    waitingLabel: 'Esperando confirmacion',
    successLabel: 'Impresion iniciada',
    errorLabel: 'Reintentar impresion',
    statusDetail: 'Abre el dialogo de impresion con el mismo layout paginado validado en la vista documento.',
    tooltip: 'Abre el dialogo de impresion del navegador usando la configuracion documental visible.',
  },
  'html-web': {
    idleLabel: 'Abrir vista online',
    runningLabel: 'Generando vista...',
    successLabel: 'Vista abierta',
    errorLabel: 'Reintentar vista',
    statusDetail: 'Genera una vista continua y la abre en otra pestana para revision o publicacion web.',
    tooltip: 'Abre una vista HTML continua en otra pestana, util para revisar la publicacion web.',
  },
  'html-download': {
    idleLabel: 'Descargar archivo web',
    runningLabel: 'Generando HTML...',
    successLabel: 'HTML descargado',
    errorLabel: 'Reintentar HTML',
    statusDetail: 'Descarga una version HTML autonoma para abrirla sin conexion en cualquier navegador.',
    tooltip: 'Descarga un HTML autonomo con la apariencia actual de publicacion.',
  },
  'html-paginated': {
    idleLabel: 'Descargar HTML paginado',
    runningLabel: 'Generando HTML paginado...',
    successLabel: 'HTML paginado descargado',
    errorLabel: 'Reintentar HTML paginado',
    statusDetail: 'Descarga una version HTML que conserva la division por paginas del modo documento.',
    tooltip: 'Descarga un HTML paginado alineado con la vista documento y el print preview.',
  },
  'html-embed': {
    idleLabel: 'Descargar codigo',
    runningLabel: 'Generando codigo...',
    successLabel: 'Codigo descargado',
    errorLabel: 'Reintentar codigo',
    statusDetail: 'Descarga un HTML simplificado para embeber la malla en otro sitio o plataforma.',
    tooltip: 'Descarga una version simplificada para insercion web sin ornamentos editoriales.',
  },
};

const CERTIFICATION_IDLE_LABEL: Partial<Record<PublicationProduct, string>> = {
  'snapshot-json': 'Emitir acta certificada',
  pdf: 'Emitir PDF',
  print: 'Emitir impresion',
  'html-web': 'Emitir vista online',
  'html-download': 'Emitir archivo web',
  'html-paginated': 'Emitir HTML paginado',
  'html-embed': 'Emitir codigo',
};

export const getPublicationActionCopy = (
  product: PublicationProduct,
  session: PublicationSessionMode = 'design',
): PublicationActionCopy => {
  const baseCopy = PUBLICATION_ACTION_COPY[product];
  if (session !== 'certify') {
    return baseCopy;
  }

  const certificationIdleLabel = CERTIFICATION_IDLE_LABEL[product];
  if (!certificationIdleLabel) {
    return baseCopy;
  }

  return {
    ...baseCopy,
    idleLabel: certificationIdleLabel,
  };
};

export const getPublicationActionButtonLabel = (
  product: PublicationProduct,
  status: OperationStatus,
  session: PublicationSessionMode = 'design',
): string => {
  const copy = getPublicationActionCopy(product, session);
  if (status === 'success') return 'OK';
  return copy.idleLabel;
};
