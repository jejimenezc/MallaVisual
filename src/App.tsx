// src/App.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { BlockTemplate, MasterBlockData } from './types/curricular.ts';
import type { VisualTemplate, BlockAspect } from './types/visual.ts';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockRepositoryScreen } from './screens/BlockRepositoryScreen';
import { NavTabs } from './components/NavTabs';
import { StatusBar } from './components/StatusBar/StatusBar';
import { AppHeader } from './components/AppHeader';
import { GlobalMenuBar } from './components/GlobalMenuBar/GlobalMenuBar';
import { type MallaExport, type MallaRepositoryEntry, MALLA_SCHEMA_VERSION } from './utils/malla-io.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io.ts';
import styles from './App.module.css';
import { useProject, useBlocksRepo } from './core/persistence/hooks.ts';
import { ProceedToMallaProvider, useProceedToMalla } from './state/proceed-to-malla';
import { useUILayout } from './state/ui-layout.tsx';
import { AppCommandsProvider } from './state/app-commands';
import type { StoredBlock } from './utils/block-repo.ts';
import { buildBlockId, type BlockMetadata } from './types/block.ts';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from './utils/block-content.ts';
import { blocksToRepository, type RepositorySnapshot } from './utils/repository-snapshot.ts';
import {
  remapPiecesWithMapping,
  synchronizeMastersWithRepository,
  remapIds,
} from './utils/malla-sync.ts';
import { IntroOverlay } from './components/IntroOverlay';
import { handleProjectFile } from './utils/project-file.ts';

const ACTIVE_PROJECT_ID_STORAGE_KEY = 'activeProjectId';
const ACTIVE_PROJECT_NAME_STORAGE_KEY = 'activeProjectName';

function getSafeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredActiveProject(): { id: string | null; name: string } {
  const ls = getSafeLocalStorage();
  if (!ls) return { id: null, name: '' };
  try {
    const id = ls.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    const name = ls.getItem(ACTIVE_PROJECT_NAME_STORAGE_KEY) ?? '';
    return { id, name };
  } catch {
    return { id: null, name: '' };
  }
}

function persistActiveProject(id: string, name: string): void {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, id);
    ls.setItem(ACTIVE_PROJECT_NAME_STORAGE_KEY, name);
  } catch {
    /* ignore */
  }
}

function clearStoredActiveProject(): void {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    ls.removeItem(ACTIVE_PROJECT_NAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface BlockState {
  draft: BlockContent;
  repoId: string | null;
  repoName: string | null;
  repoMetadata: BlockMetadata | null;
  published: BlockContent | null;
}

function createEmptyMaster(): MasterBlockData {
  return {
    template: Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ active: false, label: '', type: undefined })),
    ),
    visual: {},
    aspect: '1/1',
  };
}

function prepareMallaProjectState(
  data: MallaExport,
  repositorySnapshot: RepositorySnapshot,
): { block: BlockState; malla: MallaExport } {
  const repository = repositorySnapshot.repository;
  const repositoryEntries = repositorySnapshot.entries;
  const repositoryMetadata = repositorySnapshot.metadata;
  const sourceMasters = data.masters ?? {};
  const { masters: normalizedMasters, mapping } = synchronizeMastersWithRepository(
    sourceMasters,
    repository,
  );
  const remappedPieces = remapPiecesWithMapping(data.pieces ?? [], mapping);
  const floatingPieces = remapIds(data.floatingPieces ?? [], mapping);
  const values = { ...(data.values ?? {}) };

  let desiredActiveId = data.activeMasterId ?? '';
  if (desiredActiveId) {
    const mapped = mapping.get(desiredActiveId);
    if (mapped) {
      desiredActiveId = mapped;
    }
  }

  const repoIds = Object.keys(repository);
  const normalizedIds = Object.keys(normalizedMasters);
  const mappedRepoIds = new Set<string>(mapping.values());

  let activeId = desiredActiveId;
  if (activeId && !normalizedMasters[activeId]) {
    const mapped = mapping.get(activeId);
    if (mapped && normalizedMasters[mapped]) {
      activeId = mapped;
    }
  }

  if (!activeId || !normalizedMasters[activeId] || !repository[activeId]) {
    const candidate = repoIds.find((id) => mappedRepoIds.has(id) && normalizedMasters[id]);
    if (candidate) {
      activeId = candidate;
    }
  }

  if ((!activeId || !normalizedMasters[activeId]) && repoIds.length > 0) {
    const candidate = repoIds.find((id) => normalizedMasters[id]);
    activeId = candidate ?? repoIds[0];
  }

  if (!activeId || !normalizedMasters[activeId]) {
    activeId = normalizedIds[0] ?? '';
  }

  if (!activeId) {
    activeId = 'master';
  }

  if (!normalizedMasters[activeId]) {
    if (repository[activeId]) {
      normalizedMasters[activeId] = cloneBlockContent(
        toBlockContent(repository[activeId]),
      ) as MasterBlockData;
    } else {
      normalizedMasters[activeId] = createEmptyMaster();
    }
    mapping.set(activeId, activeId);
  }

  const activeMaster = normalizedMasters[activeId];
  const draft = cloneBlockContent(toBlockContent(activeMaster));
  const repoEntry = repository[activeId];
  const repoMeta = repositoryMetadata[activeId] ?? null;
  const published = repoEntry ? cloneBlockContent(toBlockContent(repoEntry)) : null;

  const block: BlockState = {
    draft,
    repoId: repoEntry ? activeId : null,
    repoName: repoMeta ? repoMeta.name : repoEntry ? activeId : null,
    repoMetadata: repoMeta,
    published,
  };

  const mallaState: MallaExport = {
    ...data,
    version: MALLA_SCHEMA_VERSION,
    masters: normalizedMasters,
    pieces: remappedPieces,
    values,
    floatingPieces,
    activeMasterId: activeId,
    repository: repositoryEntries,
  };

  return { block, malla: mallaState };
}

