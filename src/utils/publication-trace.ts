export type PublicationTraceabilityMode = 'work' | 'official' | 'derived';

export interface PublicationTraceMark {
  mode: PublicationTraceabilityMode;
  text: string;
  shortId: string | null;
}

const shortenSnapshotId = (value: string): string => value.trim().slice(0, 8);

export const resolvePublicationTraceMark = (input: {
  snapshotId?: string | null;
  mode: 'preview' | 'publication' | null;
  publicationSession: 'design' | 'certify';
  traceabilityMode?: PublicationTraceabilityMode;
}): PublicationTraceMark => {
  const snapshotId =
    typeof input.snapshotId === 'string' && input.snapshotId.trim().length > 0
      ? input.snapshotId.trim()
      : null;

  const effectiveMode =
    input.traceabilityMode ??
    (input.mode === 'publication'
      ? 'derived'
      : snapshotId && input.publicationSession === 'certify'
        ? 'official'
        : 'work');

  if (effectiveMode === 'derived' && snapshotId) {
    return {
      mode: 'derived',
      text: `Copia fiel de ${shortenSnapshotId(snapshotId)}`,
      shortId: shortenSnapshotId(snapshotId),
    };
  }

  if (effectiveMode === 'official' && snapshotId) {
    return {
      mode: 'official',
      text: `Original certificado · UUID ${shortenSnapshotId(snapshotId)}`,
      shortId: shortenSnapshotId(snapshotId),
    };
  }

  return {
    mode: 'work',
    text: 'Versión no trazable',
    shortId: null,
  };
};
