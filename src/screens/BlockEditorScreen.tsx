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
import { VisualTemplate, BlockAspect, VisualStyle, coordKey } from '../types/visual.ts';
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
import { useAppCommand } from '../state/app-commands';
import type { ProceedToMallaHandler } from '../state/proceed-to-malla';
import {
  blockContentEquals,
  cloneBlockContent,
  hasBlockDesign,
  toBlockContent,
  type BlockContent,
} from '../utils/block-content.ts';
import { blocksToRepository } from '../utils/repository-snapshot.ts';
import './BlockEditorScreen.css';
import { assignSelectOptionColors } from '../utils/selectColors.ts';
import { collectSelectControls, findSelectControlNameAt } from '../utils/selectControls.ts';

const arrayShallowEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, idx) => value === b[idx]);

const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (['input', 'textarea', 'select', 'button'].includes(tag)) return true;
  if (target.isContentEditable) return true;
  return !!target.closest('input,textarea,select,button,[contenteditable="true"]');
};


const EMPTY_BLOCK_ALERT_MESSAGE =
  'Para pasar a la malla, diseña un bloque y publícalo en el repositorio.';


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
  controlsInUse?: Map<string, ReadonlySet<string>>;
  onRequestControlDataClear?: (coord: string) => void;
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
  controlsInUse,
  onRequestControlDataClear,
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
  const previousSelectOptionsRef = useRef<Map<string, string[]>>(new Map());
  const [selectOptionsEditingControlName, setSelectOptionsEditingControlName] = useState<
    string | null
  >(null);
  const { autoSave, flushAutoSave, loadProject } = useProject({ projectId, projectName });
  const {
    saveBlock: repoSaveBlock,
    listBlocks,
    updateBlockMetadata: repoUpdateBlockMetadata,
  } = useBlocksRepo();
  const savedRef = useRef<string | null>(null);
  const proceedHandlerRef = useRef<ProceedToMallaHandler | null>(null);
  const [repoBlocks, setRepoBlocks] = useState<StoredBlock[]>(() => listBlocks());
  const [repoId, setRepoId] = useState<string | null>(initialRepoId ?? null);
  const [repoMetadata, setRepoMetadata] = useState<BlockMetadata | null>(
    initialRepoMetadata ?? null,
  );
  const [repoName, setRepoName] = useState<string>(
    initialRepoMetadata?.name ?? initialRepoName ?? '',
  );

  useEffect(() => {
    const sync = () => setRepoBlocks(listBlocks());
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('block-repo-updated', sync);
    return () => window.removeEventListener('block-repo-updated', sync);
  }, [listBlocks]);

  const initialDataSignature = useMemo(() => {
    if (!initialData) return null;
    return JSON.stringify(toBlockContent(initialData));
  }, [initialData]);
  
  useEffect(() => {
    if (!initialData) return;
    const content = cloneBlockContent(toBlockContent(initialData));
    setTemplate(content.template);
    setVisual(content.visual);
    setAspect(content.aspect);
  }, [initialData, initialDataSignature]);

  const handleClearSelectVisual = useCallback(
    ({ row, col, controlName }: { row: number; col: number; controlName?: string }) => {
      const targetCoord = coordKey(row, col);
      setVisual((currentVisual) => {
        let didChange = false;
        const nextVisual: VisualTemplate = { ...currentVisual };

        if (nextVisual[targetCoord]) {
          delete nextVisual[targetCoord];
          didChange = true;
        }

        Object.entries(currentVisual).forEach(([key, style]) => {
          if (!style) return;
          const selectSource = style.conditionalBg?.selectSource;
          if (!selectSource) return;
          const matchesCoord = selectSource.coord === targetCoord;
          const matchesName = controlName ? selectSource.controlName === controlName : false;
          if (!matchesCoord && !matchesName) return;

          delete nextVisual[key];
          didChange = true;
        });

        return didChange ? nextVisual : currentVisual;
      });
    },
    [setVisual],
  );

  const controlsInUseForRepo = useMemo(() => {
    if (!repoId) return undefined;
    return controlsInUse?.get(repoId);
  }, [controlsInUse, repoId]);

  const handleConfirmDeleteControl = useCallback(
    (coord: string) => {
      if (!controlsInUseForRepo || !controlsInUseForRepo.has(coord)) {
        console.info('[ControlDeletion] No diff cleanup confirmation required before deleting control', {
          coord,
          repoId,
        });
        return true;
      }
      console.info('[ControlDeletion] Requesting confirmation before diff cleanup deletion', {
        coord,
        repoId,
      });
      const shouldDelete = window.confirm(
        'Este control tiene datos ingresados en la malla. Si lo eliminas, se perderán. ¿Deseas continuar?',
      );
      console.info('[ControlDeletion] Diff cleanup confirmation result', {
        coord,
        repoId,
        shouldDelete,
      });
      return shouldDelete;
    },
    [controlsInUseForRepo, repoId],
  );

  const handleControlDeleted = useCallback(
    (coord: string) => {
      console.info('[ControlDeletion] Control deletion confirmed; diff cleanup scheduled', {
        coord,
        repoId,
      });
      onRequestControlDataClear?.(coord);
    },
    [onRequestControlDataClear, repoId],
  );

  useEffect(() => {
    const controls = collectSelectControls(template);
    const controlsByName = new Map(controls.map((control) => [control.name, control]));
    const controlsByCoord = new Map(controls.map((control) => [control.coord, control]));

    const previousOptions = previousSelectOptionsRef.current;
    const currentOptions = new Map<string, string[]>();
    const changedSelects = new Set<string>();
    const removedSelects = new Set<string>(previousOptions.keys());

    controls.forEach((control) => {
      const { name, options } = control;
      const previous = previousOptions.get(name);
      const shouldDefer =
        Boolean(selectOptionsEditingControlName) &&
        Boolean(previous) &&
        name === selectOptionsEditingControlName;
      if (shouldDefer) {
        currentOptions.set(name, previous!);
        removedSelects.delete(name);
        return;
      }
      const optionList = [...options];
      currentOptions.set(name, optionList);
      if (!previous || !arrayShallowEqual(optionList, previous)) {
        changedSelects.add(name);
      }
      removedSelects.delete(name);
    });

    if (selectOptionsEditingControlName && removedSelects.has(selectOptionsEditingControlName)) {
      setSelectOptionsEditingControlName(null);
    }

    previousSelectOptionsRef.current = currentOptions;

    if (changedSelects.size === 0) {
      return;
    }

    setVisual((currentVisual) => {
      let didChange = false;
      const nextVisual: VisualTemplate = { ...currentVisual };

      Object.entries(currentVisual).forEach(([key, style]) => {
        if (!style) return;
        const selectSource = style.conditionalBg?.selectSource;
        if (!selectSource) return;

        const resolvedControl =
          (selectSource.controlName
            ? controlsByName.get(selectSource.controlName)
            : undefined) ??
          (selectSource.coord ? controlsByCoord.get(selectSource.coord) : undefined);

        if (!resolvedControl) {
          return;
        }

        const resolvedName = resolvedControl.name;

        const options = currentOptions.get(resolvedName) ?? [];
        const existingColors = selectSource.colors ?? {};
        const nextColors = assignSelectOptionColors(options, existingColors);

        const colorsChanged =
          Object.keys(existingColors).length !== options.length ||
          options.some((option) => existingColors[option] !== nextColors[option]);

        const needsRefUpdate =
          selectSource.controlName !== resolvedName ||
          (resolvedControl.coord && selectSource.coord !== resolvedControl.coord);

        if (!colorsChanged && !needsRefUpdate) {
          return;
        }

        const nextStyle: VisualStyle = {
          ...style,
          conditionalBg: {
            ...(style.conditionalBg ?? {}),
            selectSource: {
              controlName: resolvedName,
              coord: resolvedControl.coord,
              colors: nextColors,
            },
          },
        };
        nextVisual[key] = nextStyle;
        didChange = true;
      });

      return didChange ? nextVisual : currentVisual;
    });
  }, [
    template,
    setVisual,
    selectOptionsEditingControlName,
    setSelectOptionsEditingControlName,
  ]);

  const persistedProjectRef = useRef<MallaExport | null>(null);
  const hasLoadedProjectRef = useRef(false);

  useEffect(() => {
    setRepoId(initialRepoId ?? null);
  }, [initialRepoId]);

  useEffect(() => {
    persistedProjectRef.current = null;
    hasLoadedProjectRef.current = false;
  }, [projectId]);

  const shouldReusePersistedMalla = useCallback((project: MallaExport | null) => {
    if (!project) return false;
    const piecesCount = project.pieces?.length ?? 0;
    const floatingCount = project.floatingPieces?.length ?? 0;
    if (piecesCount > 0 || floatingCount > 0) return true;
    const activeId = project.activeMasterId ?? '';
    if (activeId && activeId !== 'master') return true;
    const masters = project.masters ?? {};
    if (Object.keys(masters).some((id) => id !== 'master')) return true;
    const grid = project.grid;
    if (grid && (grid.cols !== 5 || grid.rows !== 5)) return true;
    return false;
  }, []);

  useEffect(() => {
    if (!projectId) return;

    if (!hasLoadedProjectRef.current) {
      const record = loadProject(projectId);
      persistedProjectRef.current = record?.data ?? null;
      hasLoadedProjectRef.current = true;
    }

    const snapshot = blocksToRepository(repoBlocks);
    const base = persistedProjectRef.current;
    const reuseMalla = shouldReusePersistedMalla(base);

    let data: MallaExport;
    if (reuseMalla && base) {
      const nextMasters = { ...(base.masters ?? {}) };
      const candidateIds = new Set<string>();
      if (base.activeMasterId) candidateIds.add(base.activeMasterId);
      if (repoId) candidateIds.add(repoId);
      if (candidateIds.size === 0) candidateIds.add('master');
      candidateIds.forEach((id) => {
        nextMasters[id] = { template, visual, aspect };
      });

      data = {
        ...base,
        version: MALLA_SCHEMA_VERSION,
        masters: nextMasters,
        grid: base.grid ?? { cols: 5, rows: 5 },
        pieces: base.pieces ?? [],
        values: base.values ?? {},
        floatingPieces: base.floatingPieces ?? [],
        activeMasterId: base.activeMasterId ?? repoId ?? 'master',
        repository: snapshot.entries,
      };
    } else {
      data = {
        version: MALLA_SCHEMA_VERSION,
        masters: { master: { template, visual, aspect } },
        grid: { cols: 5, rows: 5 },
        pieces: [],
        values: {},
        floatingPieces: [],
        activeMasterId: 'master',
        repository: snapshot.entries,
      };
    }

    const serialized = JSON.stringify(data);
    if (savedRef.current === serialized) return;
    savedRef.current = serialized;
    persistedProjectRef.current = data;
    autoSave(data);
  }, [
    template,
    visual,
    aspect,
    projectId,
    autoSave,
    repoBlocks,
    loadProject,
    repoId,
    shouldReusePersistedMalla,
  ]);

  useEffect(() => () => flushAutoSave(), [flushAutoSave]);

  const draftContent = useMemo<BlockContent>(
    () => ({ template, visual, aspect }),
    [template, visual, aspect],
  );
  const draftSerialized = useMemo(() => JSON.stringify(draftContent), [draftContent]);
  const hasDraftDesign = useMemo(() => hasBlockDesign(draftContent), [draftContent]);

  const historyRef = useRef<BlockContent[]>([]);
  const historySerializedRef = useRef<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isHistoryInitialized, setIsHistoryInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const ignoreNextInitialDataRef = useRef(false);

  useEffect(() => {
    if (ignoreNextInitialDataRef.current) {
      ignoreNextInitialDataRef.current = false;
      return;
    }
    setIsHistoryInitialized(false);
  }, [initialDataSignature]);

  useEffect(() => {
    if (!isHistoryInitialized) {
      const initialEntry = cloneBlockContent(draftContent);
      historyRef.current = [initialEntry];
      historySerializedRef.current = [draftSerialized];
      setHistoryIndex(0);
      setIsHistoryInitialized(true);
      return;
    }
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    const currentSerialized = historySerializedRef.current[historyIndex];
    if (currentSerialized === draftSerialized) return;
    const truncatedHistory = historyRef.current.slice(0, historyIndex + 1);
    const truncatedSerialized = historySerializedRef.current.slice(0, historyIndex + 1);
    truncatedHistory.push(cloneBlockContent(draftContent));
    truncatedSerialized.push(draftSerialized);
    historyRef.current = truncatedHistory;
    historySerializedRef.current = truncatedSerialized;
    setHistoryIndex(truncatedHistory.length - 1);
  }, [
    draftContent,
    draftSerialized,
    historyIndex,
    isHistoryInitialized,
  ]);

  const applyHistoryEntry = useCallback(
    (entry: BlockContent) => {
      const clone = cloneBlockContent(entry);
      setTemplate(clone.template);
      setVisual(clone.visual);
      setAspect(clone.aspect);
    },
    [setTemplate, setVisual, setAspect],
  );

  useEffect(() => {
    if (!onDraftChange) return;
    ignoreNextInitialDataRef.current = true;
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
        if (!hasDraftDesign) {
          window.alert(EMPTY_BLOCK_ALERT_MESSAGE);
          return true;
        }
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
      hasDraftDesign,
      repoId,
      repoName,
      handleSaveToRepo,
      draftContent,
      repoContent,
    ],
  );

  // Estado que publica el editor para poblar el ContextSidebarPanel
  const [editorSidebar, setEditorSidebar] = useState<EditorSidebarState | null>(null);

  useEffect(() => {
    if (mode !== 'edit') {
      setSelectOptionsEditingControlName(null);
      return;
    }
    const coord = editorSidebar?.selectedCoord;
    const cell = editorSidebar?.selectedCell;
    if (!coord || !cell || cell.type !== 'select') {
      setSelectOptionsEditingControlName((prev) => (prev === null ? prev : null));
      return;
    }
    const controlName = findSelectControlNameAt(template, coord.row, coord.col);
    setSelectOptionsEditingControlName((prev) => {
      if (!prev) return prev;
      if (!controlName) return null;
      return prev === controlName ? prev : null;
    });
  }, [mode, editorSidebar?.selectedCoord, editorSidebar?.selectedCell, template]);

  const handleSelectOptionsEditingChange = useCallback(
    (controlName: string | null, isEditing: boolean) => {
      setSelectOptionsEditingControlName((prev) => {
        if (isEditing) {
          return controlName ?? null;
        }
        if (!controlName) {
          return null;
        }
        return prev === controlName ? null : prev;
      });
    },
    [],
  );

  // Selección en modo vista
  const [selectedCoord, setSelectedCoord] =
    useState<{ row: number; col: number } | undefined>(undefined);
  useEffect(() => {
    setSelectedCoord(undefined);
  }, [mode]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;
  
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistoryEntry(entry);
    setHistoryIndex(newIndex);
  }, [historyIndex, applyHistoryEntry]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistoryEntry(entry);
    setHistoryIndex(newIndex);
  }, [historyIndex, applyHistoryEntry]);

  useAppCommand('undo', handleUndo, canUndo);
  useAppCommand('redo', handleRedo, canRedo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isInteractiveElement(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const header = (
    <Header
      title="Editor de Bloques"
      left={
        <div className="block-editor-header-toolbar">
          <div className="block-editor-header-name">
            <span className="block-editor-header-name-label">Bloque curricular:</span>
            <span
              className="block-editor-block-name"
              title={repoName || 'Sin nombre'}
            >
              {repoName || 'Sin nombre'}
            </span>
            <Button onClick={handleRename}>
              {repoId ? '✏️ ' : '✏️ '}
            </Button>
          </div>
        </div>
      }
      center={
        <div className="block-editor-header-toolbar">
          <Button onClick={handleUndo} disabled={!canUndo} title="Deshacer">
            ↻
          </Button>
          <Button onClick={handleRedo} disabled={!canRedo} title="Rehacer">
            ↺
          </Button>

          <Button
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => setMode('edit')}
          >
            🎛️ Configurar controles
          </Button>
          <Button
            className={mode === 'view' ? 'active' : ''}
            onClick={() => setMode('view')}
          >
            👁️ Configurar vista
          </Button>
        </div>
      }
      right={
        <div className="block-editor-header-toolbar">
          <Button onClick={() => handleSaveToRepo()}>
            {repoId ? 'Actualizar en repositorio' : 'Guardar en repositorio'}
          </Button>
        </div>
      }
    />
  );

  const proceedHandlerRegistrarRef = useRef<typeof setHandler | null>(null);

  useEffect(() => {
    if (
      proceedHandlerRef.current === ensurePublishedAndProceed &&
      proceedHandlerRegistrarRef.current === setHandler
    ) {
      return;
    }
    setHandler(ensurePublishedAndProceed);
    proceedHandlerRef.current = ensurePublishedAndProceed;
    proceedHandlerRegistrarRef.current = setHandler;
  }, [setHandler, ensurePublishedAndProceed]);

  useEffect(() => {
    return () => {
      if (proceedHandlerRef.current) {
        resetHandler();
        proceedHandlerRef.current = null;
        proceedHandlerRegistrarRef.current = null;
      }
    };
  }, [resetHandler]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (!body) return;

    const appMain = document.querySelector('[data-app-main]');

    if (mode !== 'view') {
      return;
    }

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;

    let previousMainOverflow: string | null = null;
    let previousMainPaddingRight: string | null = null;

    if (appMain instanceof HTMLElement) {
      previousMainOverflow = appMain.style.overflow;
      previousMainPaddingRight = appMain.style.paddingRight;
    }

    const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarCompensation > 0) {
      body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    if (appMain instanceof HTMLElement) {
      appMain.style.overflow = 'hidden';
      if (scrollbarCompensation > 0) {
        appMain.style.paddingRight = `${scrollbarCompensation}px`;
      }
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;

      if (appMain instanceof HTMLElement) {
        appMain.style.overflow = previousMainOverflow ?? '';
        appMain.style.paddingRight = previousMainPaddingRight ?? '';
      }
    };
  }, [mode]);

  if (mode === 'edit') {
    return (
      <div className="block-editor-screen">
        <TwoPaneLayout
          header={header}
          left={
            <BlockTemplateEditor
              template={template}
              setTemplate={setTemplate}
              onSidebarStateChange={setEditorSidebar}
              onClearSelectVisual={handleClearSelectVisual}
              controlsInUse={controlsInUseForRepo}
              onConfirmDeleteControl={handleConfirmDeleteControl}
              onControlDeleted={handleControlDeleted}
            />
          }
          right={
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
              onSelectOptionsEditingChange={handleSelectOptionsEditingChange}
            />
          }
        />
      </div>
    );
  }

  // MODO VISTA
  return (
    <div className="block-editor-screen">
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
          <FormatStylePanel
            selectedCoord={selectedCoord}
            visualTemplate={visual}
            onUpdateVisual={setVisual}
            template={template}
            blockAspect={aspect}
            onUpdateAspect={setAspect}
          />
        }
      />
    </div>
  );
};