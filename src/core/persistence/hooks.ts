import { useCallback, useSyncExternalStore } from 'react';
import { persistenceService } from './PersistenceService.ts';
import type { MallaExport } from '../../utils/malla-io.ts';
import type { BlockExport } from '../../utils/block-io.ts';
import type { SaveableBlock } from '../../utils/block-repo.ts';

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
  };
}

export function useBlocksRepo(projectId?: string | null) {
  const normalizedProjectId = projectId ?? null;

  const listBlocks = useCallback(() => persistenceService.listBlocks(normalizedProjectId), [normalizedProjectId]);

  const saveBlock = useCallback(
    (block: SaveableBlock) => persistenceService.saveBlock(normalizedProjectId, block),
    [normalizedProjectId],
  );

  const removeBlock = useCallback(
    (id: string) => persistenceService.removeBlock(normalizedProjectId, id),
    [normalizedProjectId],
  );

  const replaceRepository = useCallback(
    (blocks: Record<string, BlockExport>) =>
      persistenceService.replaceRepository(normalizedProjectId, blocks),
    [normalizedProjectId],
  );

  const clearRepository = useCallback(
    (targetId?: string | null) =>
      persistenceService.clearRepository(
        typeof targetId === 'undefined' ? normalizedProjectId : targetId,
      ),
    [normalizedProjectId],
  );

  return {
    listBlocks,
    saveBlock,
    removeBlock,
    importBlock: persistenceService.importBlock,
    exportBlock: persistenceService.exportBlock,
    replaceRepository,
    clearRepository,
  };
}