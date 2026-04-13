import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import { validateAndNormalizeMallaSnapshot } from './malla-snapshot.ts';
import { logAppError } from '../core/runtime/logger.ts';

export const RECENT_CERTIFIED_PUBLICATIONS_STORAGE_KEY = 'recentCertifiedPublications';
const MAX_RECENT_CERTIFIED_PUBLICATIONS = 12;

export interface RecentCertifiedPublicationEntry {
  snapshotId: string;
  projectName: string;
  createdAt: string;
  lastOpenedAt: string;
  snapshot: MallaSnapshot;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readJsonFromStorage = (storage: Storage | null, key: string): unknown => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logAppError({
      scope: 'publication',
      severity: 'non-fatal',
      message: 'Fallo la lectura de certificados recientes persistidos.',
      error,
      context: { key },
    });
    return null;
  }
};

const persistJsonToStorage = (storage: Storage | null, key: string, value: unknown): void => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logAppError({
      scope: 'publication',
      severity: 'non-fatal',
      message: 'Fallo la persistencia de certificados recientes.',
      error,
      context: { key },
    });
  }
};

const normalizeRecentEntry = (value: unknown): RecentCertifiedPublicationEntry | null => {
  if (!isRecord(value)) return null;
  const snapshotId = typeof value.snapshotId === 'string' ? value.snapshotId.trim() : '';
  const projectName = typeof value.projectName === 'string' ? value.projectName.trim() : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt.trim() : '';
  const lastOpenedAt = typeof value.lastOpenedAt === 'string' ? value.lastOpenedAt.trim() : '';
  if (!snapshotId || !createdAt || !lastOpenedAt) return null;

  const validation = validateAndNormalizeMallaSnapshot(value.snapshot);
  if (!validation.ok || validation.normalizedSnapshot.snapshotId !== snapshotId) return null;

  return {
    snapshotId,
    projectName: projectName || validation.normalizedSnapshot.projectName || 'Publicación certificada',
    createdAt,
    lastOpenedAt,
    snapshot: validation.normalizedSnapshot,
  };
};

export const readRecentCertifiedPublications = (
  storage: Storage | null,
): RecentCertifiedPublicationEntry[] => {
  const raw = readJsonFromStorage(storage, RECENT_CERTIFIED_PUBLICATIONS_STORAGE_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeRecentEntry(entry))
    .filter((entry): entry is RecentCertifiedPublicationEntry => entry !== null)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
};

export const persistRecentCertifiedPublication = (
  storage: Storage | null,
  snapshot: MallaSnapshot,
): RecentCertifiedPublicationEntry[] => {
  const snapshotId = typeof snapshot.snapshotId === 'string' ? snapshot.snapshotId.trim() : '';
  if (!snapshotId) {
    return readRecentCertifiedPublications(storage);
  }

  const nextEntry: RecentCertifiedPublicationEntry = {
    snapshotId,
    projectName: snapshot.projectName || 'Publicación certificada',
    createdAt: snapshot.createdAt,
    lastOpenedAt: new Date().toISOString(),
    snapshot,
  };

  const nextEntries = [
    nextEntry,
    ...readRecentCertifiedPublications(storage).filter((entry) => entry.snapshotId !== snapshotId),
  ].slice(0, MAX_RECENT_CERTIFIED_PUBLICATIONS);

  persistJsonToStorage(storage, RECENT_CERTIFIED_PUBLICATIONS_STORAGE_KEY, nextEntries);
  return nextEntries;
};

export const findRecentCertifiedPublicationById = (
  storage: Storage | null,
  snapshotId: string,
): RecentCertifiedPublicationEntry | null =>
  readRecentCertifiedPublications(storage).find((entry) => entry.snapshotId === snapshotId) ?? null;
