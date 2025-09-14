import { useCallback, useSyncExternalStore } from 'react';
import { persistenceService } from './PersistenceService.ts';
import type { MallaExport } from '../../utils/malla-io.ts';

export function useAutosaveStatus() {
  return useSyncExternalStore(
    (cb) => persistenceService.subscribe(cb),
    () => persistenceService.getStatus(),
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
    exportProject: persistenceService.exportProject,
    importProject: persistenceService.importProject,
    listProjects: persistenceService.listProjects,
    loadProject: persistenceService.loadProject,
    removeProject: persistenceService.removeProject,
  };
}

export function useBlocksRepo() {
  return {
    listBlocks: persistenceService.listBlocks,
    saveBlock: persistenceService.saveBlock,
    removeBlock: persistenceService.removeBlock,
    importBlock: persistenceService.importBlock,
    exportBlock: persistenceService.exportBlock,
  };
}