// src/App.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { MallaViewerScreen } from './screens/MallaViewerScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockRepositoryScreen } from './screens/BlockRepositoryScreen';
import { NavTabs } from './components/NavTabs';
import { StatusBar } from './components/StatusBar/StatusBar';
import { AppHeader } from './components/AppHeader';
import { GlobalMenuBar } from './components/GlobalMenuBar/GlobalMenuBar';
import { ColorPaletteModal } from './components/ColorPaletteModal';
import { PublishModal } from './components/PublishModal';
import {
  type MallaExport,
  type MallaRepositoryEntry,
  MALLA_SCHEMA_VERSION,
  createDefaultProjectTheme,
  normalizeProjectTheme,
  type ProjectTheme,
} from './utils/malla-io.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io.ts';
import styles from './App.module.css';
import { useProject, useBlocksRepo } from './core/persistence/hooks.ts';
import { ProceedToMallaProvider, useProceedToMalla } from './state/proceed-to-malla';
import { useUILayout } from './state/ui-layout.tsx';
import { AppCommandsProvider } from './state/app-commands';
import { ProjectThemeProvider } from './state/project-theme.tsx';
import { useCurrentProjectState } from './state/use-current-project-state.ts';
import { useProjectOpening } from './state/use-project-opening.ts';
import type { StoredBlock } from './utils/block-repo.ts';
import { buildBlockId, type BlockMetadata } from './types/block.ts';
import {
  blockContentEquals,
  hasBlockDesign,
  toBlockContent,
} from './utils/block-content.ts';
import { areContentsEqual } from './utils/comparators.ts';
import { blocksToRepository, type RepositorySnapshot } from './utils/repository-snapshot.ts';
import { IntroOverlay } from './components/IntroOverlay';
import { useToast } from './ui/toast/ToastContext.tsx';
import { useConfirm, usePrompt } from './ui/confirm/ConfirmContext.tsx';
import { EditorErrorBoundary, ViewerErrorBoundary } from './core/runtime/RuntimeErrorBoundary.tsx';
import { logAppError } from './core/runtime/logger.ts';
import type { MallaSnapshot } from './types/malla-snapshot.ts';
import { normalizeViewerTheme } from './utils/viewer-theme.ts';
import type { ViewerTheme } from './types/viewer-theme.ts';
import { usePublicationWorkflow } from './state/use-publication-workflow.ts';
import { useBlockUsageAndControlCleanup } from './state/use-block-usage-and-control-cleanup.ts';
import {
  type BlockState,
  MALLA_AUTOSAVE_STORAGE_KEY,
  clearStoredActiveProject,
  createBlockStateFromProjectMaster,
  createBlockStateFromContent,
  createEmptyBlockState,
  isBlockOnlyProjectState,
  persistActiveProject,
  prepareMallaProjectState,
  readStoredActiveProject,
} from './utils/app-helpers.ts';

function getSafeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface AppLayoutProps {
  children: React.ReactNode;
  projectName: string;
  hasProject: boolean;
  isActiveProjectOnStandby: boolean;
  isMetaPanelEnabled: boolean;
  canToggleMetaPanel: boolean;
  onNewProject: () => void;
  onImportProjectFile: (file: File) => Promise<void> | void;
  onExportProject: () => void;
  onOpenPreview: () => void;
  onOpenPrintPreview: () => void;
  onOpenPublishModal: () => void;
  onImportPublicationFile: (file: File) => Promise<void> | void;
  onCloseProject: () => void;
  onToggleMetaPanelEnabled: () => void;
  getRecentProjects: () => Array<{ id: string; name: string; date: string }>;
  onOpenProjectById: (id: string) => void;
  onShowIntro: () => void;
  onOpenProjectPalette: () => void;
  locationPath: string;
  navigate: ReturnType<typeof useNavigate>;
}