interface AppLayoutProps {
  children: React.ReactNode;
  projectName: string;
  hasProject: boolean;
  onNewProject: () => void;
  onImportProjectFile: (file: File) => Promise<void> | void;
  onExportProject: () => void;
  onCloseProject: () => void;
  getRecentProjects: () => Array<{ id: string; name: string; date: string }>;
  onOpenRecentProject: (id: string) => void;
  onShowIntro: () => void;
  locationPath: string;
  navigate: ReturnType<typeof useNavigate>;
}

function AppLayout({
  children,
  projectName,
  hasProject,
  onNewProject,
  onImportProjectFile,
  onExportProject,
  onCloseProject,
  getRecentProjects,
  onOpenRecentProject,
  onShowIntro,
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
            onNewProject={onNewProject}
            onImportProjectFile={onImportProjectFile}
            onExportProject={onExportProject}
            onCloseProject={onCloseProject}
            getRecentProjects={getRecentProjects}
            onOpenRecentProject={onOpenRecentProject}
            onShowIntro={onShowIntro}
          />
          <NavTabs isProjectActive={hasProject} />
        </div>
      ) : null}
      <StatusBar
        projectName={projectName}
        hasProject={hasProject}
        schemaVersion={schemaVersion}
        quickNavLabel={quickNav.label}
        onQuickNav={quickNav.action}
        isChromeVisible={showChrome}
        onToggleChrome={toggleChrome}
      />
      <main className={styles.appMain}>{children}</main>
    </div>
  );
}

