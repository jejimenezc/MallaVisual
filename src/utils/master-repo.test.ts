// src/utils/master-repo.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createLocalStorageMasterRepository,
  createLocalStorageProjectRepository,
} from './master-repo.ts';
import type { MasterBlockData } from '../types/curricular';

test('localStorage master repository stores and retrieves masters', () => {
  const store: Record<string, string> = {};
  // simple mock for localStorage
  interface LS {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
    removeItem(k: string): void;
  }
  const mockWindow: { localStorage: LS } = {
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
  };
  (globalThis as unknown as { window: { localStorage: LS } }).window = mockWindow;

  const repo = createLocalStorageMasterRepository();
  const data: MasterBlockData = {
    template: [[{ active: true }]],
    visual: {},
    aspect: '1/1',
  };

  repo.save('uno', data);
  repo.save('dos', data);

  assert.deepEqual(repo.list().sort(), ['dos', 'uno']);
  assert.deepEqual(repo.load('uno'), data);

  repo.remove('uno');
  assert.deepEqual(repo.list(), ['dos']);
  assert.equal(repo.load('uno'), null);
});

test('project repository stores metadata and data', () => {
  const store: Record<string, string> = {};
  interface LS {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
    removeItem(k: string): void;
  }
  const mockWindow: { localStorage: LS } = {
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
  };
  (globalThis as unknown as { window: { localStorage: LS } }).window = mockWindow;

  const repo = createLocalStorageProjectRepository<{ foo: number }>();
  repo.save('a', 'Proyecto A', { foo: 1 });
  repo.save('b', 'Proyecto B', { foo: 2 });

  const list = repo.list();
  assert.equal(list.length, 2);
  const loaded = repo.load('a');
  assert.ok(loaded);
  assert.equal(loaded?.meta.name, 'Proyecto A');
  assert.equal(loaded?.data.foo, 1);

  repo.remove('a');
  assert.equal(repo.load('a'), null);
});