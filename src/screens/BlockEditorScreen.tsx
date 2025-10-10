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
import {
  buildBlockId,
  createBlockId,
  parseBlockId,
  type BlockMetadata,
} from '../types/block.ts';
import type { EditorSidebarState } from '../types/panel.ts';
import { useProceedToMalla } from '../state/proceed-to-malla';
import type { ProceedToMallaHandler } from '../state/proceed-to-malla';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from '../utils/block-content.ts';
import { blocksToRepository } from '../utils/repository-snapshot.ts';


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
  initialRepoName?: string | null;
  initialRepoMetadata?: BlockMetadata | null;
  onRepoIdChange?: (repoId: string | null) => void;
  onRepoMetadataChange?: (metadata: BlockMetadata | null) => void;
  onPublishBlock?: (payload: {
    repoId: string;
    metadata: BlockMetadata;
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
  initialRepoName,
  initialRepoMetadata,
  onRepoIdChange,
  onRepoMetadataChange,
  onPublishBlock,
  isBlockInUse = false,
}) => {
  const {
    setHandler,
    resetHandler,
    defaultProceedToMalla,
    skipNextDirtyBlockCheck,
  } = useProceedToMalla();
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
  const {
    saveBlock: repoSaveBlock,
    listBlocks,
    updateBlockMetadata: repoUpdateBlockMetadata,
  } = useBlocksRepo();
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
    const snapshot = blocksToRepository(repoBlocks);

    const data: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: { master: { template, visual, aspect } },
      grid: { cols: 5, rows: 5 },
      pieces: [],
      values: {},
      floatingPieces: [],
      activeMasterId: 'master',
      repository: snapshot.entries,
    };
    const serialized = JSON.stringify(data);
    if (savedRef.current === serialized) return;
    savedRef.current = serialized;
    autoSave(data);
  }, [template, visual, aspect, projectId, projectName, autoSave, repoBlocks]);

  useEffect(() => () => flushAutoSave(), [flushAutoSave]);

  const [repoId, setRepoId] = useState<string | null>(initialRepoId ?? null);
  const [repoMetadata, setRepoMetadata] = useState<BlockMetadata | null>(
    initialRepoMetadata ?? null,
  );
  const [repoName, setRepoName] = useState<string>(
    initialRepoMetadata?.name ?? initialRepoName ?? '',
  );

  useEffect(() => {
    setRepoId(initialRepoId ?? null);
  }, [initialRepoId]);

  useEffect(() => {
    if (initialRepoMetadata) {
      setRepoMetadata(initialRepoMetadata);
      setRepoName(initialRepoMetadata.name);
      return;
    }
    if (!initialRepoId) {
      setRepoMetadata(null);
      if (initialRepoName) {
        setRepoName(initialRepoName);
      } else if (!repoRecord) {
        setRepoName('');
      }
    }
  }, [initialRepoMetadata, initialRepoId, initialRepoName]);

  const draftContent = useMemo<BlockContent>(
    () => ({ template, visual, aspect }),
    [template, visual, aspect],
  );

  useEffect(() => {
    if (!onDraftChange) return;
    onDraftChange(cloneBlockContent(draftContent));
  }, [draftContent, onDraftChange]);
  const repoRecord = useMemo(
    () => (repoId ? repoBlocks.find((b) => b.metadata.uuid === repoId) ?? null : null),
    [repoBlocks, repoId],
  );

  useEffect(() => {
    if (!repoRecord) return;
    setRepoMetadata(repoRecord.metadata);
    setRepoName(repoRecord.metadata.name);
    onRepoMetadataChange?.(repoRecord.metadata);
  }, [repoRecord, onRepoMetadataChange]);
  const repoContent = useMemo(
    () => (repoRecord ? toBlockContent(repoRecord.data) : null),
    [repoRecord],
  );
  const isDraftDirty = useMemo(
    () => (!repoId || !repoContent || !blockContentEquals(repoContent, draftContent)),
    [repoId, repoContent, draftContent],
  );

  const handleSaveToRepo = useCallback((): string | null => {
    const currentName = repoName.trim();
    const wasNew = !repoId;
    const blockLabel = currentName || 'el bloque';
    if (repoId && isBlockInUse) {
      const confirmed = window.confirm(
        `Se publicará la actualización de "${blockLabel}" que está en uso. Esto actualizará todas las piezas referenciadas de la malla. ¿Deseas continuar?`,
      );
      if (!confirmed) return null;
    }
    let name = currentName;
    if (!name) {
      const defaultName = projectName ?? repoMetadata?.name ?? '';
      const input = prompt('Nombre del bloque', defaultName);
      if (input === null) return null;
      name = input.trim();
      if (!name) {
        alert('Debes ingresar un nombre para el bloque.');
        return null;
      }
      setRepoName(name);
    }
    const now = new Date().toISOString();
    const existingMetadata = repoMetadata ?? repoRecord?.metadata ?? null;
    let metadata: BlockMetadata;
    let storedId: string;
    if (!repoId) {
      const baseProject = existingMetadata?.projectId ?? projectId ?? 'repository';
      const generatedId = createBlockId(baseProject);
      const parsed = parseBlockId(generatedId);
      metadata = {
        projectId: parsed.projectId,
        uuid: parsed.uuid,
        name,
        updatedAt: now,
      };
      storedId = generatedId;
      setRepoId(parsed.uuid);
      onRepoIdChange?.(parsed.uuid);
    } else {
      const baseProject = existingMetadata?.projectId ?? projectId ?? 'repository';
      const uuid = existingMetadata?.uuid ?? repoId;
      metadata = {
        projectId: baseProject,
        uuid,
        name,
        updatedAt: now,
      };
      storedId = buildBlockId(baseProject, uuid);
    }

    repoSaveBlock({
      id: storedId,
      metadata,
      data: {
        version: BLOCK_SCHEMA_VERSION,
        template: draftContent.template,
        visual: draftContent.visual,
        aspect: draftContent.aspect,
        metadata,
      },
    });

    setRepoMetadata(metadata);
    setRepoName(metadata.name);
    onRepoMetadataChange?.(metadata);

    const savedContent = cloneBlockContent(draftContent);
    onPublishBlock?.({
      repoId: metadata.uuid,
      metadata,
      template: savedContent.template,
      visual: savedContent.visual,
      aspect: savedContent.aspect,
    });
    alert(wasNew ? `Bloque "${metadata.name}" guardado` : `Bloque "${metadata.name}" actualizado`);
    return metadata.uuid;
  }, [
    repoId,
    repoName,
    repoMetadata,
    repoRecord,
    projectName,
    projectId,
    repoSaveBlock,
    draftContent,
    onRepoIdChange,
    onRepoMetadataChange,
    onPublishBlock,
    isBlockInUse,
  ]);

  const handleRename = useCallback(() => {
    const current = repoName.trim();
    const defaultName = current || (projectName ?? '');
    const input = prompt('Nuevo nombre del bloque', defaultName);
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      alert('Debes ingresar un nombre para el bloque.');
      return;
    }
    setRepoName(trimmed);
    if (!repoId) {
      return;
    }
    const currentMeta = repoMetadata ?? repoRecord?.metadata;
    const baseProject = currentMeta?.projectId ?? projectId ?? 'repository';
    const uuid = currentMeta?.uuid ?? repoId;
    const storedId = buildBlockId(baseProject, uuid);
    const updatedAt = new Date().toISOString();
    repoUpdateBlockMetadata(storedId, { name: trimmed, updatedAt });
    const updatedMetadata: BlockMetadata = {
      projectId: baseProject,
      uuid,
      name: trimmed,
      updatedAt,
    };
    setRepoMetadata(updatedMetadata);
    onRepoMetadataChange?.(updatedMetadata);
  }, [
    repoName,
    projectName,
    repoId,
    repoMetadata,
    repoRecord,
    projectId,
    repoUpdateBlockMetadata,
    onRepoMetadataChange,
  ]);

  const ensurePublishedAndProceed = useCallback<ProceedToMallaHandler>(
    (targetPath) => {
      const destination = targetPath ?? '/malla/design';
      if (!onProceedToMalla) {
        return defaultProceedToMalla(destination);
      }
      if (destination === '/malla/design' && isDraftDirty) {
        const blockLabel = repoName.trim() || 'el bloque';
        const message = repoId
          ? `Para pasar al diseño de malla, actualiza la publicación de "${blockLabel}" en el repositorio. ¿Deseas hacerlo ahora?`
          : `Para pasar al diseño de malla, publica "${blockLabel}" en el repositorio. ¿Deseas hacerlo ahora?`;
        const confirmed = window.confirm(message);
        if (!confirmed) return true;
        const savedId = handleSaveToRepo();
        if (!savedId) return true;
        onProceedToMalla(
          draftContent.template,
          draftContent.visual,
          draftContent.aspect,
          destination,
          savedId,
          draftContent,
        );
        skipNextDirtyBlockCheck();
        return defaultProceedToMalla(destination);
      }
      const publishedContent =
        destination === '/blocks'
          ? repoContent ?? undefined
          : repoId && repoContent && !isDraftDirty
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
      return defaultProceedToMalla(destination);
    },
    [
      onProceedToMalla,
      defaultProceedToMalla,
      isDraftDirty,
      repoId,
      repoName,
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
  useEffect(() => {
    setSelectedCoord(undefined);
  }, [mode]);

  const handleUndo = useCallback(() => {
    console.warn('Acción de deshacer no implementada todavía');
  }, []);

  const handleRedo = useCallback(() => {
    console.warn('Acción de rehacer no implementada todavía');
  }, []);

  const header = (
    <Header
      title="Editor de Bloques"
      center={
        <>
          <Button onClick={handleUndo}>↩️ Deshacer</Button>
          <Button onClick={handleRedo}>↪️ Rehacer</Button>

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
        </>
      }
    />
  );

  useEffect(() => {
    setHandler(ensurePublishedAndProceed);
    return () => {
      resetHandler();
    };
  }, [setHandler, resetHandler, ensurePublishedAndProceed]);

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
            <div style={{ marginTop: '1rem' }}>
              <div><strong>Nombre:</strong> {repoName || 'Sin nombre'}</div>
              <Button onClick={handleRename}>
                {repoId ? 'Renombrar bloque' : 'Definir nombre'}
              </Button>
            </div>
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
          <div style={{ marginTop: '1rem' }}>
            <div><strong>Nombre:</strong> {repoName || 'Sin nombre'}</div>
            <Button onClick={handleRename}>
              {repoId ? 'Renombrar bloque' : 'Definir nombre'}
            </Button>
          </div>
          <Button onClick={() => handleSaveToRepo()}>
            {repoId ? 'Actualizar bloque' : 'Guardar en repositorio'}
          </Button>
        </div>
      }
    />
  );
};
