import type { PublicationProduct } from './publication-output.ts';

export type OperationStatus = 'idle' | 'waiting' | 'running' | 'success' | 'error';
export type PublicationOperationKey = PublicationProduct | 'import-publication';

export interface PublicationOperationState {
  key: PublicationOperationKey;
  status: OperationStatus;
  message: string;
  detail?: string;
}

interface PublicationActionCopy {
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
    statusDetail: 'Genera un archivo JSON para reabrir exactamente esta versión publicada en el visor.',
    tooltip: 'Descarga un snapshot JSON para respaldo o revisión posterior en la app.',
  },
  pdf: {
    idleLabel: 'Exportar PDF',
    runningLabel: 'Preparando PDF...',
    waitingLabel: 'Continuar en el navegador',
    successLabel: 'PDF listo',
    errorLabel: 'Reintentar PDF',
    statusDetail: 'Abre la salida documental para guardar como PDF desde el navegador, manteniendo la paginación activa.',
    tooltip: 'Prepara la salida documental y delega el guardado final al navegador o impresora PDF.',
  },
  print: {
    idleLabel: 'Imprimir ahora',
    runningLabel: 'Preparando impresión...',
    waitingLabel: 'Esperando confirmación',
    successLabel: 'Impresión iniciada',
    errorLabel: 'Reintentar impresión',
    statusDetail: 'Abre el diálogo de impresión con el mismo layout paginado validado en la vista documento.',
    tooltip: 'Abre el diálogo de impresión del navegador usando la configuración documental visible.',
  },
  'html-web': {
    idleLabel: 'Abrir vista online',
    runningLabel: 'Generando vista...',
    successLabel: 'Vista abierta',
    errorLabel: 'Reintentar vista',
    statusDetail: 'Genera una vista continua y la abre en otra pestaña para revisión o publicación web.',
    tooltip: 'Abre una vista HTML continua en otra pestaña, útil para revisar la publicación web.',
  },
  'html-download': {
    idleLabel: 'Descargar archivo web',
    runningLabel: 'Generando HTML...',
    successLabel: 'HTML descargado',
    errorLabel: 'Reintentar HTML',
    statusDetail: 'Descarga una versión HTML autónoma para abrirla sin conexión en cualquier navegador.',
    tooltip: 'Descarga un HTML autónomo con la apariencia actual de publicación.',
  },
  'html-paginated': {
    idleLabel: 'Descargar HTML paginado',
    runningLabel: 'Generando HTML paginado...',
    successLabel: 'HTML paginado descargado',
    errorLabel: 'Reintentar HTML paginado',
    statusDetail: 'Descarga una versión HTML que conserva la división por páginas del modo documento.',
    tooltip: 'Descarga un HTML paginado alineado con la vista documento y el print preview.',
  },
  'html-embed': {
    idleLabel: 'Descargar código',
    runningLabel: 'Generando código...',
    successLabel: 'Código descargado',
    errorLabel: 'Reintentar código',
    statusDetail: 'Descarga un HTML simplificado para embeber la malla en otro sitio o plataforma.',
    tooltip: 'Descarga una versión simplificada para inserción web sin ornamentos editoriales.',
  },
};

export const getPublicationActionButtonLabel = (
  product: PublicationProduct,
  status: OperationStatus,
): string => {
  const copy = PUBLICATION_ACTION_COPY[product];
  if (status === 'success') return '✓';
  return copy.idleLabel;
};
