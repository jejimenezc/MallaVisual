import { exportMalla, importMalla, type MallaExport, MALLA_SCHEMA_VERSION } from '../../utils/malla-io.ts';
import {
  listBlocks as repoListBlocks,
  saveBlock as repoSaveBlock,
  removeBlock as repoRemoveBlock,
  importBlock as repoImportBlock,
  exportBlock as repoExportBlock,
  type StoredBlock,
} from '../../utils/block-repo.ts';
import { createLocalStorageProjectRepository } from '../../utils/master-repo.ts';
import type { ProjectRepository, ProjectRecord } from '../../utils/master-repo.ts';
import type { BlockExport } from '../../utils/block-io.ts';

export type AutosaveStatus = 'idle' | 'saving' | 'error';

export class PersistenceService {
  private projectRepo: ProjectRepository<MallaExport>;
  private status: AutosaveStatus = 'idle';
  private listeners = new Set<() => void>();
  private saveTimer: number | null = null;
  private pendingSave:
    | {
        storageKey?: string;
        projectId?: string;
        projectName?: string;
        data: MallaExport;
      }
    | null = null;  private lastSaved: number | null = null;
  private snapshot = { status: this.status as AutosaveStatus, lastSaved: this.lastSaved };

  constructor() {
    this.projectRepo = createLocalStorageProjectRepository<MallaExport>();
  }

  private setStatus(s: AutosaveStatus) {
    this.status = s;
    this.snapshot = { status: this.status, lastSaved: this.lastSaved };
    this.listeners.forEach((l) => l());
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  getStatus(): AutosaveStatus {
    return this.status;
  }

  getSnapshotInfo() {
    return this.snapshot; // referencia estable
  }

    getLastSaved(): number | null {
    return this.lastSaved;
  }
  
  private performSave(pending: {
    storageKey?: string;
    projectId?: string;
    projectName?: string;
    data: MallaExport;
  }) {
    try {
      const { storageKey, projectId, projectName, data } = pending;
      if (storageKey) {
        window.localStorage.setItem(storageKey, exportMalla(data));
      }
      if (projectId) {
        this.projectRepo.save(projectId, projectName ?? 'Proyecto', data);
      }
      this.lastSaved = Date.now();
      this.setStatus('idle');
    } catch {
      this.setStatus('error');
    }
  }

  autoSave(
    storageKey: string | undefined,
    projectId: string | undefined,
    projectName: string | undefined,
    data: MallaExport,
    delay = 300,
  ): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.setStatus('saving');
    this.pendingSave = { storageKey, projectId, projectName, data };
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      if (this.pendingSave) {
        this.performSave(this.pendingSave);
        this.pendingSave = null;
      }
    }, delay);
  }

  flushAutoSave(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.pendingSave) {
      this.performSave(this.pendingSave);
      this.pendingSave = null;
    } else if (this.status === 'saving') {
      this.setStatus('idle');
    }
  }

  loadDraft(storageKey: string): MallaExport | null {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return importMalla(raw);
    } catch {
      return null;
    }
  }

  exportProject(project: MallaExport): string {
    if (!project.version) project.version = MALLA_SCHEMA_VERSION;
    return exportMalla(project);
  }

  importProject(json: string): MallaExport {
    return importMalla(json);
  }

  // Block repository wrappers
  listBlocks = (): StoredBlock[] => repoListBlocks();

  saveBlock = (block: StoredBlock): void => {
    repoSaveBlock(block);
  };

  removeBlock = (id: string): void => {
    repoRemoveBlock(id);
  };

  importBlock = (json: string): BlockExport => repoImportBlock(json);

  exportBlock = (block: BlockExport): string => repoExportBlock(block);

  // Project repository helpers
  listProjects = () => this.projectRepo.list();

  loadProject = (id: string): ProjectRecord<MallaExport> | null =>
    this.projectRepo.load(id);

  removeProject = (id: string): void => {
    this.projectRepo.remove(id);
  };
}

export const persistenceService = new PersistenceService();