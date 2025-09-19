// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
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

export default function App(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [block, setBlock] = useState<{
    template: BlockTemplate;
    visual: VisualTemplate;
    aspect: BlockAspect;
    repoId?: string | null;
  } | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const { exportProject } = useProject();
  const { listBlocks, replaceRepository, clearRepository } = useBlocksRepo();
  const [repositorySnapshot, setRepositorySnapshot] = useState<Record<string, BlockExport>>(() =>
    blocksToRepository(listBlocks()),
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
            template: block.template,
            visual: block.visual,
            aspect: block.aspect,
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

  const handleLoadBlock = (data: BlockExport) => {
    const normalized = applyRepositoryChange({}, {
      reason: 'importar el bloque seleccionado',
      targetDescription: 'el bloque importado',
    });
    if (!normalized) return;
    const name = prompt('Nombre del proyecto') || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock({
      template: data.template,
      visual: data.visual,
      aspect: data.aspect,
      repoId: null,
    });
    setMalla(null);
    navigate('/block/design');
  };

  const handleLoadMalla = (data: MallaExport) => {
    const normalizedRepo = applyRepositoryChange(data.repository ?? {}, {
      reason: 'importar el proyecto',
      targetDescription: 'el proyecto importado',
    });
    if (!normalizedRepo) return;
    const name = prompt('Nombre del proyecto') || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    const firstId = Object.keys(data.masters)[0];
    const activeId = data.activeMasterId ?? firstId;
    const active = data.masters[activeId];
    const repoId = normalizedRepo[activeId] ? activeId : null;
    setBlock({
      template: active.template,
      visual: active.visual,
      aspect: active.aspect,
      repoId,
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
      setBlock({
        template: active.template,
        visual: active.visual,
        aspect: active.aspect,
        repoId,
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
        template: b.template,
        visual: b.visual,
        aspect: b.aspect,
        repoId: null,
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
  ) => {
    const destination = targetPath ?? '/malla/design';
    if (!malla && destination === '/malla/design') {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
    }
    setBlock((prev) => ({
      template,
      visual,
      aspect,
      repoId: repoId !== undefined ? repoId : prev?.repoId ?? null,
    }));
    navigate(destination);
  };

  const handleRepoIdChange = (repoId: string | null) => {
    setBlock((prev) => {
      if (!prev) return prev;
      if (prev.repoId === repoId) return prev;
      return { ...prev, repoId };
    });
  };

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
        ? {
            template: prev.template,
            visual: prev.visual,
            aspect: prev.aspect,
            repoId: prev.repoId ?? null,
          }
        : null;
      const nextState =
        typeof update === 'function' ? update(prevState) : update;
      if (!nextState) return null;
      return {
        template: nextState.template,
        visual: nextState.visual,
        aspect: nextState.aspect,
        repoId: nextState.repoId ?? prev?.repoId ?? null,
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

  return (
    <ProceedToMallaProvider>
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
                initialData={
                  block
                    ? {
                        version: BLOCK_SCHEMA_VERSION,
                        template: block.template,
                        visual: block.visual,
                        aspect: block.aspect,
                      }
                    : undefined
                }
                projectId={projectId ?? undefined}
                projectName={projectName}
                initialMode="edit"
                initialRepoId={block?.repoId ?? null}
                onRepoIdChange={handleRepoIdChange}
              />
            }
          />
          <Route
            path="/block/style"
            element={
              block ? (
                <BlockEditorScreen
                  initialData={{
                    version: BLOCK_SCHEMA_VERSION,
                    template: block.template,
                    visual: block.visual,
                    aspect: block.aspect,
                  }}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                  initialMode="view"
                  initialRepoId={block.repoId ?? null}
                  onRepoIdChange={handleRepoIdChange}
                />
              ) : (
                <Navigate to="/block/design" />
              )
            }
          />
          <Route path="/blocks" element={<BlockRepositoryScreen />} />
          <Route
            path="/malla/design"
            element={
              block ? (
                <MallaEditorScreen
                  template={block.template}
                  visual={block.visual}
                  aspect={block.aspect}
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