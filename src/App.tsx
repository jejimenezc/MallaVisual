// src/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { BlockTemplate } from './types/curricular.ts';
import type { VisualTemplate, BlockAspect } from './types/visual.ts';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockRepositoryScreen } from './screens/BlockRepositoryScreen';
import { NavTabs } from './components/NavTabs';
import { StatusBar } from './components/StatusBar/StatusBar';
import { AppHeader } from './components/AppHeader';
import { type MallaExport, MALLA_SCHEMA_VERSION } from './utils/malla-io.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io.ts';
import styles from './App.module.css';
import { useProject, useBlocksRepo } from './core/persistence/hooks.ts';
import { ProceedToMallaProvider } from './state/proceed-to-malla';
import type { StoredBlock } from './utils/block-repo.ts';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from './utils/block-content.ts';

function normalizeRepository(repo: Record<string, BlockExport>): Record<string, BlockExport> {
  return Object.fromEntries(
    Object.entries(repo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, data]) => [id, data]),
  );
}

function blocksToRepository(blocks: StoredBlock[]): Record<string, BlockExport> {
  return normalizeRepository(
    blocks.reduce<Record<string, BlockExport>>((acc, { id, data }) => {
      acc[id] = data;
      return acc;
    }, {}),
  );
}

interface BlockState {
  draft: BlockContent;
  repoId: string | null;
  published: BlockContent | null;
}