function AppLayout({
  children,
  projectName,
  hasProject,
  isActiveProjectOnStandby,
  isMetaPanelEnabled,
  canToggleMetaPanel,
  onNewProject,
  onImportProjectFile,
  onExportProject,
  onOpenPreview,
  onOpenPrintPreview,
  onOpenPublishModal,
  onImportPublicationFile,
  onCloseProject,
  onToggleMetaPanelEnabled,
  getRecentProjects,
  onOpenProjectById,
  onShowIntro,
  onOpenProjectPalette,
  locationPath,
  navigate,
}: AppLayoutProps): JSX.Element {
  const { handler } = useProceedToMalla();
  const { showChrome, toggleChrome } = useUILayout();

  const schemaVersion = locationPath.startsWith('/malla/design')
    ? MALLA_SCHEMA_VERSION
    : BLOCK_SCHEMA_VERSION;

  const quickNav = useMemo(() => {
    if (!hasProject) {
      return { label: null, action: null };
    }
    if (locationPath === '/') {
      return {
        label: 'Editor',
        action: () => navigate('/block/design'),
      };
    }
    if (locationPath.startsWith('/block/')) {
      return {
        label: 'Malla',
        action: () => {
          const shouldPreventDefault = handler('/malla/design');
          if (shouldPreventDefault === false) {
            navigate('/malla/design');
          }
        },
      };
    }
    if (locationPath.startsWith('/blocks')) {
      return {
        label: 'Malla',
        action: () => {
          const shouldPreventDefault = handler('/malla/design');
          if (shouldPreventDefault === false) {
            navigate('/malla/design');
          }
        },
      };
    }
    if (locationPath.startsWith('/malla/design')) {
      return {
        label: 'Repositorio',
        action: () => {
          const shouldPreventDefault = handler('/blocks');
          if (shouldPreventDefault === false) {
            navigate('/blocks');
          }
        },
      };
    }
    return { label: null, action: null };
  }, [handler, hasProject, locationPath, navigate]);

  return (
    <div className={styles.appContainer}>
      {showChrome ? (
        <div className={styles.chromeWrapper}>
          <AppHeader />
          <GlobalMenuBar
            hasProject={hasProject}
            isMetaPanelEnabled={isMetaPanelEnabled}
            canToggleMetaPanel={canToggleMetaPanel}
            onNewProject={onNewProject}
            onImportProjectFile={onImportProjectFile}
            onExportProject={onExportProject}
            onOpenPreview={onOpenPreview}
            onOpenPrintPreview={onOpenPrintPreview}
            onOpenPublishModal={onOpenPublishModal}
            onImportPublicationFile={onImportPublicationFile}
            onCloseProject={onCloseProject}
            onToggleMetaPanelEnabled={onToggleMetaPanelEnabled}
            getRecentProjects={getRecentProjects}
            onOpenProjectById={onOpenProjectById}
            onShowIntro={onShowIntro}
            onOpenProjectPalette={onOpenProjectPalette}
          />
          <NavTabs isProjectActive={hasProject} />
        </div>
      ) : null}
      <StatusBar
        projectName={projectName}
        hasProject={hasProject}
        isActiveProjectOnStandby={isActiveProjectOnStandby}
        schemaVersion={schemaVersion}
        quickNavLabel={quickNav.label}
        onQuickNav={quickNav.action}
        isChromeVisible={showChrome}
        onToggleChrome={toggleChrome}
      />
      <main className={styles.appMain} data-app-main>
        {children}
      </main>
    </div>
  );
}

type ViewerMode = 'preview' | 'publication';

