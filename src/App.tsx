// src/App.tsx
import React, { useState } from 'react';
import type { JSX } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { BlockTemplate } from './types/curricular.ts';
import type { VisualTemplate, BlockAspect } from './types/visual.ts';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockRepositoryScreen } from './screens/BlockRepositoryScreen';
import { NavTabs } from './components/NavTabs';
import type { MallaExport } from './utils/malla-io';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io';
import styles from './App.module.css';

export default function App(): JSX.Element {
  const navigate = useNavigate();
  const [block, setBlock] = useState<{
    template: BlockTemplate;
    visual: VisualTemplate;
    aspect: BlockAspect;
  } | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleNewProject = () => {
    const name = prompt('Nombre del proyecto') || 'Sin nombre';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock(null);
    setMalla(null);
    navigate('/block/design');
  };

  const handleLoadBlock = (data: BlockExport) => {
    const name = prompt('Nombre del proyecto') || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock({ template: data.template, visual: data.visual, aspect: data.aspect });
    setMalla(null);
    navigate('/block/design');
  };

  const handleLoadMalla = (data: MallaExport) => {
    const name = prompt('Nombre del proyecto') || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    const firstId = Object.keys(data.masters)[0];
    const activeId = data.activeMasterId ?? firstId;
    const active = data.masters[activeId];
    setBlock({ template: active.template, visual: active.visual, aspect: active.aspect });
    setMalla(data);
    navigate('/malla/design');
  };

  const handleOpenProject = (id: string, data: BlockExport | MallaExport, name: string) => {
    setProjectId(id);
    setProjectName(name);
    if ('masters' in data) {
      const m = data as MallaExport;
      const firstId = Object.keys(m.masters)[0];
      const activeId = m.activeMasterId ?? firstId;
      const active = m.masters[activeId];
      setBlock({ template: active.template, visual: active.visual, aspect: active.aspect });
      setMalla(m);
      navigate('/malla/design');
    } else {
      const b = data as BlockExport;
      setBlock({ template: b.template, visual: b.visual, aspect: b.aspect });
      setMalla(null);
      navigate('/block/design');
    }
  };

  const handleProceedToMalla = (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect,
  ) => {
    if (!malla) {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
    }
    setBlock({ template, visual, aspect });
    navigate('/malla/design');
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>Mallas Curriculares</h1>
      </header>
      <NavTabs />
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
                  block ? { version: BLOCK_SCHEMA_VERSION, ...block } : undefined
                }
                projectId={projectId ?? undefined}
                projectName={projectName}
                initialMode="edit"
              />
            }
          />
          <Route
            path="/block/style"
            element={
              block ? (
                <BlockEditorScreen
                  initialData={{ version: BLOCK_SCHEMA_VERSION, ...block }}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                  initialMode="view"
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
                  onBack={() => navigate('/block/design')}
                  onUpdateMaster={setBlock}
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
  );
}