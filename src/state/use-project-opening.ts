import { useCallback } from 'react';
import type React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { logAppError } from '../core/runtime/logger.ts';
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { BlockMetadata } from '../types/block.ts';
import {
  normalizeProjectTheme,
  type MallaExport,
  type MallaRepositoryEntry,
  type ProjectTheme,
} from '../utils/malla-io.ts';
import type { BlockExport } from '../utils/block-io.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import { blockContentEquals, cloneBlockContent, hasBlockDesign, toBlockContent, type BlockContent } from '../utils/block-content.ts';
import type { BlockState } from '../utils/app-helpers.ts';
import { MALLA_AUTOSAVE_STORAGE_KEY, createBlockStateFromContent } from '../utils/app-helpers.ts';
import { handleProjectFile } from '../utils/project-file.ts';
import { prepareMallaProjectState } from '../utils/app-helpers.ts';
import type { RepositorySnapshot } from '../utils/repository-snapshot.ts';

type ToastFn = (message: string, variant?: 'info' | 'success' | 'error') => void;
type ConfirmAsync = (options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'info' | 'destructive';
}) => Promise<boolean>;

interface UseProjectOpeningArgs {
  beginProjectSwitch: () => number;
  isProjectSwitchTokenCurrent: (token: number) => boolean;
  resetWorkspaceState: () => void;
  applyRepositoryChange: (
    repoEntries: Record<string, MallaRepositoryEntry>,
    options: { reason: string; targetDescription: string; skipConfirmation?: boolean },
    targetProjectId?: string,
    switchToken?: number,
  ) => Promise<RepositorySnapshot | null>;
  clearPersistedProjectMetadata: () => void;
  clearDraft: (storageKey?: string) => void;
  loadMallaState: (next: MallaExport | null) => void;
  navigate: NavigateFunction;
  loadProject: (id: string) => { data: BlockExport | MallaExport; meta: { name: string } } | null;
  listProjects: () => Array<{ id: string; name: string; date: string }>;
  pushToast: ToastFn;
  confirmAsync: ConfirmAsync;
  computeDirty: () => boolean;
  repositorySnapshot: RepositorySnapshot;
  malla: MallaExport | null;
  projectId: string | null;
  block: BlockState | null;
  setProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  setBlock: React.Dispatch<React.SetStateAction<BlockState | null>>;
  setShouldPersistProject: React.Dispatch<React.SetStateAction<boolean>>;
  setProjectThemeState: React.Dispatch<React.SetStateAction<ProjectTheme>>;
  storedActiveProjectRef: React.MutableRefObject<{ id: string | null; name: string }>;
}

interface UseProjectOpeningResult {
  handleLoadBlock: (
    data: BlockExport,
    inferredName?: string,
    switchToken?: number,
  ) => Promise<void>;
  handleLoadMalla: (
    data: MallaExport,
    inferredName?: string,
    switchToken?: number,
  ) => Promise<void>;
  handleImportProjectFile: (file: File) => Promise<void>;
  getRecentProjects: () => Array<{ id: string; name: string; date: string }>;
  openProjectById: (id: string) => Promise<void>;
  handleProceedToMalla: (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect,
    targetPath?: string,
    repoId?: string | null,
    published?: BlockContent | null,
  ) => void;
  handleRepoIdChange: (repoId: string | null) => void;
  handleRepoMetadataChange: (metadata: BlockMetadata | null) => void;
  handleBlockPublish: (payload: {
    repoId: string;
    metadata: BlockMetadata;
    template: BlockTemplate;
    visual: VisualTemplate;
    aspect: BlockAspect;
    theme: ProjectTheme;
  }) => void;
  handleBlockDraftChange: (draft: BlockContent) => void;
  handleOpenRepositoryBlock: (stored: StoredBlock) => Promise<void>;
  handleProjectRemoved: (id: string) => void;
  handleProjectRenamed: (id: string, name: string) => void;
  handleBlockImported: (stored: StoredBlock) => void;
}

