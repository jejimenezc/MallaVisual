// src/screens/BlockEditorScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BlockTemplate } from '../types/curricular.ts';
import { BlockTemplateEditor } from '../components/BlockTemplateEditor';
import { BlockTemplateViewer } from '../components/BlockTemplateViewer';
import { ContextSidebarPanel } from '../components/ContextSidebarPanel';
import { FormatStylePanel } from '../components/FormatStylePanel';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { VisualTemplate, BlockAspect } from '../types/visual.ts';
import { exportBlock, importBlock } from '../utils/block-io.ts';
import type { BlockExport } from '../utils/block-io.ts';
import type { MallaExport } from '../utils/malla-io.ts';
import { MALLA_SCHEMA_VERSION } from '../utils/malla-io.ts';
import { createLocalStorageProjectRepository } from '../utils/master-repo.ts';
import { saveBlock as repoSaveBlock } from '../utils/block-repo.ts';
import { BLOCK_SCHEMA_VERSION } from '../utils/block-io.ts';
import type { EditorSidebarState } from '../types/panel.ts';


const generateEmptyTemplate = (): BlockTemplate =>
  Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ active: false, label: '', type: undefined }))
  );

interface BlockEditorScreenProps {
  onProceedToMalla?: (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect
  ) => void;
  initialData?: BlockExport;
  projectId?: string;
  projectName?: string;
  initialMode?: 'edit' | 'view';
}

export const BlockEditorScreen: React.FC<BlockEditorScreenProps> = ({
  onProceedToMalla,
  initialData,
  projectId,
  projectName,
  initialMode = 'edit',
}) => {
  const [mode, setMode] = useState<'edit' | 'view'>(initialMode);
  const [template, setTemplate] = useState<BlockTemplate>(
    initialData?.template ?? generateEmptyTemplate()
  );
  const [visual, setVisual] = useState<VisualTemplate>(
    initialData?.visual ?? {}
  ); // mapa visual separado
  const [aspect, setAspect] = useState<BlockAspect>(
    initialData?.aspect ?? '1/1'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectRepo = useMemo(
    () => createLocalStorageProjectRepository<MallaExport>(),
    []
  );

    useEffect(() => {
    if (initialData) {
      setTemplate(initialData.template);
      setVisual(initialData.visual);
      setAspect(initialData.aspect);
    }
  }, [initialData]);

  useEffect(() => {
    if (!projectId) return;
    const data: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: { master: { template, visual, aspect } },
      grid: { cols: 5, rows: 5 },
      pieces: [],
      values: {},
      floatingPieces: [],
      activeMasterId: 'master',
    };
    projectRepo.save(projectId, projectName ?? 'Proyecto', data);
  }, [template, visual, aspect, projectId, projectName, projectRepo]);

  const handleSaveToRepo = () => {
    const name = prompt('Nombre del bloque') || '';
    if (!name) return;
    repoSaveBlock({
      id: name,
      data: { version: BLOCK_SCHEMA_VERSION, template, visual, aspect },
    });
    window.dispatchEvent(new Event('block-repo-updated'));
    alert('Bloque guardado');
  };
  
  const handleExport = () => {
    const json = exportBlock(template, visual, aspect);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'block.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = importBlock(text);
        setTemplate(data.template);
        setVisual(data.visual);
        setAspect(data.aspect);
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  // Estado que publica el editor para poblar el ContextSidebarPanel
  const [editorSidebar, setEditorSidebar] = useState<EditorSidebarState | null>(null);

  // Selección en modo vista
    const [selectedCoord, setSelectedCoord] =
      useState<{ row: number; col: number } | undefined>(undefined);
    useEffect(() => { setSelectedCoord(undefined); }, [mode]);

  const header = (
    <Header title="Editor de Bloques">
      <Button
        className={mode === 'edit' ? 'active' : ''}
        onClick={() => setMode('edit')}
      >
        ✏️ Editar
      </Button>
      <Button
        className={mode === 'view' ? 'active' : ''}
        onClick={() => setMode('view')}
      >
        👁️ Vista
      </Button>
      <Button onClick={handleExport}>⬇️ Exportar</Button>
      <Button onClick={() => fileInputRef.current?.click()}>⬆️ Importar</Button>
      <Button onClick={() => onProceedToMalla?.(template, visual, aspect)}>
        ➡️ Malla
      </Button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </Header>
  );

  if (mode === 'edit') {
    return (
      <TwoPaneLayout
        header={header}
        left={
          <BlockTemplateEditor
            template={template}
            setTemplate={setTemplate}
            onSidebarStateChange={setEditorSidebar}
          />
        }
        right={
          <div>
            <ContextSidebarPanel
              selectedCount={editorSidebar?.selectedCount ?? 0}
              canCombine={editorSidebar?.canCombine ?? false}
              canSeparate={editorSidebar?.canSeparate ?? false}
              onCombine={editorSidebar?.handlers.onCombine ?? (() => {})}
              onSeparate={editorSidebar?.handlers.onSeparate ?? (() => {})}
              selectedCell={editorSidebar?.selectedCell ?? null}
              selectedCoord={editorSidebar?.selectedCoord}
              onUpdateCell={(updated, coord) => {
                const fallback = editorSidebar?.selectedCoord;
                const target = coord ?? fallback;
                if (!target || !editorSidebar?.handlers.onUpdateCell) return;
                editorSidebar.handlers.onUpdateCell(updated, target);
              }}
              combineDisabledReason={editorSidebar?.combineDisabledReason}
              template={template}
            />
            <Button onClick={handleSaveToRepo}>Agregar al repositorio</Button>
          </div>
        }
      />
    );
  }

  // MODO VISTA
  return (
    <TwoPaneLayout
      header={header}
      left={
        <BlockTemplateViewer
          template={template}
          visualTemplate={visual}
          selectedCoord={selectedCoord}
          onSelectCoord={setSelectedCoord}
          aspect={aspect}
        />
      }
      right={
        <div>
          <FormatStylePanel
            selectedCoord={selectedCoord}
            visualTemplate={visual}
            onUpdateVisual={setVisual}
            template={template}
            blockAspect={aspect}
            onUpdateAspect={setAspect}
          />
          <Button onClick={handleSaveToRepo}>Agregar al repositorio</Button>
        </div>
      }
    />
  );
};
