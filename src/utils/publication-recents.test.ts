import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MALLA_SNAPSHOT_PAYLOAD_KIND, type MallaSnapshot } from '../types/malla-snapshot.ts';
import {
  findRecentCertifiedPublicationById,
  persistRecentCertifiedPublication,
  readRecentCertifiedPublications,
} from './publication-recents.ts';

const createMockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
  } as unknown as Storage;
};

const createSnapshot = (overrides?: Partial<MallaSnapshot>): MallaSnapshot => ({
  payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
  formatVersion: 1,
  createdAt: '2026-04-12T20:00:00.000Z',
  snapshotId: 'uuid-a',
  projectName: 'Proyecto certificado',
  grid: { rows: 1, cols: 1 },
  items: [],
  ...overrides,
});

describe('publication-recents', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  test('persists certified snapshots by snapshotId and reorders most recent first', () => {
    persistRecentCertifiedPublication(storage, createSnapshot({ snapshotId: 'uuid-a' }));
    persistRecentCertifiedPublication(
      storage,
      createSnapshot({
        snapshotId: 'uuid-b',
        createdAt: '2026-04-12T21:00:00.000Z',
        projectName: 'Proyecto B',
      }),
    );

    const entries = readRecentCertifiedPublications(storage);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.snapshotId).toBe('uuid-b');
    expect(entries[1]?.snapshotId).toBe('uuid-a');
  });

  test('deduplicates by snapshotId and updates the stored snapshot', () => {
    persistRecentCertifiedPublication(storage, createSnapshot({ snapshotId: 'uuid-a' }));
    persistRecentCertifiedPublication(
      storage,
      createSnapshot({
        snapshotId: 'uuid-a',
        projectName: 'Proyecto certificado actualizado',
      }),
    );

    const entries = readRecentCertifiedPublications(storage);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.projectName).toBe('Proyecto certificado actualizado');
  });

  test('finds a recent certified publication by id', () => {
    persistRecentCertifiedPublication(storage, createSnapshot({ snapshotId: 'uuid-a' }));

    const entry = findRecentCertifiedPublicationById(storage, 'uuid-a');
    expect(entry?.snapshot.snapshotId).toBe('uuid-a');
    expect(entry?.projectName).toBe('Proyecto certificado');
  });
});