export function useProjectOpening({
  beginProjectSwitch,
  isProjectSwitchTokenCurrent,
  resetWorkspaceState,
  applyRepositoryChange,
  clearPersistedProjectMetadata,
  clearDraft,
  loadMallaState,
  navigate,
  loadProject,
  listProjects,
  pushToast,
  confirmAsync,
  computeDirty,
  repositorySnapshot,
  malla,
  projectId,
  block,
  setProjectId,
  setProjectName,
  setBlock,
  setShouldPersistProject,
  setProjectThemeState,
  storedActiveProjectRef,
}: UseProjectOpeningArgs): UseProjectOpeningResult {
  const handleLoadBlock = useCallback(
    async (
      data: BlockExport,
      inferredName?: string,
      switchToken = beginProjectSwitch(),
    ) => {
      resetWorkspaceState();
      const name = inferredName?.trim() || 'Importado';
      const id = crypto.randomUUID();
      const normalized = await applyRepositoryChange(
        {},
        {
          reason: 'importar el bloque seleccionado',
          targetDescription: 'el bloque importado',
        },
        id,
        switchToken,
      );
      if (!isProjectSwitchTokenCurrent(switchToken)) return;
      if (!normalized) return;
      const theme = normalizeProjectTheme(data.theme);
      setProjectId(id);
      setProjectName(name);
      setBlock(createBlockStateFromContent(toBlockContent(data)));
      loadMallaState(null);
      setProjectThemeState(theme);
      clearPersistedProjectMetadata();
      navigate('/block/design');
    },
    [
      applyRepositoryChange,
      beginProjectSwitch,
      clearPersistedProjectMetadata,
      isProjectSwitchTokenCurrent,
      loadMallaState,
      navigate,
      resetWorkspaceState,
      setBlock,
      setProjectId,
      setProjectName,
      setProjectThemeState,
    ],
  );

  const handleLoadMalla = useCallback(
    async (
      data: MallaExport,
      inferredName?: string,
      switchToken = beginProjectSwitch(),
    ) => {
      resetWorkspaceState();
      const name = inferredName?.trim() || 'Importado';
      const id = crypto.randomUUID();
      const normalizedRepo = await applyRepositoryChange(
        data.repository ?? {},
        {
          reason: 'importar el proyecto',
          targetDescription: 'el proyecto importado',
        },
        id,
        switchToken,
      );
      if (!isProjectSwitchTokenCurrent(switchToken)) return;
      if (!normalizedRepo) return;
      const prepared = prepareMallaProjectState(data, normalizedRepo);
      setProjectId(id);
      setProjectName(name);
      setBlock(prepared.block);
      loadMallaState(prepared.malla);
      clearPersistedProjectMetadata();
      navigate('/malla/design');
    },
    [
      applyRepositoryChange,
      beginProjectSwitch,
      clearPersistedProjectMetadata,
      isProjectSwitchTokenCurrent,
      loadMallaState,
      navigate,
      resetWorkspaceState,
      setBlock,
      setProjectId,
      setProjectName,
    ],
  );

  const handleImportProjectFile = useCallback(
    async (file: File) => {
      const switchToken = beginProjectSwitch();
      try {
        await handleProjectFile(file, {
          onBlock: (data, name) => handleLoadBlock(data, name, switchToken),
          onMalla: (data, name) => handleLoadMalla(data, name, switchToken),
        });
      } catch (error) {
        logAppError({
          scope: 'import-export',
          severity: 'non-fatal',
          message: 'Fallo la importacion de un archivo de proyecto.',
          error,
          context: {
            fileName: file.name,
          },
        });
        pushToast('Archivo invalido', 'error');
      }
      if (!isProjectSwitchTokenCurrent(switchToken)) return;
    },
    [beginProjectSwitch, handleLoadBlock, handleLoadMalla, isProjectSwitchTokenCurrent, pushToast],
  );

  const handleOpenProject = useCallback(
    async (
      id: string,
      data: BlockExport | MallaExport,
      name: string,
      switchToken = beginProjectSwitch(),
    ) => {
      resetWorkspaceState();
      if (!isProjectSwitchTokenCurrent(switchToken)) return;
      if ('masters' in data) {
        const normalizedRepo = await applyRepositoryChange(
          data.repository ?? {},
          {
            reason: 'abrir el proyecto seleccionado',
            targetDescription: 'el proyecto seleccionado',
          },
          id,
          switchToken,
        );
        if (!isProjectSwitchTokenCurrent(switchToken)) return;
        if (!normalizedRepo) return;
        const prepared = prepareMallaProjectState(data, normalizedRepo);
        setProjectId(id);
        setProjectName(name);
        setBlock(prepared.block);
        loadMallaState(prepared.malla);
        setShouldPersistProject(true);
        navigate('/malla/design');
      } else {
        const normalizedRepo = await applyRepositoryChange(
          {},
          {
            reason: 'abrir el proyecto seleccionado',
            targetDescription: 'el proyecto seleccionado',
          },
          id,
          switchToken,
        );
        if (!isProjectSwitchTokenCurrent(switchToken)) return;
        if (!normalizedRepo) return;
        setProjectId(id);
        setProjectName(name);
        setBlock(createBlockStateFromContent(toBlockContent(data)));
        loadMallaState(null);
        setShouldPersistProject(true);
        navigate('/block/design');
      }
    },
    [
      applyRepositoryChange,
      beginProjectSwitch,
      isProjectSwitchTokenCurrent,
      loadMallaState,
      navigate,
      resetWorkspaceState,
      setBlock,
      setProjectId,
      setProjectName,
      setShouldPersistProject,
    ],
  );

  const getRecentProjects = useCallback(() => listProjects().slice(0, 10), [listProjects]);

  const openProjectById = useCallback(
    async (id: string) => {
      const switchToken = beginProjectSwitch();
      try {
        const record = loadProject(id);
        if (!record) return;
        await handleOpenProject(id, record.data, record.meta.name, switchToken);
        if (!isProjectSwitchTokenCurrent(switchToken)) return;
      } catch (error) {
        logAppError({
          scope: 'persistence',
          severity: 'non-fatal',
          message: 'Fallo la apertura de un proyecto guardado.',
          error,
          context: {
            projectId: id,
          },
        });
        pushToast('No se pudo abrir el proyecto', 'error');
      }
    },
    [beginProjectSwitch, handleOpenProject, isProjectSwitchTokenCurrent, loadProject, pushToast],
  );

  const handleProceedToMalla = useCallback(
    (
      template: BlockTemplate,
      visual: VisualTemplate,
      aspect: BlockAspect,
      targetPath?: string,
      repoId?: string | null,
      published?: BlockContent | null,
    ) => {
      const destination = targetPath ?? '/malla/design';
      if (!malla && destination === '/malla/design') {
        clearDraft(MALLA_AUTOSAVE_STORAGE_KEY);
      }
      const content: BlockContent = { template, visual, aspect };
      setBlock((prev) => {
        const snapshot = repositorySnapshot;
        const nextRepoId = repoId !== undefined ? repoId ?? null : prev?.repoId ?? null;
        const draft = cloneBlockContent(content);
        const nextMetadata =
          nextRepoId && snapshot.metadata[nextRepoId]
            ? snapshot.metadata[nextRepoId]
            : nextRepoId
              ? prev?.repoMetadata ?? null
              : null;
        const nextPublished = !nextRepoId
          ? null
          : published === undefined
            ? prev?.published
              ? cloneBlockContent(prev.published)
              : null
            : published === null
              ? null
              : cloneBlockContent(published);
        return {
          draft,
          repoId: nextRepoId,
          repoName: nextMetadata?.name ?? (nextRepoId ? prev?.repoName ?? null : null),
          repoMetadata: nextMetadata,
          published: nextPublished,
        };
      });
    },
    [clearDraft, malla, repositorySnapshot, setBlock],
  );

  const handleRepoIdChange = useCallback(
    (repoId: string | null) => {
      setBlock((prev) => {
        if (!prev) return prev;
        const nextRepoId = repoId ?? null;
        if (prev.repoId === nextRepoId) return prev;
        const nextMetadata = nextRepoId ? repositorySnapshot.metadata[nextRepoId] ?? null : null;
        return {
          ...prev,
          repoId: nextRepoId,
          repoName: nextMetadata?.name ?? null,
          repoMetadata: nextMetadata,
          published: nextRepoId && prev.published ? cloneBlockContent(prev.published) : null,
        };
      });
    },
    [repositorySnapshot.metadata, setBlock],
  );

  const handleRepoMetadataChange = useCallback(
    (metadata: BlockMetadata | null) => {
      setBlock((prev) => {
        if (!prev) return prev;
        const nextMetadata = metadata ? { ...metadata } : null;
        return {
          ...prev,
          repoMetadata: nextMetadata,
          repoName: nextMetadata?.name ?? prev.repoName ?? null,
        };
      });
    },
    [setBlock],
  );

  const handleBlockPublish = useCallback(
    ({
      repoId,
      metadata,
      template,
      visual,
      aspect,
    }: {
      repoId: string;
      metadata: BlockMetadata;
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      theme: ProjectTheme;
    }) => {
      const content: BlockContent = { template, visual, aspect };
      const metadataCopy = { ...metadata };
      setBlock((prev) => {
        const nextDraft = cloneBlockContent(content);
        if (!prev) {
          return {
            draft: nextDraft,
            repoId,
            repoName: metadataCopy.name,
            repoMetadata: metadataCopy,
            published: cloneBlockContent(nextDraft),
          };
        }
        return {
          ...prev,
          draft: nextDraft,
          repoId: repoId ?? prev.repoId,
          repoName: metadataCopy.name,
          repoMetadata: metadataCopy,
          published: cloneBlockContent(nextDraft),
        };
      });
    },
    [setBlock],
  );

  const loadRepositoryBlock = useCallback(
    (stored: StoredBlock, options?: { navigate?: boolean }) => {
      const shouldNavigate = options?.navigate ?? true;
      const content = toBlockContent(stored.data);
      const draft = cloneBlockContent(content);
      const published = cloneBlockContent(content);
      const theme = normalizeProjectTheme(stored.data.theme);
      setBlock({
        draft,
        repoId: stored.metadata.uuid,
        repoName: stored.metadata.name,
        repoMetadata: { ...stored.metadata },
        published,
      });
      clearPersistedProjectMetadata();
      if (malla && !projectId) {
        clearDraft(MALLA_AUTOSAVE_STORAGE_KEY);
        loadMallaState(null);
      }
      setProjectThemeState(theme);
      if (shouldNavigate) {
        navigate('/block/design');
      }
    },
    [
      clearDraft,
      clearPersistedProjectMetadata,
      loadMallaState,
      malla,
      navigate,
      projectId,
      setBlock,
      setProjectThemeState,
    ],
  );

  const handleBlockDraftChange = useCallback((draft: BlockContent) => {
    const nextDraft = cloneBlockContent(draft);
    setBlock((prev) => {
      if (!prev) {
        return {
          draft: nextDraft,
          repoId: null,
          repoName: null,
          repoMetadata: null,
          published: null,
        };
      }
      if (blockContentEquals(prev.draft, nextDraft)) {
        return prev;
      }
      return {
        ...prev,
        draft: nextDraft,
      };
    });
  }, [setBlock]);

  const handleOpenRepositoryBlock = useCallback(
    async (stored: StoredBlock) => {
      const hasUnsavedChanges = computeDirty();
      if (hasUnsavedChanges) {
        const confirmed = await confirmAsync({
          title: 'Descartar cambios sin guardar',
          message: 'Se descartaran los cambios no guardados del bloque actual. Deseas continuar?',
          confirmLabel: 'Descartar y abrir',
          cancelLabel: 'Seguir editando',
          variant: 'destructive',
        });
        if (!confirmed) {
          return;
        }
      }
      loadRepositoryBlock(stored);
    },
    [computeDirty, confirmAsync, loadRepositoryBlock],
  );

  const handleProjectRemoved = useCallback(
    (id: string) => {
      if (!projectId || projectId !== id) return;
      clearPersistedProjectMetadata();
      setProjectId(null);
      setProjectName('');
    },
    [clearPersistedProjectMetadata, projectId, setProjectId, setProjectName],
  );

  const handleProjectRenamed = useCallback(
    (id: string, name: string) => {
      if (!projectId || projectId !== id) return;
      setProjectName(name);
      storedActiveProjectRef.current = { id, name };
    },
    [projectId, setProjectName, storedActiveProjectRef],
  );

  const handleBlockImported = useCallback(
    (stored: StoredBlock) => {
      const hasExistingBlock = !!block;
      const shouldReplaceCurrent = !block || (!block.repoId && !hasBlockDesign(block.draft));
      if (!shouldReplaceCurrent) {
        return;
      }
      loadRepositoryBlock(stored, { navigate: !hasExistingBlock });
    },
    [block, loadRepositoryBlock],
  );

  return {
    handleLoadBlock,
    handleLoadMalla,
    handleImportProjectFile,
    getRecentProjects,
    openProjectById,
    handleProceedToMalla,
    handleRepoIdChange,
    handleRepoMetadataChange,
    handleBlockPublish,
    handleBlockDraftChange,
    handleOpenRepositoryBlock,
    handleProjectRemoved,
    handleProjectRenamed,
    handleBlockImported,
  };
}
