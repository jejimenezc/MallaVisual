import { useCallback, useEffect, useMemo, useRef } from 'react';
import type React from 'react';
import { logAppError } from '../core/runtime/logger.ts';
import {
  createDefaultMetaPanel,
  type MallaExport,
  MALLA_SCHEMA_VERSION,
  normalizeMetaPanelConfig,
  type ProjectTheme,
} from '../utils/malla-io.ts';
import {
  createDefaultColumnHeaders,
  normalizeColumnHeadersConfig,
} from '../utils/column-headers.ts';
import type { BlockState } from '../utils/app-helpers.ts';
import type { RepositorySnapshot } from '../utils/repository-snapshot.ts';
import { computeSignature } from '../utils/comparators.ts';

type ToastFn = (message: string, variant?: 'info' | 'success' | 'error') => void;

interface UseCurrentProjectStateArgs {
  malla: MallaExport | null;
  block: BlockState | null;
  repositorySnapshot: RepositorySnapshot;
  projectThemeState: ProjectTheme;
  setMalla: React.Dispatch<React.SetStateAction<MallaExport | null>>;
  autoSave: (data: MallaExport) => void;
  exportProject: (data: MallaExport) => string;
  locationPathname: string;
  projectId: string | null;
  projectName: string;
  pushToast: ToastFn;
}

interface UseCurrentProjectStateResult {
  currentProject: MallaExport | null;
  isMetaPanelEnabled: boolean;
  canToggleMetaPanel: boolean;
  handleToggleMetaPanelEnabled: () => void;
  handleExportProject: () => void;
}

export function useCurrentProjectState({
  malla,
  block,
  repositorySnapshot,
  projectThemeState,
  setMalla,
  autoSave,
  exportProject,
  locationPathname,
  projectId,
  projectName,
  pushToast,
}: UseCurrentProjectStateArgs): UseCurrentProjectStateResult {
  const passiveAutosaveSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    passiveAutosaveSignatureRef.current = null;
  }, [projectId]);

  const currentProject: MallaExport | null = useMemo(() => {
    if (malla) {
      return {
        ...malla,
        version: MALLA_SCHEMA_VERSION,
        repository: repositorySnapshot.entries,
        theme: projectThemeState,
        columnHeaders: normalizeColumnHeadersConfig(malla.columnHeaders),
      };
    }
    if (block) {
      return {
        version: MALLA_SCHEMA_VERSION,
        masters: {
          master: {
            template: block.draft.template,
            visual: block.draft.visual,
            aspect: block.draft.aspect,
          },
        },
        repository: repositorySnapshot.entries,
        draftBlockName: !block.repoId ? block.repoName?.trim() || undefined : undefined,
        grid: { cols: 5, rows: 5 },
        pieces: [],
        values: {},
        floatingPieces: [],
        activeMasterId: 'master',
        theme: projectThemeState,
        metaPanel: createDefaultMetaPanel(false),
        columnHeaders: createDefaultColumnHeaders(false),
      };
    }
    return null;
  }, [block, malla, projectThemeState, repositorySnapshot]);

  const isMetaPanelEnabled = currentProject ? currentProject.metaPanel?.enabled !== false : false;
  const canToggleMetaPanel = Boolean(currentProject);

  const handleToggleMetaPanelEnabled = useCallback(() => {
    setMalla((prev) => {
      const source = prev ?? currentProject;
      if (!source) {
        return prev;
      }
      const normalizedMetaPanel = normalizeMetaPanelConfig(source.metaPanel);
      return {
        ...source,
        metaPanel: {
          ...normalizedMetaPanel,
          enabled: normalizedMetaPanel.enabled === false,
        },
      };
    });
  }, [currentProject, setMalla]);

  useEffect(() => {
    if (!projectId || !currentProject) return;
    const isEditorRoute =
      locationPathname === '/block/design' || locationPathname === '/malla/design';
    if (isEditorRoute) return;

    const serialized = computeSignature(currentProject);
    if (passiveAutosaveSignatureRef.current === serialized) return;
    passiveAutosaveSignatureRef.current = serialized;
    autoSave(currentProject);
  }, [autoSave, currentProject, locationPathname, projectId]);

  const handleExportProject = useCallback(() => {
    if (!currentProject) return;
    try {
      const json = exportProject({ ...currentProject });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${projectName || 'proyecto'}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logAppError({
        scope: 'import-export',
        severity: 'non-fatal',
        message: 'Fallo la exportacion del proyecto.',
        error,
        context: {
          projectId,
          projectName,
        },
      });
      pushToast('No se pudo exportar el proyecto', 'error');
    }
  }, [currentProject, exportProject, projectId, projectName, pushToast]);

  return {
    currentProject,
    isMetaPanelEnabled,
    canToggleMetaPanel,
    handleToggleMetaPanelEnabled,
    handleExportProject,
  };
}
