import { useCallback, useSyncExternalStore } from 'react';
import { persistenceService } from './PersistenceService.ts';
import type { MallaExport } from '../../utils/malla-io.ts';

export function useAutosaveInfo() {
  return useSyncExternalStore(
    (cb) => persistenceService.subscribe(cb),
    () => persistenceService.getSnapshotInfo(),
  );
}

interface UseProjectOptions {
  storageKey?: string;
  projectId?: string;
  projectName?: string;
}

export function useProject(options: UseProjectOptions = {}) {
  const { storageKey, projectId, projectName } = options;
  const autoSave = useCallback(
    (data: MallaExport) =>
      persistenceService.autoSave(storageKey, projectId, projectName, data),
    [storageKey, projectId, projectName],
  );
  const loadDraft = useCallback(() => {
    if (!storageKey) return null;
    return persistenceService.loadDraft(storageKey);
  }, [storageKey]);
  return {
    autoSave,
    loadDraft,
    flushAutoSave: () => persistenceService.flushAutoSave(),
    exportProject: persistenceService.exportProject,
    importProject: persistenceService.importProject,
    listProjects: persistenceService.listProjects,
    loadProject: persistenceService.loadProject,
    removeProject: persistenceService.removeProject,
    renameProject: persistenceService.renameProject,
  };
}

export function useBlocksRepo() {
  return {
    listBlocks: persistenceService.listBlocks,
    saveBlock: persistenceService.saveBlock,
    removeBlock: persistenceService.removeBlock,
    importBlock: persistenceService.importBlock,
    exportBlock: persistenceService.exportBlock,
    replaceRepository: persistenceService.replaceRepository,
    clearRepository: persistenceService.clearRepository,
    renameBlock: persistenceService.renameBlock,
    updateBlockMetadata: persistenceService.updateBlockMetadata,
    };
}