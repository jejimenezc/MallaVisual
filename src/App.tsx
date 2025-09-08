// src/App.tsx
import React, { useState } from 'react';
import type { JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockTemplate } from './types/curricular';
import { VisualTemplate, BlockAspect } from './types/visual';
import type { MallaExport } from './utils/malla-io';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io';
import styles from './App.module.css';

export default function App(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [block, setBlock] = useState<{
    template: BlockTemplate;
    visual: VisualTemplate;
    aspect: BlockAspect;
  } | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleProceed = (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect
  ) => {
    if (!malla) {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
    }
    setBlock({ template, visual, aspect });
    navigate('/malla');
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}><h1>Mallas Curriculares</h1></header>
      <main className={styles.appMain}>
        {location.pathname === '/' && (
          <HomeScreen
            onNewBlock={() => {
              const name = prompt('Nombre del proyecto') || 'Sin nombre';
              const id = crypto.randomUUID();
              setProjectId(id);
              setProjectName(name);
              setBlock(null);
              setMalla(null);
              navigate('/bloque');
            }}
            onLoadBlock={(data: BlockExport) => {
              const name = prompt('Nombre del proyecto') || 'Importado';
              const id = crypto.randomUUID();
              setProjectId(id);
              setProjectName(name);
              setBlock({
                template: data.template,
                visual: data.visual,
                aspect: data.aspect,
              });
              setMalla(null);
              navigate('/bloque');
            }}
            onLoadMalla={(data: MallaExport) => {
              const name = prompt('Nombre del proyecto') || 'Importado';
              const id = crypto.randomUUID();
              setProjectId(id);
              setProjectName(name);
              setBlock({
                template: data.master.template,
                visual: data.master.visual,
                aspect: data.master.aspect,
              });
              setMalla(data);
              navigate('/malla');
            }}
            onOpenProject={(id, data, name) => {
              setProjectId(id);
              setProjectName(name);
              if ('master' in data) {
                setBlock({
                  template: data.master.template,
                  visual: data.master.visual,
                  aspect: data.master.aspect,
                });
                setMalla(data as MallaExport);
                navigate('/malla');
              } else {
                const b = data as BlockExport;
                setBlock({
                  template: b.template,
                  visual: b.visual,
                  aspect: b.aspect,
                });
                setMalla(null);
                navigate('/bloque');
              }
            }}
          />
    )}
        {location.pathname === '/bloque' && (
          <BlockEditorScreen
            onProceedToMalla={handleProceed}
            initialData={
              block
                ? { version: BLOCK_SCHEMA_VERSION, ...block }
                : undefined
            }
            projectId={projectId ?? undefined}
            projectName={projectName}
          />
        )}
        {location.pathname === '/malla' && block && (
          <MallaEditorScreen
            template={block.template}
            visual={block.visual}
            aspect={block.aspect}
            onBack={() => navigate('/bloque')}
            onUpdateMaster={setBlock}
            initialMalla={malla ?? undefined}
            onMallaChange={setMalla}
            projectId={projectId ?? undefined}
            projectName={projectName}
          />
        )}
      </main>
    </div>
  );
}