export default function App(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const storedActiveProjectRef = useRef(readStoredActiveProject(getSafeLocalStorage()));
  const [block, setBlock] = useState<BlockState | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [publicationSnapshot, setPublicationSnapshot] = useState<MallaSnapshot | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode | null>(null);
  const [projectThemeState, setProjectThemeState] = useState<ProjectTheme>(
    createDefaultProjectTheme(),
  );
  const [isPaletteModalOpen, setPaletteModalOpen] = useState(false);
  const mallaRef = useRef<MallaExport | null>(malla);
  const [projectId, setProjectId] = useState<string | null>(
    storedActiveProjectRef.current.id,
  );
  const [projectName, setProjectName] = useState(
    storedActiveProjectRef.current.name,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [shouldPersistProject, setShouldPersistProject] = useState(false);
  const [suspendMallaAutosave, setSuspendMallaAutosave] = useState(false);
  const [isIntroOverlayVisible, setIntroOverlayVisible] = useState(false);
  const introOverlayReturnFocusRef = useRef<HTMLElement | null>(null);
  const projectSwitchTokenRef = useRef(0);
  const previousProjectIdRef = useRef<string | null>(projectId);
  const previousMallaSnapshotRef = useRef<MallaExport | null>(malla);
  const { autoSave, exportProject, loadProject, flushAutoSave, listProjects, clearDraft } =
    useProject({
      projectId: projectId ?? undefined,
      projectName,
    });
  const { listBlocks, replaceRepository, clearRepository } = useBlocksRepo();
  const [repositorySnapshot, setRepositorySnapshot] = useState<RepositorySnapshot>(() =>
    blocksToRepository(listBlocks()),
  );
  const repositorySnapshotRef = useRef(repositorySnapshot);
  const pushToast = useToast();
  const confirmAsync = useConfirm();
  const promptAsync = usePrompt();

  const beginProjectSwitch = useCallback(() => ++projectSwitchTokenRef.current, []);

  const isProjectSwitchTokenCurrent = useCallback(
    (token: number) => projectSwitchTokenRef.current === token,
    [],
  );

  const updateProjectTheme = useCallback(
    (theme: ProjectTheme) => {
      const normalized = normalizeProjectTheme(theme);
      setProjectThemeState(normalized);
      setMalla((prev) => (prev ? { ...prev, theme: normalized } : prev));
    },
    [],
  );

  const loadMallaState = useCallback(
    (next: MallaExport | null) => {
      if (!next) {
        setMalla(null);
        setProjectThemeState(createDefaultProjectTheme());
        return;
      }
      const normalizedTheme = normalizeProjectTheme(next.theme);
      setProjectThemeState(normalizedTheme);
      setMalla({ ...next, theme: normalizedTheme });
    },
    [],
  );

  const handleMallaChange = useCallback<
    React.Dispatch<React.SetStateAction<MallaExport | null>>
  >(
    (next) => {
      const value =
        typeof next === 'function'
          ? (next as (prev: MallaExport | null) => MallaExport | null)(mallaRef.current)
          : next;
      loadMallaState(value ?? null);
    },
    [loadMallaState],
  );

  useEffect(() => {
    mallaRef.current = malla;
  }, [malla]);

  useEffect(() => {
    const projectChanged = projectId !== previousProjectIdRef.current;
    const hasInitializedMalla =
      !!malla && (!previousMallaSnapshotRef.current || !areContentsEqual(malla, previousMallaSnapshotRef.current));

    if (
      suspendMallaAutosave &&
      ((!malla && location.pathname !== '/malla/design') || (projectChanged && !!malla) || hasInitializedMalla)
    ) {
      setSuspendMallaAutosave(false);
    }

    if (projectChanged) {
      previousProjectIdRef.current = projectId;
    }

    if (projectChanged || hasInitializedMalla || (!malla && previousMallaSnapshotRef.current)) {
      previousMallaSnapshotRef.current = malla ?? null;
    }
  }, [location.pathname, malla, projectId, suspendMallaAutosave]);

  useEffect(() => {
    repositorySnapshotRef.current = repositorySnapshot;
  }, [repositorySnapshot]);

  const clearPersistedProjectMetadata = useCallback(() => {
    clearStoredActiveProject(getSafeLocalStorage());
    setShouldPersistProject(false);
  }, []);

  const {
    blocksInUse,
    controlsInUse,
    blockInUse,
    handleRequestControlDataClear,
    handleUpdateMaster,
  } = useBlockUsageAndControlCleanup({
    block,
    malla,
    repositorySnapshot,
    setBlock,
    setMalla,
    setProjectThemeState,
  });

  const resetWorkspaceState = useCallback(() => {
    setBlock(null);
    loadMallaState(null);
    setPublicationSnapshot(null);
    setViewerMode(null);
    setProjectId(null);
    setProjectName('');
    const emptySnapshot = blocksToRepository([]);
    setRepositorySnapshot(emptySnapshot);
    repositorySnapshotRef.current = emptySnapshot;
    clearRepository();
    clearDraft(MALLA_AUTOSAVE_STORAGE_KEY);
    clearPersistedProjectMetadata();
    setSuspendMallaAutosave(false);
  }, [
    clearDraft,
    clearPersistedProjectMetadata,
    clearRepository,
    loadMallaState,
    setRepositorySnapshot,
  ]);

  const handleShowIntroOverlay = useCallback(() => {
    introOverlayReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIntroOverlayVisible(true);
  }, []);

  const handleHideIntroOverlay = useCallback(() => {
    setIntroOverlayVisible(false);
    window.requestAnimationFrame(() => {
      const fallbackTarget =
        document.getElementById('global-menu-trigger-ayuda') ??
        document.getElementById('global-menu-trigger-archivo');
      introOverlayReturnFocusRef.current?.focus?.();
      if (document.activeElement === document.body) {
        (fallbackTarget as HTMLElement | null)?.focus?.();
      }
      introOverlayReturnFocusRef.current = null;
    });
  }, []);

  const handleOpenProjectPalette = useCallback(() => {
    setPaletteModalOpen(true);
  }, []);

  const handleCloseProjectPalette = useCallback(() => {
    setPaletteModalOpen(false);
  }, []);

  const handleApplyProjectPalette = useCallback(
    (theme: ProjectTheme) => {
      updateProjectTheme(theme);
      setPaletteModalOpen(false);
    },
    [updateProjectTheme],
  );

  const computeDirty = useCallback(
    (b: BlockState | null = block): boolean => {
      if (!b) return false;
      if (!b.published) {
        // Bloque nunca publicado => dirty si draft no vacío.
        return hasBlockDesign(b.draft);
      }
      // Bloque publicado => dirty si draft deep-distinto a published.
      return !blockContentEquals(b.draft, b.published);
    },
    [block],
  );

  useEffect(() => {
    const sync = () => setRepositorySnapshot(blocksToRepository(listBlocks()));
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('block-repo-updated', sync);
    return () => window.removeEventListener('block-repo-updated', sync);
  }, [listBlocks]);

  const applyRepositoryChange = useCallback(
    async (
      repoEntries: Record<string, MallaRepositoryEntry>,
      options: { reason: string; targetDescription: string; skipConfirmation?: boolean },
      targetProjectId?: string,
      switchToken?: number,
    ): Promise<RepositorySnapshot | null> => {
      const convertRepository = () => {
        const now = new Date().toISOString();
        const fallbackProjectId = targetProjectId ?? projectId ?? 'repository';
        const storedBlocks: StoredBlock[] = Object.values(repoEntries ?? {}).map((entry) => {
          const projectIdValue =
            entry.metadata.projectId && entry.metadata.projectId.trim().length > 0
              ? entry.metadata.projectId.trim()
              : fallbackProjectId;
          const metadata: BlockMetadata = {
            projectId: projectIdValue,
            uuid: entry.metadata.uuid,
            name:
              entry.metadata.name && entry.metadata.name.trim().length > 0
                ? entry.metadata.name.trim()
                : entry.metadata.uuid,
            updatedAt: entry.metadata.updatedAt ?? now,
          };
          const id = entry.id && entry.id.trim().length > 0
            ? entry.id
            : buildBlockId(metadata.projectId, metadata.uuid);
          const data: BlockExport = {
            ...entry.data,
            metadata,
          };
          return { id, metadata, data };
        });
        const snapshot = blocksToRepository(storedBlocks);
        return { storedBlocks, snapshot };
      };

      const { storedBlocks, snapshot } = convertRepository();
      const currentSnapshot = blocksToRepository(listBlocks());
      const sameAsCurrent = areContentsEqual(currentSnapshot, snapshot);
      if (!sameAsCurrent) {
        const hasCurrentData = Object.keys(currentSnapshot.repository).length > 0;
        if (hasCurrentData && !options.skipConfirmation) {
          const message =
            Object.keys(snapshot.repository).length === 0
              ? `Se reiniciará el repositorio de bloques para ${options.reason}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`
              : `Se reemplazará el repositorio de bloques actual por el incluido en ${options.targetDescription}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`;
          const confirmed = await confirmAsync({
            title: 'Confirmar reemplazo del repositorio de bloques',
            message,
            confirmLabel: 'Sí, continuar',
            cancelLabel: 'Cancelar',
            variant: 'destructive',
          });
          if (!confirmed) {
            return null;
          }
          if (switchToken !== undefined && !isProjectSwitchTokenCurrent(switchToken)) {
            return null;
          }
        }
        if (storedBlocks.length === 0) {
          clearRepository();
        } else {
          replaceRepository(storedBlocks);
        }
      }
      setRepositorySnapshot(snapshot);
      return snapshot;
    },
    [
      clearRepository,
      confirmAsync,
      isProjectSwitchTokenCurrent,
      listBlocks,
      projectId,
      replaceRepository,
    ],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (shouldPersistProject && projectId) {
      storedActiveProjectRef.current = { id: projectId, name: projectName };
      persistActiveProject(getSafeLocalStorage(), projectId, projectName);
    } else {
      clearStoredActiveProject(getSafeLocalStorage());
    }
  }, [isHydrated, shouldPersistProject, projectId, projectName]);

  useEffect(() => {
    if (isHydrated) return;
    void (async () => {
      const switchToken = beginProjectSwitch();
      try {
        if (typeof window === 'undefined') {
          setIsHydrated(true);
          return;
        }

        const stored = readStoredActiveProject(getSafeLocalStorage());
        if (!stored.id) {
          setIsHydrated(true);
          return;
        }

        const record = loadProject(stored.id);
        if (!isProjectSwitchTokenCurrent(switchToken)) return;
        if (!record) {
          clearStoredActiveProject(getSafeLocalStorage());
          setProjectId(null);
          setProjectName('');
          setBlock(null);
          loadMallaState(null);
          setShouldPersistProject(false);
          setIsHydrated(true);
          return;
        }

        if ('masters' in record.data) {
          const normalizedRepo = await applyRepositoryChange(
            record.data.repository ?? {},
            {
              reason: 'abrir el proyecto almacenado',
              targetDescription: 'el proyecto almacenado',
              skipConfirmation: true,
            },
            undefined,
            switchToken,
          );
          if (!isProjectSwitchTokenCurrent(switchToken)) return;
          if (!normalizedRepo) {
            setIsHydrated(true);
            return;
          }
          if (isBlockOnlyProjectState(record.data)) {
            setBlock(createBlockStateFromProjectMaster(record.data));
            loadMallaState(null);
            setProjectThemeState(normalizeProjectTheme(record.data.theme));
          } else {
            const prepared = prepareMallaProjectState(record.data, normalizedRepo);
            setBlock(prepared.block);
            loadMallaState(prepared.malla);
          }
        } else {
          const blockData = record.data as BlockExport;
          await applyRepositoryChange(
            {},
            {
              reason: 'abrir el proyecto almacenado',
              targetDescription: 'el proyecto almacenado',
              skipConfirmation: true,
            },
            undefined,
            switchToken,
          );
          if (!isProjectSwitchTokenCurrent(switchToken)) return;
          setBlock(createBlockStateFromContent(toBlockContent(blockData)));
          loadMallaState(null);
          setProjectThemeState(normalizeProjectTheme(blockData.theme));
        }

        setProjectId(stored.id);
        setProjectName(record.meta.name ?? stored.name ?? '');
        setShouldPersistProject(true);
        setIsHydrated(true);
      } catch (error) {
        logAppError({
          scope: 'persistence',
          severity: 'non-fatal',
          message: 'Fallo la rehidratacion del proyecto activo.',
          error,
        });
        setIsHydrated(true);
        pushToast('No se pudo restaurar el proyecto activo', 'error');
      }
    })();
  }, [
    applyRepositoryChange,
    beginProjectSwitch,
    isHydrated,
    isProjectSwitchTokenCurrent,
    loadMallaState,
    loadProject,
    pushToast,
  ]);

  const {
    currentProject,
    isMetaPanelEnabled,
    canToggleMetaPanel,
    handleToggleMetaPanelEnabled,
    handleExportProject,
  } = useCurrentProjectState({
    malla,
    block,
    repositorySnapshot,
    projectThemeState,
    setMalla,
    autoSave,
    exportProject,
    locationPathname: location.pathname,
    projectId,
    projectName,
    pushToast,
  });

  const {
    viewerPanelModePreference,
    publicationPrintSettings,
    publishContext,
    publicationOutputConfig,
    previewSnapshot,
    publishActionStates,
    closePublishModal,
    handleBackToEditorFromViewer,
    handleGoToDocumentFromPublishModal,
    handleGoToPresentationFromPublishModal,
    handleImportPublicationFile,
    handleOpenPreview,
    handleOpenPrintPreview,
    handleOpenPublishModalFromMenu,
    handlePublicationPrintSettingsChange,
    handlePublishFromPreview,
    handleSelectPublicationProduct,
    handleViewerPanelModeChange,
    handleViewerThemeChange,
  } = usePublicationWorkflow({
    currentProject,
    projectId,
    projectName,
    viewerMode,
    publicationSnapshot,
    locationPathname: location.pathname,
    navigate,
    setPublicationSnapshot,
    setViewerMode,
    pushToast,
    getSafeLocalStorage,
  });

  const {
    handleLoadBlock,
    handleLoadMalla,
    handleImportProjectFile,
    getRecentProjects,
    openProjectById,
    handleProceedToMalla,
    handleRepoIdChange,
    handleRepoNameChange,
    handleRepoMetadataChange,
    handleBlockPublish,
    handleBlockDraftChange,
    handleOpenRepositoryBlock,
    handleProjectRemoved,
    handleProjectRenamed,
    handleBlockImported,
  } = useProjectOpening({
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
  });

  const handleCloseProject = useCallback(async () => {
    const switchToken = beginProjectSwitch();
    const hasUnsavedBlock = computeDirty();
    if (hasUnsavedBlock) {
      const confirmed = await confirmAsync({
        title: 'Cerrar proyecto sin guardar',
        message:
          'Hay cambios no guardados en el bloque actual. Se perderán si cierras el proyecto. ¿Deseas continuar?',
        confirmLabel: 'Cerrar sin guardar',
        cancelLabel: 'Seguir editando',
        variant: 'destructive',
      });
      if (!isProjectSwitchTokenCurrent(switchToken)) {
        return;
      }
      if (!confirmed) {
        return;
      }
    }
    if (currentProject) {
      autoSave(currentProject);
    }
    flushAutoSave();
    clearRepository();
    setRepositorySnapshot(blocksToRepository([]));
    setBlock(null);
    loadMallaState(null);
    setProjectId(null);
    setProjectName('');
    setShouldPersistProject(false);
    setViewerMode(null);
    setPublicationSnapshot(null);
    clearPersistedProjectMetadata();
    storedActiveProjectRef.current = { id: null, name: '' };
    clearDraft(MALLA_AUTOSAVE_STORAGE_KEY);
    navigate('/');
  }, [
    autoSave,
    clearPersistedProjectMetadata,
    clearRepository,
    beginProjectSwitch,
    clearDraft,
    computeDirty,
    confirmAsync,
    currentProject,
    flushAutoSave,
    isProjectSwitchTokenCurrent,
    loadMallaState,
    navigate,
  ]);

  const handleNewProject = async () => {
    const switchToken = beginProjectSwitch();
    const normalizedName = await promptAsync({
      title: 'Nuevo proyecto',
      message: 'Ingresa el nombre del proyecto',
      placeholder: 'Nombre del proyecto',
      confirmLabel: 'Crear',
      cancelLabel: 'Cancelar',
    });
    if (!isProjectSwitchTokenCurrent(switchToken)) {
      return;
    }
    if (normalizedName === null) {
      return;
    }
    const id = crypto.randomUUID();
    resetWorkspaceState();
    const normalized = await applyRepositoryChange(
      {},
      {
        reason: 'crear un proyecto nuevo',
        targetDescription: 'el nuevo proyecto',
      },
      id,
      switchToken,
    );
    if (!isProjectSwitchTokenCurrent(switchToken)) return;
    if (!normalized) return;
    setSuspendMallaAutosave(true);
    setProjectId(id);
    setProjectName(normalizedName);
    // Evita que el flushAutoSave del MallaEditorScreen rehidrate el borrador del proyecto anterior
    // cuando desmonta tras crear un proyecto nuevo desde la propia malla.
    clearDraft(MALLA_AUTOSAVE_STORAGE_KEY);
    setBlock(createEmptyBlockState());
    loadMallaState(null);
    clearPersistedProjectMetadata();
    storedActiveProjectRef.current = { id, name: normalizedName };
    navigate('/block/design');
  };

  const hasDirtyBlock = computeDirty();
  const hasPublishedBlock = Boolean(block?.published);
  const hasPublishedRepositoryBlock = Object.keys(repositorySnapshot.repository).length > 0;

  const projectTheme = projectThemeState;

  const hasProject = !!currentProject;
  const isExternalPublicationOpen =
    location.pathname === '/malla/viewer' &&
    viewerMode === 'publication' &&
    publicationSnapshot !== null;
  const activeViewerSnapshot = viewerMode === 'preview' ? previewSnapshot : publicationSnapshot;
  const activeViewerTheme = useMemo<ViewerTheme>(() => {
    if (viewerMode === 'preview') {
      return publicationOutputConfig.theme;
    }
    if (publicationSnapshot?.appearance) {
      return normalizeViewerTheme(publicationSnapshot.appearance);
    }
    return publicationOutputConfig.theme;
  }, [publicationOutputConfig.theme, publicationSnapshot?.appearance, viewerMode]);

  if (!isHydrated) {
    return null;
  }

  return (
    <ProjectThemeProvider theme={projectTheme} active={hasProject}>
      <AppCommandsProvider>
        <ProceedToMallaProvider
          hasDirtyBlock={hasDirtyBlock}
          hasPublishedBlock={hasPublishedBlock}
          hasPublishedRepositoryBlock={hasPublishedRepositoryBlock}
        >
          <AppLayout
            projectName={projectName}
            hasProject={hasProject}
            isActiveProjectOnStandby={isExternalPublicationOpen && hasProject}
            isMetaPanelEnabled={isMetaPanelEnabled}
            canToggleMetaPanel={canToggleMetaPanel}
            onNewProject={handleNewProject}
            onImportProjectFile={handleImportProjectFile}
            onExportProject={handleExportProject}
            onOpenPreview={handleOpenPreview}
            onOpenPrintPreview={handleOpenPrintPreview}
            onOpenPublishModal={handleOpenPublishModalFromMenu}
            onImportPublicationFile={handleImportPublicationFile}
            onCloseProject={handleCloseProject}
            onToggleMetaPanelEnabled={handleToggleMetaPanelEnabled}
            getRecentProjects={getRecentProjects}
            onOpenProjectById={openProjectById}
            onShowIntro={handleShowIntroOverlay}
            onOpenProjectPalette={handleOpenProjectPalette}
            locationPath={location.pathname}
            navigate={navigate}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <HomeScreen
                    onNewBlock={handleNewProject}
                    onLoadBlock={handleLoadBlock}
                    onLoadMalla={handleLoadMalla}
                    onOpenProjectById={openProjectById}
                    currentProjectId={projectId ?? undefined}
                    onProjectDeleted={handleProjectRemoved}
                    onProjectRenamed={handleProjectRenamed}
                    onShowIntro={handleShowIntroOverlay}
                  />
                }
              />
              <Route
                path="/block/design"
                element={
                  <EditorErrorBoundary>
                    <BlockEditorScreen
                      onProceedToMalla={handleProceedToMalla}
                      onDraftChange={handleBlockDraftChange}
                      initialData={
                        block
                          ? {
                            version: BLOCK_SCHEMA_VERSION,
                            template: block.draft.template,
                            visual: block.draft.visual,
                            aspect: block.draft.aspect,
                            theme: projectThemeState,
                          }
                          : undefined
                      }
                      projectId={projectId ?? undefined}
                      projectName={projectName}
                      initialMode="edit"
                      initialRepoId={block?.repoId ?? null}
                      initialRepoName={block?.repoName ?? null}
                      initialRepoMetadata={block?.repoMetadata ?? null}
                      onRepoNameChange={handleRepoNameChange}
                      onRepoIdChange={handleRepoIdChange}
                      onRepoMetadataChange={handleRepoMetadataChange}
                      onPublishBlock={handleBlockPublish}
                      isBlockInUse={blockInUse}
                      controlsInUse={controlsInUse}
                      onRequestControlDataClear={handleRequestControlDataClear}
                    />
                  </EditorErrorBoundary>
                }
              />
              <Route
                path="/block/style"
                element={
                  block ? (
                    <EditorErrorBoundary>
                      <BlockEditorScreen
                        onDraftChange={handleBlockDraftChange}
                        initialData={{
                          version: BLOCK_SCHEMA_VERSION,
                          template: block.draft.template,
                          visual: block.draft.visual,
                          aspect: block.draft.aspect,
                          theme: projectThemeState,
                        }}
                        projectId={projectId ?? undefined}
                        projectName={projectName}
                        initialMode="view"
                        initialRepoId={block.repoId ?? null}
                        initialRepoName={block.repoName ?? null}
                        initialRepoMetadata={block.repoMetadata ?? null}
                        onRepoNameChange={handleRepoNameChange}
                        onRepoIdChange={handleRepoIdChange}
                        onRepoMetadataChange={handleRepoMetadataChange}
                        onPublishBlock={handleBlockPublish}
                        isBlockInUse={blockInUse}
                        controlsInUse={controlsInUse}
                        onRequestControlDataClear={handleRequestControlDataClear}
                      />
                    </EditorErrorBoundary>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/blocks"
                element={
                  <BlockRepositoryScreen
                    onBlockImported={handleBlockImported}
                    onOpenBlock={handleOpenRepositoryBlock}
                    activeProjectId={projectId ?? undefined}
                    blocksInUse={blocksInUse}
                  />
                }
              />
              <Route
                path="/malla/design"
                element={
                  block ? (
                    <EditorErrorBoundary>
                      <MallaEditorScreen
                        template={block.published?.template ?? block.draft.template}
                        visual={block.published?.visual ?? block.draft.visual}
                        aspect={block.published?.aspect ?? block.draft.aspect}
                        repoId={block.repoId ?? null}
                        onBack={() => navigate('/block/design')}
                        onOpenPublicationPreview={handleOpenPreview}
                        onUpdateMaster={handleUpdateMaster}
                        initialMalla={malla ?? undefined}
                        onMallaChange={handleMallaChange}
                        projectId={projectId ?? undefined}
                        projectName={projectName}
                        suspendAutosave={suspendMallaAutosave}
                      />
                    </EditorErrorBoundary>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/malla/viewer"
                element={
                  <ViewerErrorBoundary>
                    <MallaViewerScreen
                      snapshot={activeViewerSnapshot}
                      mode={viewerMode}
                      initialPanelMode={viewerPanelModePreference}
                      theme={activeViewerTheme}
                      printSettings={publicationPrintSettings}
                      onThemeChange={handleViewerThemeChange}
                      onPrintSettingsChange={handlePublicationPrintSettingsChange}
                      onPanelModeChange={handleViewerPanelModeChange}
                      onBackToEditor={handleBackToEditorFromViewer}
                      onOpenPublishModal={handlePublishFromPreview}
                      onImportPublicationFile={handleImportPublicationFile}
                    />
                  </ViewerErrorBoundary>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
          <ColorPaletteModal
            isOpen={isPaletteModalOpen}
            currentTheme={projectTheme}
            onClose={handleCloseProjectPalette}
            onApply={handleApplyProjectPalette}
          />
          {publishContext ? (
            <ViewerErrorBoundary>
              <PublishModal
                isOpen
                origin={publishContext.origin}
                mode={publishContext.mode}
                actions={publishActionStates}
                onClose={closePublishModal}
                onSelectProduct={handleSelectPublicationProduct}
                onGoToPresentation={handleGoToPresentationFromPublishModal}
                onGoToDocument={handleGoToDocumentFromPublishModal}
              />
            </ViewerErrorBoundary>
          ) : null}
        </ProceedToMallaProvider>
        {isIntroOverlayVisible ? (
          <IntroOverlay onClose={handleHideIntroOverlay} />
        ) : null}
      </AppCommandsProvider>
    </ProjectThemeProvider>
  );
}