export default function App(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const storedActiveProjectRef = useRef(readStoredActiveProject());
  const [block, setBlock] = useState<BlockState | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(
    storedActiveProjectRef.current.id,
  );
  const [projectName, setProjectName] = useState(
    storedActiveProjectRef.current.name,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [shouldPersistProject, setShouldPersistProject] = useState(false);
  const [isIntroOverlayVisible, setIntroOverlayVisible] = useState(false);
  const { exportProject, loadProject, flushAutoSave, listProjects } = useProject();
  const { listBlocks, replaceRepository, clearRepository } = useBlocksRepo();
  const [repositorySnapshot, setRepositorySnapshot] = useState<RepositorySnapshot>(() =>
    blocksToRepository(listBlocks()),
  );

  const clearPersistedProjectMetadata = useCallback(() => {
    clearStoredActiveProject();
    setShouldPersistProject(false);
  }, []);
  
  const handleShowIntroOverlay = useCallback(() => {
    setIntroOverlayVisible(true);
  }, []);

  const handleHideIntroOverlay = useCallback(() => {
    setIntroOverlayVisible(false);
  }, []);
  
  // TODO: reemplazar por helper central de “draft vacío” cuando esté disponible.
  const isDraftNonEmpty = useCallback((draft: BlockContent): boolean => {
    const hasActiveCell = draft.template.some((row) =>
      row.some((cell) => Boolean(cell?.active)),
    );
    const merges = (draft.visual as unknown as { merges?: Record<string, unknown> | null })?.merges;
    const hasMerges =
      !!merges &&
      typeof merges === 'object' &&
      Object.keys(merges as Record<string, unknown>).length > 0;
    const metaName = (draft as unknown as { meta?: { name?: string | null } }).meta?.name;
    const hasName = typeof metaName === 'string' && metaName.trim().length > 0;
    return hasActiveCell || hasMerges || hasName;
  }, []);

  const computeDirty = useCallback(
    (b: BlockState | null = block): boolean => {
      if (!b) return false;
      if (!b.published) {
        // Bloque nunca publicado => dirty si draft no vacío.
        return isDraftNonEmpty(b.draft);
      }
      // Bloque publicado => dirty si draft deep-distinto a published.
      return !blockContentEquals(b.draft, b.published);
    },
    [block, isDraftNonEmpty],
  );

  useEffect(() => {
    const sync = () => setRepositorySnapshot(blocksToRepository(listBlocks()));
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('block-repo-updated', sync);
    return () => window.removeEventListener('block-repo-updated', sync);
  }, [listBlocks]);

  const applyRepositoryChange = useCallback(
    (
      repoEntries: Record<string, MallaRepositoryEntry>,
      options: { reason: string; targetDescription: string; skipConfirmation?: boolean },
    ): RepositorySnapshot | null => {
      const convertRepository = () => {
        const now = new Date().toISOString();
        const fallbackProjectId = projectId ?? 'repository';
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
      const sameAsCurrent = JSON.stringify(repositorySnapshot) === JSON.stringify(snapshot);
      if (!sameAsCurrent) {
        const hasCurrentData = Object.keys(repositorySnapshot.repository).length > 0;
        if (hasCurrentData && !options.skipConfirmation) {
          const message =
            Object.keys(snapshot.repository).length === 0
              ? `Se reiniciará el repositorio de bloques para ${options.reason}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`
              : `Se reemplazará el repositorio de bloques actual por el incluido en ${options.targetDescription}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`;
          if (!window.confirm(message)) {
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
    [clearRepository, replaceRepository, repositorySnapshot, projectId],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (shouldPersistProject && projectId) {
      persistActiveProject(projectId, projectName);
    } else {
      clearStoredActiveProject();
    }
  }, [isHydrated, shouldPersistProject, projectId, projectName]);

  useEffect(() => {
    if (isHydrated) return;
    if (typeof window === 'undefined') {
      setIsHydrated(true);
      return;
    }
    const stored = readStoredActiveProject();
    if (!stored.id) {
      setIsHydrated(true);
      return;
    }
    const record = loadProject(stored.id);
    if (!record) {
      clearStoredActiveProject();
      setProjectId(null);
      setProjectName('');
      setBlock(null);
      setMalla(null);
      setShouldPersistProject(false);
      setIsHydrated(true);
      return;
    }
    if ('masters' in record.data) {
      const normalizedRepo = applyRepositoryChange(
        record.data.repository ?? {},
        {
          reason: 'abrir el proyecto almacenado',
          targetDescription: 'el proyecto almacenado',
          skipConfirmation: true,
        },
      );
      if (!normalizedRepo) {
        setIsHydrated(true);
        return;
      }
      const prepared = prepareMallaProjectState(record.data, normalizedRepo);
      setBlock(prepared.block);
      setMalla(prepared.malla);
    } else {
      applyRepositoryChange(
        {},
        {
          reason: 'abrir el proyecto almacenado',
          targetDescription: 'el proyecto almacenado',
          skipConfirmation: true,
        },
      );
      setBlock({
        draft: cloneBlockContent(toBlockContent(record.data)),
        repoId: null,
        repoName: null,
        repoMetadata: null,
        published: null,
      });
      setMalla(null);
    }
    setProjectId(stored.id);
    setProjectName(record.meta.name ?? stored.name ?? '');
    setShouldPersistProject(true);
    setIsHydrated(true);
  }, [applyRepositoryChange, isHydrated, loadProject]);

  const currentProject: MallaExport | null = useMemo(() => {
    if (malla) {
      return {
        ...malla,
        version: MALLA_SCHEMA_VERSION,
        repository: repositorySnapshot.entries,
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
        grid: { cols: 5, rows: 5 },
        pieces: [],
        values: {},
        floatingPieces: [],
        activeMasterId: 'master',
      };
    }
    return null;
  }, [malla, block, repositorySnapshot]);

  const handleExportProject = () => {
    if (!currentProject) return;
    const json = exportProject({ ...currentProject });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'proyecto'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseProject = useCallback(() => {
    const hasUnsavedBlock = computeDirty();
    if (hasUnsavedBlock) {
      const confirmed = window.confirm(
        'Hay cambios no guardados en el bloque actual. Se perderán si cierras el proyecto. ¿Deseas continuar?',
      );
      if (!confirmed) {
        return;
      }
    }
    flushAutoSave();
    clearRepository();
    setRepositorySnapshot(blocksToRepository([]));
    setBlock(null);
    setMalla(null);
    setProjectId(null);
    setProjectName('');
    setShouldPersistProject(false);
    clearPersistedProjectMetadata();
    storedActiveProjectRef.current = { id: null, name: '' };
    try {
      window.localStorage.removeItem('malla-editor-state');
    } catch {
      /* ignore */
    }
    navigate('/');
  }, [
    clearPersistedProjectMetadata,
    clearRepository,
    computeDirty,
    flushAutoSave,
    navigate,
  ]);

  const handleNewProject = () => {
    const normalized = applyRepositoryChange(
      {},
      {
        reason: 'crear un proyecto nuevo',
        targetDescription: 'el nuevo proyecto',
      },
    );
    if (!normalized) return;
    const name = prompt('Nombre del proyecto') || 'Sin nombre';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock(null);
    setMalla(null);
    clearPersistedProjectMetadata();
    navigate('/block/design');
  };

  const handleLoadBlock = (data: BlockExport, inferredName?: string) => {
    const normalized = applyRepositoryChange(
      {},
      {
        reason: 'importar el bloque seleccionado',
        targetDescription: 'el bloque importado',
      },
    );
    if (!normalized) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock({
      draft: cloneBlockContent(toBlockContent(data)),
      repoId: null,
      repoName: null,
      repoMetadata: null,
      published: null,
    });
    setMalla(null);
    clearPersistedProjectMetadata();
    navigate('/block/design');
  };

  const handleLoadMalla = (data: MallaExport, inferredName?: string) => {
    const normalizedRepo = applyRepositoryChange(
      data.repository ?? {},
      {
        reason: 'importar el proyecto',
        targetDescription: 'el proyecto importado',
      },
    );
    if (!normalizedRepo) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    const prepared = prepareMallaProjectState(data, normalizedRepo);
    setProjectId(id);
    setProjectName(name);
    setBlock(prepared.block);
    setMalla(prepared.malla);
    clearPersistedProjectMetadata();
    navigate('/malla/design');
  };

  const handleImportProjectFile = useCallback(
    async (file: File) => {
      try {
        await handleProjectFile(file, {
          onBlock: handleLoadBlock,
          onMalla: handleLoadMalla,
        });
      } catch {
        window.alert('Archivo inválido');
      }
    },
    [handleLoadBlock, handleLoadMalla],
  );

  const handleOpenProject = (id: string, data: BlockExport | MallaExport, name: string) => {
    if ('masters' in data) {
      const m = data as MallaExport;
      const normalizedRepo = applyRepositoryChange(
        m.repository ?? {},
        {
          reason: 'abrir el proyecto seleccionado',
          targetDescription: 'el proyecto seleccionado',
        },
      );
      if (!normalizedRepo) return;
      const prepared = prepareMallaProjectState(m, normalizedRepo);
      setProjectId(id);
      setProjectName(name);
      setBlock(prepared.block);
      setMalla(prepared.malla);
      setShouldPersistProject(true);
      navigate('/malla/design');
    } else {
      const b = data as BlockExport;
      const normalizedRepo = applyRepositoryChange(
        {},
        {
          reason: 'abrir el proyecto seleccionado',
          targetDescription: 'el proyecto seleccionado',
        },
      );
      if (!normalizedRepo) return;
      setProjectId(id);
      setProjectName(name);
      setBlock({
        draft: cloneBlockContent(toBlockContent(b)),
        repoId: null,
        repoName: null,
        repoMetadata: null,
        published: null,
      });
      setMalla(null);
      setShouldPersistProject(true);
      navigate('/block/design');
    }
  };

  const getRecentProjects = useCallback(
    () => listProjects().slice(0, 10),
    [listProjects],
  );

  const handleOpenRecentProject = useCallback(
    (id: string) => {
      const record = loadProject(id);
      if (!record) return;
      handleOpenProject(id, record.data, record.meta.name);
    },
    [loadProject, handleOpenProject],
  );

  const handleProceedToMalla = (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect,
    targetPath?: string,
    repoId?: string | null,
    published?: BlockContent | null,
  ) => {
    const destination = targetPath ?? '/malla/design';
    if (!malla && destination === '/malla/design') {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
    }
    const content: BlockContent = { template, visual, aspect };
    setBlock((prev) => {
      const nextRepoId =
        repoId !== undefined ? repoId ?? null : prev?.repoId ?? null;
      const draft = cloneBlockContent(content);
      const nextMetadata =
        nextRepoId && repositorySnapshot.metadata[nextRepoId]
          ? repositorySnapshot.metadata[nextRepoId]
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
  };

  const handleRepoIdChange = (repoId: string | null) => {
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
        published:
          nextRepoId && prev.published
            ? cloneBlockContent(prev.published)
            : null,
      };
    });
  };

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

  const handleBlockPublish = (
    payload: {
      repoId: string;
      metadata: BlockMetadata;
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
    },
  ) => {
    const content: BlockContent = {
      template: payload.template,
      visual: payload.visual,
      aspect: payload.aspect,
    };
    const metadata = { ...payload.metadata };
    setBlock((prev) => {
      const nextDraft = cloneBlockContent(content);
      if (!prev) {
        return {
          draft: nextDraft,
          repoId: payload.repoId,
          repoName: metadata.name,
          repoMetadata: metadata,
          published: cloneBlockContent(nextDraft),
        };
      }
      return {
        ...prev,
        draft: nextDraft,
        repoId: payload.repoId ?? prev.repoId,
        repoName: metadata.name,
        repoMetadata: metadata,
        published: cloneBlockContent(nextDraft),
      };
    });
  };

  const loadRepositoryBlock = (stored: StoredBlock) => {
    const content = toBlockContent(stored.data);
    const draft = cloneBlockContent(content);
    const published = cloneBlockContent(content);
    setBlock({
      draft,
      repoId: stored.metadata.uuid,
      repoName: stored.metadata.name,
      repoMetadata: { ...stored.metadata },
      published,
    });
    clearPersistedProjectMetadata();
    if (malla && !projectId) {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
      setMalla(null);
    }
    navigate('/block/design');
  };

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
  }, []);

  const handleOpenRepositoryBlock = (stored: StoredBlock) => {
    const hasUnsavedChanges = computeDirty();
    if (hasUnsavedChanges) {
      const message =
        'Se descartarán los cambios no guardados del bloque actual. ¿Deseas continuar?';
      if (!window.confirm(message)) {
        return;
      }
    }
    loadRepositoryBlock(stored);
  };

  const handleProjectRemoved = useCallback(
    (id: string) => {
      if (!projectId || projectId !== id) return;
      clearPersistedProjectMetadata();
      setProjectId(null);
      setProjectName('');
    },
    [clearPersistedProjectMetadata, projectId],
  );

  const handleProjectRenamed = useCallback(
    (id: string, name: string) => {
      if (!projectId || projectId !== id) return;
      setProjectName(name);
      storedActiveProjectRef.current = { id, name };
    },
    [projectId],
  );

  const handleBlockImported = (stored: StoredBlock) => {
    let shouldLoadImmediately = false;
    setBlock((prev) => {
      if (prev) return prev;
      shouldLoadImmediately = true;
      const content = toBlockContent(stored.data);
      return {
        draft: cloneBlockContent(content),
        repoId: stored.metadata.uuid,
        repoName: stored.metadata.name,
        repoMetadata: { ...stored.metadata },
        published: cloneBlockContent(content),
      };
    });
    if (!shouldLoadImmediately) {
      return;
    }
    loadRepositoryBlock(stored);
  };

  const blockInUse = useMemo(() => {
    if (!block?.repoId) return false;
    if (!malla) return false;
    return malla.pieces?.some(
      (piece) => piece.kind === 'ref' && piece.ref.sourceId === block.repoId,
    );
  }, [block?.repoId, malla]);

  useEffect(() => {
    setBlock((prev) => {
      if (!prev?.repoId) return prev;
      const repoData = repositorySnapshot.repository[prev.repoId];
      const content = repoData ? toBlockContent(repoData) : null;
      if (blockContentEquals(prev.published, content)) return prev;
      return {
        ...prev,
        published: content ? cloneBlockContent(content) : null,
        repoMetadata: repositorySnapshot.metadata[prev.repoId] ?? prev.repoMetadata,
        repoName: repositorySnapshot.metadata[prev.repoId]?.name ?? prev.repoName
      };
    });
  }, [repositorySnapshot]);

  const handleUpdateMaster: React.Dispatch<
    React.SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  > = useCallback(
    (update) => {
      setBlock((prev) => {
        const prevState = prev
          ? (() => {
              const prevContent = cloneBlockContent(prev.draft);
              return {
                template: prevContent.template,
                visual: prevContent.visual,
                aspect: prevContent.aspect,
                repoId: prev.repoId,
              };
            })()
          : null;
        const nextState =
          typeof update === 'function' ? update(prevState) : update;
        if (!nextState) return null;
        const nextRepoId = nextState.repoId ?? prev?.repoId ?? null;
        const draft = cloneBlockContent(toBlockContent(nextState));
        const repoData =
          nextRepoId && repositorySnapshot.repository[nextRepoId]
            ? cloneBlockContent(toBlockContent(repositorySnapshot.repository[nextRepoId]))
            : nextRepoId
              ? prev?.published
                ? cloneBlockContent(prev.published)
                : null
              : null;
        return {
          draft,
          repoId: nextRepoId,
          repoName: nextRepoId
            ? repositorySnapshot.metadata[nextRepoId]?.name ?? prev?.repoName ?? null
            : null,
          repoMetadata: nextRepoId
            ? repositorySnapshot.metadata[nextRepoId] ?? prev?.repoMetadata ?? null
            : null,
          published: repoData,
        };
      });
    },
    [repositorySnapshot],
  );

  const hasActiveBlock = useMemo(() => {
    if (!block) return false;
    return isDraftNonEmpty(block.draft);
  }, [block, isDraftNonEmpty]);

  const hasDirtyBlock = computeDirty();
  const hasPublishedBlock = Boolean(block?.published);

  if (!isHydrated) {
    return null;
  }

  return (
    <AppCommandsProvider>
      <ProceedToMallaProvider
      hasActiveBlock={hasActiveBlock}
      hasDirtyBlock={hasDirtyBlock}
      hasPublishedBlock={hasPublishedBlock}
    >
      <AppLayout
        projectName={projectName}
        hasProject={!!currentProject}
        onNewProject={handleNewProject}
        onImportProjectFile={handleImportProjectFile}
        onExportProject={handleExportProject}
        onCloseProject={handleCloseProject}
        getRecentProjects={getRecentProjects}
        onOpenRecentProject={handleOpenRecentProject}
        onShowIntro={handleShowIntroOverlay}
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
                onOpenProject={handleOpenProject}
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
                      }
                    : undefined
                }
                projectId={projectId ?? undefined}
                projectName={projectName}
                initialMode="edit"
                initialRepoId={block?.repoId ?? null}
                initialRepoName={block?.repoName ?? null}
                initialRepoMetadata={block?.repoMetadata ?? null}
                onRepoIdChange={handleRepoIdChange}
                onRepoMetadataChange={handleRepoMetadataChange}
                onPublishBlock={handleBlockPublish}
                isBlockInUse={blockInUse}
              />
            }
          />
          <Route
            path="/block/style"
            element={
              block ? (
                <BlockEditorScreen
                  onDraftChange={handleBlockDraftChange}
                  initialData={{
                    version: BLOCK_SCHEMA_VERSION,
                    template: block.draft.template,
                    visual: block.draft.visual,
                    aspect: block.draft.aspect,
                  }}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                  initialMode="view"
                  initialRepoId={block.repoId ?? null}
                  initialRepoName={block.repoName ?? null}
                  initialRepoMetadata={block.repoMetadata ?? null}
                  onRepoIdChange={handleRepoIdChange}
                  onRepoMetadataChange={handleRepoMetadataChange}
                  onPublishBlock={handleBlockPublish}
                  isBlockInUse={blockInUse}
                />
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
              />
            }
          />
          <Route
            path="/malla/design"
            element={
              block ? (
                <MallaEditorScreen
                  template={block.published?.template ?? block.draft.template}
                  visual={block.published?.visual ?? block.draft.visual}
                  aspect={block.published?.aspect ?? block.draft.aspect}
                  repoId={block.repoId ?? null}
                  onBack={() => navigate('/block/design')}
                  onUpdateMaster={handleUpdateMaster}
                  initialMalla={malla ?? undefined}
                  onMallaChange={setMalla}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppLayout>
    </ProceedToMallaProvider>
    {isIntroOverlayVisible ? (
      <IntroOverlay onClose={handleHideIntroOverlay} />
    ) : null}
  </AppCommandsProvider>
  );
}