// src/utils/master-repo.ts
import type { MasterBlockRepository, MasterBlockData } from '../types/curricular';

const STORAGE_KEY = 'master-blocks';

interface LS {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const g = globalThis as unknown as {
  localStorage?: LS;
  window?: { localStorage?: LS };
};

function getLocalStorage(): LS | undefined {
  return g.localStorage ?? g.window?.localStorage;
}

function readAll(): Record<string, MasterBlockData> {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MasterBlockData>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, MasterBlockData>): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function createLocalStorageMasterRepository(): MasterBlockRepository {
  return {
    list() {
      return Object.keys(readAll());
    },
    load(id) {
      const all = readAll();
      return all[id] ?? null;
    },
    save(id, data) {
      const all = readAll();
      all[id] = data;
      writeAll(all);
    },
    remove(id) {
      const all = readAll();
      if (id in all) {
        delete all[id];
        writeAll(all);
      }
    },
  };
}

// --- project repository with metadata ---

export interface ProjectMeta {
  name: string;
  date: string; // ISO string
}

export interface ProjectRecord<T> {
  meta: ProjectMeta;
  data: T;
}

export interface ProjectRepository<T> {
  list(): Array<{ id: string; name: string; date: string }>;
  load(id: string): ProjectRecord<T> | null;
  save(id: string, name: string, data: T): void;
  remove(id: string): void;
  rename(id: string, name: string): void;
}

const PROJECTS_KEY = 'projects-storage';

function readProjects<T>(): Record<string, ProjectRecord<T>> {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(PROJECTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ProjectRecord<T>>;
  } catch {
    return {};
  }
}

function writeProjects<T>(data: Record<string, ProjectRecord<T>>): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(PROJECTS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function createLocalStorageProjectRepository<T>(): ProjectRepository<T> {
  return {
    list() {
      const all = readProjects<T>();
      return Object.entries(all)
        .map(([id, rec]) => ({
          id,
          name: rec.meta.name,
          date: rec.meta.date,
        }))
        .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    },
    load(id) {
      const all = readProjects<T>();
      return all[id] ?? null;
    },
    save(id, name, data) {
      const all = readProjects<T>();
      all[id] = { meta: { name, date: new Date().toISOString() }, data };
      writeProjects(all);
    },
    remove(id) {
      const all = readProjects<T>();
      if (id in all) {
        delete all[id];
        writeProjects(all);
      }
    },
    rename(id, name) {
      const all = readProjects<T>();
      const record = all[id];
      if (!record) return;
      all[id] = {
        data: record.data,
        meta: { name, date: new Date().toISOString() },
      };
      writeProjects(all);
    },
  };
}