export default function App(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [block, setBlock] = useState<BlockState | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const { exportProject } = useProject();
  const { listBlocks, replaceRepository, clearRepository } = useBlocksRepo();
  const [repositorySnapshot, setRepositorySnapshot] = useState<Record<string, BlockExport>>(() =>
    blocksToRepository(listBlocks()),
  );

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

  const applyRepositoryChange = (
    repo: Record<string, BlockExport>,
    options: { reason: string; targetDescription: string },
  ): Record<string, BlockExport> | null => {
    const normalized = normalizeRepository(repo);
    const sameAsCurrent =
      JSON.stringify(repositorySnapshot) === JSON.stringify(normalized);
    if (!sameAsCurrent) {
      const hasCurrentData = Object.keys(repositorySnapshot).length > 0;
      if (hasCurrentData) {
        const message =
          Object.keys(normalized).length === 0
            ? `Se reiniciará el repositorio de bloques para ${options.reason}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`
            : `Se reemplazará el repositorio de bloques actual por el incluido en ${options.targetDescription}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`;
        if (!window.confirm(message)) {
          return null;
        }
      }
      if (Object.keys(normalized).length === 0) {
        clearRepository();
      } else {
        replaceRepository(normalized);
      }
    }
    return normalized;
  };

  const currentProject: MallaExport | null = useMemo(() => {
    if (malla) {
      return { ...malla, version: MALLA_SCHEMA_VERSION, repository: repositorySnapshot };
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
        repository: repositorySnapshot,
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

  const handleNewProject = () => {
    const normalized = applyRepositoryChange({}, {
      reason: 'crear un proyecto nuevo',
      targetDescription: 'el nuevo proyecto',
    });
    if (!normalized) return;
    const name = prompt('Nombre del proyecto') || 'Sin nombre';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock(null);
    setMalla(null);
    navigate('/block/design');
  };

  const handleLoadBlock = (data: BlockExport, inferredName?: string) => {
    const normalized = applyRepositoryChange({}, {
      reason: 'importar el bloque seleccionado',
      targetDescription: 'el bloque importado',
    });
    if (!normalized) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock({
      draft: cloneBlockContent(toBlockContent(data)),
      repoId: null,
      published: null,
    });
    setMalla(null);
    navigate('/block/design');
  };

  const handleLoadMalla = (data: MallaExport, inferredName?: string) => {
    const normalizedRepo = applyRepositoryChange(data.repository ?? {}, {
      reason: 'importar el proyecto',
      targetDescription: 'el proyecto importado',
    });
    if (!normalizedRepo) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    const firstId = Object.keys(data.masters)[0];
    const activeId = data.activeMasterId ?? firstId;
    const active = data.masters[activeId];
    const repoId = normalizedRepo[activeId] ? activeId : null;
    const draft = cloneBlockContent(toBlockContent(active));
    const published = repoId
      ? normalizedRepo[repoId]
        ? cloneBlockContent(toBlockContent(normalizedRepo[repoId]))
        : null
      : null;
    setBlock({
      draft,
      repoId,
      published,
    });
    setMalla({ ...data, version: MALLA_SCHEMA_VERSION, repository: normalizedRepo });
    navigate('/malla/design');
  };

  const handleOpenProject = (id: string, data: BlockExport | MallaExport, name: string) => {
    if ('masters' in data) {
      const m = data as MallaExport;
      const normalizedRepo = applyRepositoryChange(m.repository ?? {}, {
        reason: 'abrir el proyecto seleccionado',
        targetDescription: 'el proyecto seleccionado',
      });
      if (!normalizedRepo) return;
      setProjectId(id);
      setProjectName(name);
      const firstId = Object.keys(m.masters)[0];
      const activeId = m.activeMasterId ?? firstId;
      const active = m.masters[activeId];
      const repoId = normalizedRepo[activeId] ? activeId : null;
      const draft = cloneBlockContent(toBlockContent(active));
      const published = repoId
        ? normalizedRepo[repoId]
          ? cloneBlockContent(toBlockContent(normalizedRepo[repoId]))
          : null
        : null;
      setBlock({
        draft,
        repoId,
        published,
      });
      setMalla({ ...m, version: MALLA_SCHEMA_VERSION, repository: normalizedRepo });
      navigate('/malla/design');
    } else {
      const b = data as BlockExport;
      const normalizedRepo = applyRepositoryChange({}, {
        reason: 'abrir el proyecto seleccionado',
        targetDescription: 'el proyecto seleccionado',
      });
      if (!normalizedRepo) return;
      setProjectId(id);
      setProjectName(name);
      setBlock({
        draft: cloneBlockContent(toBlockContent(b)),
        repoId: null,
        published: null,
      });
      setMalla(null);
      navigate('/block/design');
    }
  };

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
        published: nextPublished,
      };
    });
  };

  const handleRepoIdChange = (repoId: string | null) => {
    setBlock((prev) => {
      if (!prev) return prev;
      const nextRepoId = repoId ?? null;
      if (prev.repoId === nextRepoId) return prev;
      return {
        ...prev,
        repoId: nextRepoId,
        published:
          nextRepoId && prev.published
            ? cloneBlockContent(prev.published)
            : null,
      };
    });
  };

  const handleBlockPublish = (
    payload: {
      repoId: string;
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
    setBlock((prev) => {
      const nextDraft = cloneBlockContent(content);
      if (!prev) {
        return {
          draft: nextDraft,
          repoId: payload.repoId,
          published: cloneBlockContent(nextDraft),
        };
      }
      return {
        ...prev,
        draft: nextDraft,
        repoId: payload.repoId ?? prev.repoId,
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
      repoId: stored.id,
      published,
    });
    if (malla) {
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

  const handleBlockImported = (stored: StoredBlock) => {
    let shouldLoadImmediately = false;
    setBlock((prev) => {
      if (prev) return prev;
      shouldLoadImmediately = true;
      const content = toBlockContent(stored.data);
      return {
        draft: cloneBlockContent(content),
        repoId: stored.id,
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
      const repoData = repositorySnapshot[prev.repoId];
      const content = repoData ? toBlockContent(repoData) : null;
      if (blockContentEquals(prev.published, content)) return prev;
      return {
        ...prev,
        published: content ? cloneBlockContent(content) : null,
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
  > = (update) => {
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
        nextRepoId && repositorySnapshot[nextRepoId]
          ? cloneBlockContent(toBlockContent(repositorySnapshot[nextRepoId]))
          : nextRepoId
            ? prev?.published
              ? cloneBlockContent(prev.published)
              : null
            : null;
      return {
        draft,
        repoId: nextRepoId,
        published: repoData,
      };
    });
  };

  const screenTitle = useMemo(() => {
    switch (location.pathname) {
      case '/block/design':
        return 'Diseño de bloque';
      case '/block/style':
        return 'Estilo de bloque';
      case '/blocks':
        return 'Repositorio de bloques';
      case '/malla/design':
        return 'Diseño de malla';
      default:
        return 'Escritorio';
    }
  }, [location.pathname]);

  const hasActiveBlock = useMemo(() => {
    if (!block) return false;
    return isDraftNonEmpty(block.draft);
  }, [block, isDraftNonEmpty]);

  const hasDirtyBlock = computeDirty();
  const hasPublishedBlock = Boolean(block?.published);

  return (
    <ProceedToMallaProvider
      hasActiveBlock={hasActiveBlock}
      hasDirtyBlock={hasDirtyBlock}
      hasPublishedBlock={hasPublishedBlock}
    >
      <div className={styles.appContainer}>
        <AppHeader />
        <NavTabs />
        <StatusBar
          projectName={projectName}
          screenTitle={screenTitle}
          schemaVersion={BLOCK_SCHEMA_VERSION}
          onExportProject={handleExportProject}
          hasProject={!!currentProject}
        />
        <main className={styles.appMain}>
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
                onRepoIdChange={handleRepoIdChange}
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
                  onRepoIdChange={handleRepoIdChange}
                  onPublishBlock={handleBlockPublish}
                  isBlockInUse={blockInUse}
                />
              ) : (
                <Navigate to="/block/design" />
              )
            }
          />
          <Route
            path="/blocks"
            element={
              <BlockRepositoryScreen
                onBlockImported={handleBlockImported}
                onOpenBlock={handleOpenRepositoryBlock}
              />
            }          />
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
                <Navigate to="/block/design" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  </ProceedToMallaProvider>
  );
}