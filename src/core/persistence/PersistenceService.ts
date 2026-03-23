import {
  exportMalla,
  importMalla,
  type MallaExport,
  MALLA_SCHEMA_VERSION,
  normalizeProjectTheme,
} from '../../utils/malla-io.ts';
import {
  listBlocks as repoListBlocks,
  saveBlock as repoSaveBlock,
  removeBlock as repoRemoveBlock,
  importBlock as repoImportBlock,
  exportBlock as repoExportBlock,
  replaceBlocks as repoReplaceBlocks,
  clearBlocks as repoClearBlocks,
  renameBlock as repoRenameBlock,
  updateBlockMetadata as repoUpdateBlockMetadata,
  type StoredBlock,
} from '../../utils/block-repo.ts';
import { createLocalStorageProjectRepository } from '../../utils/master-repo.ts';
import type { ProjectRepository, ProjectRecord } from '../../utils/master-repo.ts';
import type { BlockExport } from '../../utils/block-io.ts';
import type { BlockId, BlockMetadata } from '../../types/block.ts';
import { logAppError } from '../runtime/logger.ts';

export type AutosaveStatus = 'idle' | 'saving' | 'error';

export class PersistenceService {
  private projectRepo: ProjectRepository<MallaExport>;
  private status: AutosaveStatus = 'idle';
  private listeners = new Set<() => void>();
  private saveTimer: number | null = null;
  private clearedDraftKeys = new Set<string>();
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
      const normalizedData: MallaExport = {
        ...data,
        theme: normalizeProjectTheme(data.theme),
      };
      if (storageKey) {
        window.localStorage.setItem(storageKey, exportMalla(normalizedData));
      }
      if (projectId) {
        this.projectRepo.save(projectId, projectName ?? 'Proyecto', normalizedData);
      }
      this.lastSaved = Date.now();
      this.setStatus('idle');
    } catch (error) {
      logAppError({
        scope: 'persistence',
        severity: 'non-fatal',
        message: 'Fallo el autosave del proyecto.',
        error,
        context: {
          storageKey: pending.storageKey,
          projectId: pending.projectId,
          projectName: pending.projectName,
        },
      });
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
    if (storageKey) {
      this.clearedDraftKeys.delete(storageKey);
    }
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

  clearDraft(storageKey?: string): void {
    if (!storageKey) return;

    this.clearedDraftKeys.add(storageKey);

    if (this.saveTimer !== null && this.pendingSave?.storageKey === storageKey) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.pendingSave = null;
    }

    if (this.pendingSave?.storageKey === storageKey) {
      this.pendingSave = null;
    }

    if (this.status === 'saving') {
      this.setStatus('idle');
    }

    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      logAppError({
        scope: 'persistence',
        severity: 'non-fatal',
        message: 'Fallo la limpieza del borrador autosave.',
        error,
        context: {
          storageKey,
        },
      });
    }
  }

  flushAutoSave(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const pendingKey = this.pendingSave?.storageKey;
    if (pendingKey && this.clearedDraftKeys.has(pendingKey)) {
      this.pendingSave = null;
      this.setStatus('idle');
    } else if (this.pendingSave) {
      this.performSave(this.pendingSave);
      this.pendingSave = null;
    } else if (this.status === 'saving') {
      this.setStatus('idle');
    }
  }

  loadDraft(storageKey: string): MallaExport | null {
    if (this.clearedDraftKeys.has(storageKey)) return null;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return importMalla(raw);
    } catch (error) {
      logAppError({
        scope: 'persistence',
        severity: 'non-fatal',
        message: 'Fallo la lectura del borrador autosave.',
        error,
        context: {
          storageKey,
        },
      });
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
    const updated: StoredBlock = {
      ...block,
      metadata: {
        ...block.metadata,
        updatedAt: block.metadata.updatedAt ?? new Date().toISOString(),
      },
    };
    repoSaveBlock(updated);
  };

  removeBlock = (id: BlockId): void => {
    repoRemoveBlock(id);
  };

  importBlock = (json: string): BlockExport => repoImportBlock(json);

  exportBlock = (block: BlockExport): string => repoExportBlock(block);

  replaceRepository = (blocks: StoredBlock[] | Record<BlockId, StoredBlock>): void => {
    repoReplaceBlocks(blocks);
  };

  clearRepository = (): void => {
    repoClearBlocks();
  };

  renameBlock = (id: BlockId, name: string): void => {
    repoRenameBlock(id, name);
  };

  updateBlockMetadata = (id: BlockId, metadata: Partial<BlockMetadata>): void => {
    repoUpdateBlockMetadata(id, metadata);
  };

  // Project repository helpers
  listProjects = () => this.projectRepo.list();

  loadProject = (id: string): ProjectRecord<MallaExport> | null => {
    const record = this.projectRepo.load(id);
    if (!record) return null;
    const normalized: MallaExport = {
      ...record.data,
      theme: normalizeProjectTheme(record.data?.theme),
    };
    return { meta: record.meta, data: normalized };
  };

  removeProject = (id: string): void => {
    this.projectRepo.remove(id);
  };

  renameProject = (id: string, name: string): void => {
    this.projectRepo.rename(id, name);
  };
}

export const persistenceService = new PersistenceService();
