export type PublicationSessionMode = 'design' | 'certify';

export const PUBLICATION_SESSION_LABEL: Record<PublicationSessionMode, string> = {
  design: 'Disenar',
  certify: 'Certificar',
};

export const PUBLICATION_SESSION_BADGE: Record<PublicationSessionMode, string> = {
  design: 'Publicaciones no oficiales',
  certify: 'Publicaciones oficiales',
};
