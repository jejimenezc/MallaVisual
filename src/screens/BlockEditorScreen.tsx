// src/screens/BlockEditorScreen.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BlockTemplate } from '../types/curricular.ts';
import { BlockTemplateEditor } from '../components/BlockTemplateEditor';
import { BlockTemplateViewer } from '../components/BlockTemplateViewer';
import { ContextSidebarPanel } from '../components/ContextSidebarPanel';
import { FormatStylePanel } from '../components/FormatStylePanel';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { BlockExport } from '../utils/block-io.ts';
import type { MallaExport } from '../utils/malla-io.ts';
import { MALLA_SCHEMA_VERSION } from '../utils/malla-io.ts';
import { BLOCK_SCHEMA_VERSION } from '../utils/block-io.ts';
import { useProject, useBlocksRepo } from '../core/persistence/hooks.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import type { EditorSidebarState } from '../types/panel.ts';
import { useProceedToMalla } from '../state/proceed-to-malla';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from '../utils/block-content.ts';


const generateEmptyTemplate = (): BlockTemplate =>
  Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ active: false, label: '', type: undefined }))
  );

interface BlockEditorScreenProps {
  onProceedToMalla?: (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect,
    targetPath?: string,
    repoId?: string | null,
    published?: BlockContent | null,
  ) => void;
  onDraftChange?: (draft: BlockContent) => void;
  initialData?: BlockExport;
  projectId?: string;
  projectName?: string;
  initialMode?: 'edit' | 'view';
  initialRepoId?: string | null;
  onRepoIdChange?: (repoId: string | null) => void;
  onPublishBlock?: (payload: {
    repoId: string;
    template: BlockTemplate;
    visual: VisualTemplate;
    aspect: BlockAspect;
  }) => void;
  isBlockInUse?: boolean;
}

export const BlockEditorScreen: React.FC<BlockEditorScreenProps> = ({
  onProceedToMalla,
  onDraftChange,
  initialData,
  projectId,
  projectName,
  initialMode = 'edit',
  initialRepoId,
  onRepoIdChange,
  onPublishBlock,
  isBlockInUse = false,
}) => {
  const { setHandler } = useProceedToMalla();
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
  const { autoSave, flushAutoSave } = useProject({ projectId, projectName });
  const { saveBlock: repoSaveBlock, listBlocks } = useBlocksRepo();
  const savedRef = useRef<string | null>(null);
  const [repoBlocks, setRepoBlocks] = useState<StoredBlock[]>(() => listBlocks());

  useEffect(() => {
    const sync = () => setRepoBlocks(listBlocks());
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('block-repo-updated', sync);
    return () => window.removeEventListener('block-repo-updated', sync);
  }, [listBlocks]);

  useEffect(() => {
    if (!initialData) return;
    const content = cloneBlockContent(toBlockContent(initialData));
    setTemplate(content.template);
    setVisual(content.visual);
    setAspect(content.aspect);
  }, [initialData]);

  useEffect(() => {
    if (!projectId) return;
    const repository = Object.fromEntries(
      repoBlocks
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(({ id, data }) => [id, data]),
    );

    const data: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: { master: { template, visual, aspect } },
      grid: { cols: 5, rows: 5 },
      pieces: [],
      values: {},
      floatingPieces: [],
      activeMasterId: 'master',
      repository,
    };
    const serialized = JSON.stringify(data);
    if (savedRef.current === serialized) return;
    savedRef.current = serialized;
    autoSave(data);
  }, [template, visual, aspect, projectId, projectName, autoSave, repoBlocks]);

  useEffect(() => () => flushAutoSave(), [flushAutoSave]);

  const [repoId, setRepoId] = useState<string | null>(initialRepoId ?? null);

  useEffect(() => {
    setRepoId(initialRepoId ?? null);
  }, [initialRepoId]);

  const draftContent = useMemo<BlockContent>(
    () => ({ template, visual, aspect }),
    [template, visual, aspect],
  );

  useEffect(() => {
    if (!onDraftChange) return;
    onDraftChange(cloneBlockContent(draftContent));
  }, [draftContent, onDraftChange]);
  const repoRecord = useMemo(
    () => (repoId ? repoBlocks.find((b) => b.id === repoId) ?? null : null),
    [repoBlocks, repoId],
  );
  const repoContent = useMemo(
    () => (repoRecord ? toBlockContent(repoRecord.data) : null),
    [repoRecord],
  );
  const isDraftDirty = useMemo(
    () => (!repoId || !repoContent || !blockContentEquals(repoContent, draftContent)),
    [repoId, repoContent, draftContent],
  );

  const handleSaveToRepo = useCallback((): string | null => {
    if (repoId && isBlockInUse) {
      const confirmed = window.confirm(
        'Se publicará la actualización de un bloque en uso. Esto actualizará todas las piezas referenciadas de la malla. ¿Deseas continuar?'
      );
      if (!confirmed) return null;
    }
    const wasNew = !repoId;
    let id = repoId;
    if (!id) {
      const defaultName = projectName ?? '';
      const input = prompt('Nombre del bloque', defaultName);
      if (input === null) return null;
      const trimmed = input.trim();
      if (!trimmed) {
        alert('Debes ingresar un nombre para el bloque.');
        return null;
      }
      id = trimmed;
      setRepoId(id);
      onRepoIdChange?.(id);
    }
    repoSaveBlock({
      id,
      data: {
        version: BLOCK_SCHEMA_VERSION,
        template: draftContent.template,
        visual: draftContent.visual,
        aspect: draftContent.aspect,
      },
    });
    const savedContent = cloneBlockContent(draftContent);
    onPublishBlock?.({
      repoId: id,
      template: savedContent.template,
      visual: savedContent.visual,
      aspect: savedContent.aspect,
    });
    alert(wasNew ? 'Bloque guardado' : 'Bloque actualizado');
    return id;
  }, [
    repoId,
    projectName,
    repoSaveBlock,
    draftContent,
    onRepoIdChange,
    onPublishBlock,
    isBlockInUse,
  ]);

  const ensurePublishedAndProceed = useCallback(
    (targetPath?: string) => {
      if (!onProceedToMalla) return;
      const destination = targetPath ?? '/malla/design';
      if (destination === '/malla/design' && isDraftDirty) {
        const message = repoId
          ? 'Para pasar al diseño de malla, actualiza la publicación del bloque en el repositorio. ¿Deseas hacerlo ahora?'
          : 'Para pasar al diseño de malla, publica el borrador en el repositorio. ¿Deseas hacerlo ahora?';
        const confirmed = window.confirm(message);
        if (!confirmed) return;
        const savedId = handleSaveToRepo();
        if (!savedId) return;
        onProceedToMalla(
          draftContent.template,
          draftContent.visual,
          draftContent.aspect,
          destination,
          savedId,
          draftContent,
        );
        return;
      }
      const publishedContent =
        repoId && repoContent && !isDraftDirty
          ? repoContent
          : repoId
            ? draftContent
            : null;
      onProceedToMalla(
        draftContent.template,
        draftContent.visual,
        draftContent.aspect,
        destination,
        repoId ?? null,
        publishedContent,
      );
    },
    [
      onProceedToMalla,
      isDraftDirty,
      repoId,
      handleSaveToRepo,
      draftContent,
      repoContent,
    ],
  );

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
      <Button onClick={() => ensurePublishedAndProceed()}>
        ➡️ Malla
      </Button>
    </Header>
  );

  useEffect(() => {
    if (!onProceedToMalla) {
      setHandler(null);
      return;
    }
    setHandler(() => ensurePublishedAndProceed);
    return () => setHandler(null);
  }, [setHandler, onProceedToMalla, ensurePublishedAndProceed]);

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
            <Button onClick={() => handleSaveToRepo()}>
              {repoId ? 'Actualizar bloque' : 'Guardar en repositorio'}
            </Button>
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
          <Button onClick={() => handleSaveToRepo()}>
            {repoId ? 'Actualizar bloque' : 'Guardar en repositorio'}
          </Button>
        </div>
      }
    />
  );
};
