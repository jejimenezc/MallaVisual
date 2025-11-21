// src/screens/MallaEditorScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BlockTemplate,
  CurricularPiece,
  CurricularPieceRef,
  CurricularPieceSnapshot,
  BlockSourceRef,
  MasterBlockData,
} from '../types/curricular.ts';
import { TemplateGrid } from '../components/TemplateGrid';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import {
  cropTemplate,
  cropVisualTemplate,
  getActiveBounds,
  expandBoundsToMerges,
  type ActiveBounds,
} from '../utils/block-active.ts';
import { BlockSnapshot, getCellSizeByAspect } from '../components/BlockSnapshot';
import { blockContentEquals } from '../utils/block-content.ts';
import {
  type MallaExport,
  MALLA_SCHEMA_VERSION,
  createDefaultProjectTheme,
  normalizeProjectTheme,
  type ProjectTheme,
} from '../utils/malla-io.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import { useProject, useBlocksRepo } from '../core/persistence/hooks.ts';
import { blocksToRepository } from '../utils/repository-snapshot.ts';
import styles from './MallaEditorScreen.module.css';
import { GRID_GAP, GRID_PAD } from '../styles/constants.ts';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { ActionPillButton } from '../components/ActionPillButton/ActionPillButton';
import addRefIcon from '../assets/icons/icono-plus-50.png';
import { useAppCommand } from '../state/app-commands';
import { useMallaHistory } from './useMallaHistory';
import type { MallaAction } from './malla-reducer';

const STORAGE_KEY = 'malla-editor-state';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const CONTROL_COLUMN_WIDTH = 56;



function formatMasterDisplayName(metadata: StoredBlock['metadata'], fallbackId: string) {
  const friendlyName = metadata.name?.trim();
  if (friendlyName) {
    return friendlyName;
  }

  if (fallbackId.length <= 10) {
    return fallbackId;
  }

  const prefix = fallbackId.slice(0, 4);
  const suffix = fallbackId.slice(-3);
  const maskedWithSpace = `${prefix}... ${suffix}`;
  if (maskedWithSpace.length <= 10) {
    return maskedWithSpace;
  }
  return `${prefix}...${suffix}`;
}
/** Cálculo unificado de métricas de una pieza (recorte) */
function computeMetrics(tpl: BlockTemplate, aspect: BlockAspect) {
  const { cellW, cellH } = getCellSizeByAspect(aspect);
  const cols = tpl[0]?.length ?? 0;
  const rows = tpl.length;

  const contentW = cols * cellW + Math.max(0, cols - 1) * GRID_GAP;
  const contentH = rows * cellH + Math.max(0, rows - 1) * GRID_GAP;
  const outerW = contentW + GRID_PAD * 2;
  const outerH = contentH + GRID_PAD * 2;

  const gridStyle: React.CSSProperties = {
    width: contentW,
    height: contentH,
    gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
    padding: 'var(--grid-pad)',
    gap: 'var(--grid-gap)',
  };

  return { cellW, cellH, cols, rows, contentW, contentH, outerW, outerH, gridStyle };
}

function boundsEqual(a: ActiveBounds, b: ActiveBounds) {
  return (
    a.minRow === b.minRow &&
    a.maxRow === b.maxRow &&
    a.minCol === b.minCol &&
    a.maxCol === b.maxCol &&
    a.rows === b.rows &&
    a.cols === b.cols
  );
}

function isInteractive(target: HTMLElement) {
  const tag = target.tagName.toLowerCase();
  if (['input', 'select', 'textarea', 'button'].includes(tag)) return true;
  return !!target.closest('input,select,textarea,button,[contenteditable="true"]');
}

interface Props {
  /** Maestro actual (10x10) */
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  repoId?: string | null;
  onBack?: () => void;
  onUpdateMaster?: React.Dispatch<
    React.SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  >;
  initialMalla?: MallaExport;
  onMallaChange?: React.Dispatch<React.SetStateAction<MallaExport | null>>;
  projectId?: string;
  projectName?: string;
}

export const MallaEditorScreen: React.FC<Props> = ({
  template,
  visual,
  aspect,
  repoId,
  onBack,
  onUpdateMaster,
  initialMalla,
  onMallaChange,
  projectId,
  projectName,
}) => {
  const initialMallaSignature = useMemo(() => {
    if (!initialMalla) return null;
    return JSON.stringify(initialMalla);
  }, [initialMalla]);

  // --- maestro + recorte activo
  const bounds = useMemo(() => getActiveBounds(template), [template]);
  const subTemplate = useMemo(() => cropTemplate(template, bounds), [template, bounds]);
  const baseMetrics = useMemo(() => computeMetrics(subTemplate, aspect), [subTemplate, aspect]);

  // --- malla y piezas
  // --- repositorio y estado de maestros
  const [availableMasters, setAvailableMasters] = useState<StoredBlock[]>([]);
  const initialMasters = useMemo<Record<string, MasterBlockData>>(() => {
    let masters: Record<string, MasterBlockData> = {};
    if (initialMalla?.masters) {
      masters = { ...initialMalla.masters };
    } else if (repoId) {
      masters = { [repoId]: { template, visual, aspect } };
    }

    if (repoId && !masters[repoId]) {
      masters = {
        ...masters,
        [repoId]: { template, visual, aspect },
      };
    }

    return masters;
  }, [initialMalla, repoId, template, visual, aspect]);

  const initialMasterId = useMemo(() => {
    if (repoId) {
      return repoId;
    }
    if (initialMalla?.activeMasterId) {
      return initialMalla.activeMasterId;
    }
    const keys = Object.keys(initialMasters);
    if (keys.length > 0) {
      return keys[0];
    }
    return '';
  }, [initialMalla, initialMasters, repoId]);

  const initialState = useMemo(() => ({
    cols: initialMalla?.grid?.cols ?? 5,
    rows: initialMalla?.grid?.rows ?? 5,
    pieces: initialMalla?.pieces ?? [],
    pieceValues: initialMalla?.values ?? {},
    floatingPieces: initialMalla?.floatingPieces ?? [],
    mastersById: initialMasters,
    selectedMasterId: initialMasterId,
    theme: initialMalla ? normalizeProjectTheme(initialMalla.theme) : createDefaultProjectTheme(),
  }), [initialMalla, initialMasters, initialMasterId]);

  const { state, dispatch, undo, redo, canUndo, canRedo } = useMallaHistory(initialState);
  const { cols, rows, pieces, pieceValues, floatingPieces, mastersById, selectedMasterId, theme } = state;

  // UI State
  const [showPieceMenus, setShowPieceMenus] = useState(true);
  const [isRepositoryCollapsed, setIsRepositoryCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const { autoSave, flushAutoSave, loadDraft } = useProject({
    storageKey: STORAGE_KEY,
    projectId,
    projectName,
  });
  const { listBlocks } = useBlocksRepo();

  // Refs for interaction
  const selectedMasterIdRef = useRef(selectedMasterId);
  useEffect(() => {
    selectedMasterIdRef.current = selectedMasterId;
  }, [selectedMasterId]);

  // Legacy refs removal (historyRef, etc.) - handled by replacement






  useEffect(() => {
    if (!repoId) return;
    dispatch({ type: 'SELECT_MASTER', id: repoId }, false);
  }, [repoId, dispatch]);

  useEffect(() => {
    setAvailableMasters(listBlocks());
    const handler = () => setAvailableMasters(listBlocks());
    window.addEventListener('block-repo-updated', handler);
    return () => window.removeEventListener('block-repo-updated', handler);
  }, [listBlocks]);

  const repositorySnapshot = useMemo(
    () => blocksToRepository(availableMasters),
    [availableMasters],
  );
  const repositoryEntries = repositorySnapshot.entries;



  // Refresca los maestros almacenados cuando el repositorio cambia
  // Refresca los maestros almacenados cuando el repositorio cambia
  useEffect(() => {
    if (availableMasters.length === 0) return;

    let updated = false;
    let next = mastersById;
    for (const { metadata, data } of availableMasters) {
      const key = metadata.uuid;
      const incoming: MasterBlockData = {
        template: data.template,
        visual: data.visual,
        aspect: data.aspect,
      };
      if (!blockContentEquals(mastersById[key], incoming)) {
        if (!updated) {
          next = { ...mastersById };
          updated = true;
        }
        next[key] = incoming;
      }
    }
    if (updated) {
      dispatch({ type: 'SET_MASTERS', masters: next }, false);
    }
  }, [availableMasters, mastersById, dispatch]);

  // Sincroniza el maestro activo con el mapa local
  // Sincroniza el maestro activo con el mapa local
  useEffect(() => {
    if (!selectedMasterId) return;
    // Note: skipNextMasterSyncRef logic removed as it was for history management

    const data: MasterBlockData = { template, visual, aspect };
    // Update if different? For now just update.
    dispatch({
      type: 'SET_MASTERS',
      masters: {
        ...mastersById,
        [selectedMasterId]: data,
      }
    }, false);
  }, [selectedMasterId, template, visual, aspect, dispatch]); // mastersById omitted to avoid loop, relying on closure or next render

  // --- drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPieceOuter = useRef({ w: 0, h: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pointerMode, setPointerMode] = useState<'select' | 'pan'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const savedRef = useRef<string | null>(null);
  const skipNextSyncRef = useRef(false);
  const skipNextNormalizedInitialRef = useRef(false);
  const initialPersistenceSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    selectedMasterIdRef.current = selectedMasterId;
  }, [selectedMasterId]);

  useAppCommand('undo', undo, canUndo);
  useAppCommand('redo', redo, canRedo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.target instanceof HTMLElement && isInteractive(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);
  const {
    colWidths,
    rowHeights,
    colOffsets,
    rowOffsets,
    gridWidth,
    gridHeight,
  } = useMemo(() => {
    const colWidths = Array(cols).fill(baseMetrics.outerW);
    const rowHeights = Array(rows).fill(baseMetrics.outerH);
    for (const p of pieces) {
      let tpl: BlockTemplate;
      let pieceAspect: BlockAspect;
      if (p.kind === 'ref') {
        const master = mastersById[p.ref.sourceId] ?? { template, visual, aspect };
        const safeBounds = expandBoundsToMerges(master.template, p.ref.bounds);
        tpl = cropTemplate(master.template, safeBounds);
        pieceAspect = master.aspect;
      } else {
        tpl = p.template;
        pieceAspect = p.aspect;
      }
      const { outerW, outerH } = computeMetrics(tpl, pieceAspect);
      if (outerW > colWidths[p.x]) colWidths[p.x] = outerW;
      if (outerH > rowHeights[p.y]) rowHeights[p.y] = outerH;
    }
    const colOffsets = [0];
    for (let i = 1; i < colWidths.length; i++) {
      colOffsets[i] = colOffsets[i - 1] + colWidths[i - 1];
    }
    const rowOffsets = [0];
    for (let i = 1; i < rowHeights.length; i++) {
      rowOffsets[i] = rowOffsets[i - 1] + rowHeights[i - 1];
    }
    const gridWidth = colWidths.reduce((a, b) => a + b, 0);
    const gridHeight = rowHeights.reduce((a, b) => a + b, 0);
    return { colWidths, rowHeights, colOffsets, rowOffsets, gridWidth, gridHeight };
  }, [pieces, cols, rows, template, visual, aspect, mastersById, baseMetrics.outerW, baseMetrics.outerH]);

  const gridAreaStyle = useMemo(
    () =>
      ({
        '--cols': String(cols),
        '--rows': String(rows),
        width: gridWidth,
        height: gridHeight,
      }) as React.CSSProperties,
    [cols, rows, gridWidth, gridHeight]
  );

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    [],
  );

  const handleZoomChange = useCallback(
    (value: number) => {
      const clamped = clampZoom(value);
      setZoom(Number(clamped.toFixed(2)));
    },
    [clampZoom],
  );

  const handleZoomStep = useCallback(
    (direction: 1 | -1) => {
      handleZoomChange(zoom + direction * ZOOM_STEP);
    },
    [handleZoomChange, zoom],
  );

  const zoomScale = useMemo(() => zoom, [zoom]);
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);
  const canZoomOut = zoom > MIN_ZOOM + 0.001;
  const canZoomIn = zoom < MAX_ZOOM - 0.001;
  const sliderMin = Math.round(MIN_ZOOM * 100);
  const sliderMax = Math.round(MAX_ZOOM * 100);
  const sliderStep = Math.round(ZOOM_STEP * 100);

  const zoomedGridContainerStyle = useMemo(
    () =>
      ({
        height: gridHeight * zoomScale,
      }) as React.CSSProperties,
    [gridHeight, zoomScale],
  );

  const zoomedGridWrapperStyle = useMemo(
    () =>
      ({
        width: gridWidth * zoomScale,
        height: gridHeight * zoomScale,
      }) as React.CSSProperties,
    [gridWidth, gridHeight, zoomScale],
  );

  const zoomedGridAreaStyle = useMemo(
    () =>
      ({
        ...gridAreaStyle,
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
      }) as React.CSSProperties,
    [gridAreaStyle, zoomScale],
  );

  const rowControlButtons = useMemo(() => {
    const minusButtons = rowHeights.map((height, index) => {
      const top = (rowOffsets[index] + height / 2) * zoomScale;
      const hasPieces = pieces.some((piece) => piece.y === index);
      return {
        key: `row-minus-${index}`,
        index,
        top,
        disabled: rows <= 1 || hasPieces,
        ariaLabel: hasPieces
          ? `No se puede eliminar la fila ${index + 1} porque contiene piezas`
          : `Eliminar fila ${index + 1}`,
      };
    });

    const plusButtons = Array.from({ length: rows + 1 }, (_, index) => {
      const offset = index === rows ? gridHeight : rowOffsets[index] ?? gridHeight;
      const top = offset * zoomScale;
      let ariaLabel: string;
      if (index === 0) {
        ariaLabel = 'Insertar una fila al inicio';
      } else if (index === rows) {
        ariaLabel = 'Insertar una fila al final';
      } else {
        ariaLabel = `Insertar una fila después de la fila ${index}`;
      }
      return {
        key: `row-plus-${index}`,
        index,
        top,
        ariaLabel,
      };
    });

    return { minusButtons, plusButtons };
  }, [gridHeight, pieces, rowHeights, rowOffsets, rows, zoomScale]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) {
      return;
    }

    const updateSize = () => {
      setViewportSize({ width: viewportEl.clientWidth, height: viewportEl.clientHeight });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => updateSize());
      resizeObserver.observe(viewportEl);
      return () => resizeObserver.disconnect();
    }

    const onWindowResize = () => updateSize();
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) {
      return;
    }
    setViewportSize({ width: viewportEl.clientWidth, height: viewportEl.clientHeight });
  }, [zoomScale]);

  const scaledGridWidth = useMemo(() => gridWidth * zoomScale, [gridWidth, zoomScale]);
  const scaledGridHeight = useMemo(() => gridHeight * zoomScale, [gridHeight, zoomScale]);

  const needsHorizontalScroll = scaledGridWidth > viewportSize.width + 1;
  const needsVerticalScroll = scaledGridHeight > viewportSize.height + 1;

  const viewportScrollStyle = useMemo(
    () =>
      ({
        overflowX: needsHorizontalScroll ? 'auto' : 'hidden',
        overflowY: needsVerticalScroll ? 'auto' : 'hidden',
      }) as React.CSSProperties,
    [needsHorizontalScroll, needsVerticalScroll],
  );

  const viewportStyle = useMemo(
    () =>
      ({
        ...viewportScrollStyle,
        userSelect: isPanning ? 'none' : undefined,
      }) as React.CSSProperties,
    [viewportScrollStyle, isPanning],
  );

  const handleViewportMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (pointerMode !== 'pan') return;
      if (event.button !== 0) return;
      const viewportEl = viewportRef.current;
      if (!viewportEl) return;
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        scrollLeft: viewportEl.scrollLeft,
        scrollTop: viewportEl.scrollTop,
      };
      setIsPanning(true);
      window.getSelection()?.removeAllRanges();
      event.preventDefault();
    },
    [pointerMode],
  );

  useEffect(() => {
    if (pointerMode === 'pan') {
      setDraggingId(null);
      return;
    }
    setIsPanning(false);
  }, [pointerMode]);

  useEffect(() => {
    if (!isPanning) return;
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const handleMouseMovePan = (event: MouseEvent) => {
      const deltaX = event.clientX - panStartRef.current.x;
      const deltaY = event.clientY - panStartRef.current.y;
      viewportEl.scrollLeft = panStartRef.current.scrollLeft - deltaX;
      viewportEl.scrollTop = panStartRef.current.scrollTop - deltaY;
    };

    const handleMouseUpPan = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMovePan);
    window.addEventListener('mouseup', handleMouseUpPan);
    return () => {
      window.removeEventListener('mousemove', handleMouseMovePan);
      window.removeEventListener('mouseup', handleMouseUpPan);
    };
  }, [isPanning]);

  const viewportClassName = [
    styles.mallaViewport,
    pointerMode === 'pan' ? styles.panMode : '',
    pointerMode === 'pan' && isPanning ? styles.panModeActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mallaAreaClassName = [
    styles.mallaArea,
    pointerMode === 'pan' ? styles.mallaAreaPan : '',
    pointerMode === 'pan' && isPanning ? styles.mallaAreaPanning : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleSelectMaster = (id: string) => {
    if (id !== selectedMasterId) {
      skipNextNormalizedInitialRef.current = true;
    }
    dispatch({ type: 'SELECT_MASTER', id });
    if (!id) {
      return;
    }

    const stored = mastersById[id];
    if (stored) {
      onUpdateMaster?.({
        template: stored.template,
        visual: stored.visual,
        aspect: stored.aspect,
        repoId: id,
      });
      return;
    }

    const rec = listBlocks().find((b) => b.metadata.uuid === id);
    if (rec) {
      const data = rec.data;
      dispatch({ type: 'SET_MASTERS', masters: { ...mastersById, [id]: data } });
      onUpdateMaster?.({
        template: data.template,
        visual: data.visual,
        aspect: data.aspect,
        repoId: id,
      });
    }
  };

  const normalizedInitial = useMemo(() => {
    if (!initialMalla) {
      return null;
    }

    const nextGrid = {
      cols: initialMalla.grid?.cols ?? 5,
      rows: initialMalla.grid?.rows ?? 5,
    };
    const sourceMasters = initialMalla.masters ?? {};
    let nextMasters = { ...sourceMasters };
    if (repoId && !nextMasters[repoId]) {
      nextMasters = {
        ...nextMasters,
        [repoId]: { template, visual, aspect },
      };
    }
    const nextPieces = (initialMalla.pieces ?? []).slice();
    const nextValues = { ...(initialMalla.values ?? {}) };
    const nextFloating = (initialMalla.floatingPieces ?? []).slice();
    const fallbackActiveId = initialMalla.activeMasterId ?? Object.keys(nextMasters)[0] ?? '';
    const nextActiveId = repoId ?? fallbackActiveId;
    const nextTheme = normalizeProjectTheme(initialMalla.theme);

    const project: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: nextMasters,
      grid: nextGrid,
      pieces: nextPieces,
      values: nextValues,
      floatingPieces: nextFloating,
      activeMasterId: nextActiveId,
      repository: initialMalla.repository ?? {},
      theme: nextTheme,
    };

    return {
      project,
      masters: nextMasters,
      grid: nextGrid,
      pieces: nextPieces,
      values: nextValues,
      floatingPieces: nextFloating,
      activeMasterId: nextActiveId,
      theme: nextTheme,
    };
  }, [initialMalla, repoId, template, visual, aspect]);

  useEffect(() => {
    if (!normalizedInitial) {
      savedRef.current = null;
      initialPersistenceSignatureRef.current = null;
      skipNextNormalizedInitialRef.current = false;
      return;
    }

    if (skipNextNormalizedInitialRef.current) {
      skipNextNormalizedInitialRef.current = false;
      return;
    }

    const {
      project,
      masters,
      grid,
      pieces: nextPieces,
      values,
      floatingPieces: nextFloating,
      activeMasterId,
      theme: nextTheme,
    } = normalizedInitial;

    const serialized = JSON.stringify(project);
    if (savedRef.current === serialized) return;

    skipNextSyncRef.current = true;
    initialPersistenceSignatureRef.current = serialized;
    savedRef.current = serialized;

    dispatch({
      type: 'LOAD_STATE',
      state: {
        mastersById: masters,
        cols: grid.cols,
        rows: grid.rows,
        pieces: nextPieces,
        pieceValues: values,
        floatingPieces: nextFloating,
        selectedMasterId: activeMasterId,
        theme: nextTheme,
      }
    });
  }, [normalizedInitial, dispatch]);

  useEffect(() => {
    const project: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: mastersById,
      grid: { cols, rows },
      pieces,
      values: pieceValues,
      floatingPieces,
      activeMasterId: selectedMasterId,
      repository: repositoryEntries,
      theme,
    };
    const serialized = JSON.stringify(project);
    const shouldRunInitialPersist = initialPersistenceSignatureRef.current === serialized;
    const shouldSkipMallaChange = skipNextSyncRef.current;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
    }

    if (savedRef.current === serialized) {
      if (shouldRunInitialPersist) {
        autoSave(project);
        initialPersistenceSignatureRef.current = null;
      }
      return;
    }

    savedRef.current = serialized;
    if (!shouldSkipMallaChange && onMallaChange) {

      onMallaChange(project);
    }
    autoSave(project);
    if (shouldRunInitialPersist) {
      initialPersistenceSignatureRef.current = null;
    }
  }, [
    mastersById,
    cols,
    rows,
    pieces,
    pieceValues,
    floatingPieces,
    selectedMasterId,
    repositoryEntries,
    theme,
    autoSave,
    onMallaChange,
  ]);

  useEffect(() => () => flushAutoSave(), [flushAutoSave]);

  useEffect(() => {
    if (initialMalla) {
      return;
    }

    const data = loadDraft();
    if (!data && !repoId) {
      return;
    }

    const draftMasters = data?.masters ?? {};
    let nextMasters = { ...draftMasters };

    if (repoId && !nextMasters[repoId]) {
      nextMasters = {
        ...nextMasters,
        [repoId]: { template, visual, aspect },
      };
    }

    const masterIds = Object.keys(nextMasters);
    const activeFromDraft = data?.activeMasterId;
    const usableDraftId =
      activeFromDraft && nextMasters[activeFromDraft] ? activeFromDraft : undefined;
    const fallbackId =
      (repoId && nextMasters[repoId] ? repoId : undefined) ?? masterIds[0] ?? '';
    const nextActiveId = usableDraftId ?? fallbackId;
    const active = nextMasters[nextActiveId];

    if (active) {
      onUpdateMaster?.({
        template: active.template,
        visual: active.visual,
        aspect: active.aspect,
        repoId: nextActiveId,
      });
    }

    dispatch({
      type: 'LOAD_STATE',
      state: {
        mastersById: nextMasters,
        cols: data?.grid?.cols ?? 5,
        rows: data?.grid?.rows ?? 5,
        pieces: data?.pieces ?? [],
        pieceValues: data?.values ?? {},
        floatingPieces: data?.floatingPieces ?? [],
        selectedMasterId: nextActiveId,
        theme: normalizeProjectTheme(data?.theme),
      }
    });
  }, [
    aspect,
    initialMalla,
    loadDraft,
    onUpdateMaster,
    repoId,
    template,
    visual,
    dispatch
  ]);

  useEffect(() => {
    const nextBounds = expandBoundsToMerges(template, getActiveBounds(template));
    let changed = false;
    const nextPieces = pieces.map((p) => {
      if (p.kind === 'ref' && p.ref.sourceId === selectedMasterId) {
        const needsBounds = !boundsEqual(p.ref.bounds, nextBounds);
        const needsAspect = p.ref.aspect !== aspect;
        if (!needsBounds && !needsAspect) return p;
        changed = true;
        return {
          ...p,
          ref: { ...p.ref, bounds: needsBounds ? nextBounds : p.ref.bounds, aspect },
        };
      }
      if (p.kind === 'snapshot' && p.origin?.sourceId === selectedMasterId) {
        const origin = p.origin!;
        const needsBounds = !boundsEqual(origin.bounds, nextBounds);
        const needsAspect = origin.aspect !== aspect;
        if (!needsBounds && !needsAspect) return p;
        changed = true;
        return {
          ...p,
          origin: {
            ...origin,
            bounds: needsBounds ? nextBounds : origin.bounds,
            aspect,
          },
        };
      }
      return p;
    });

    if (changed) {
      dispatch({ type: 'SET_PIECES', pieces: nextPieces }, false);
    }
  }, [template, aspect, selectedMasterId, pieces, dispatch]);

  // --- validación de reducción de la macro-grilla
  // --- validación de reducción de la macro-grilla
  // insertRowAt and removeRowAt helper functions removed as they are now actions

  type RowMutationOptions = {
    recordHistory?: boolean;
  };

  const handleInsertRow = (index: number, options?: RowMutationOptions) => {
    const targetIndex = Math.max(0, Math.min(index, rows));
    dispatch({ type: 'INSERT_ROW', index: targetIndex });
  };

  const handleRemoveRow = (index: number, options?: RowMutationOptions) => {
    if (rows <= 1) return;
    const targetIndex = Math.max(0, Math.min(index, rows - 1));
    const blocker = pieces.find((p) => p.y === targetIndex);
    if (blocker) {
      window.alert(
        `Para eliminar la fila mueva o borre las piezas que ocupan la fila ${targetIndex + 1}`
      );
      return;
    }
    dispatch({ type: 'REMOVE_ROW', index: targetIndex });
  };

  const handleRowsChange = (newRows: number) => {
    const numericRows = Number.isFinite(newRows) ? newRows : rows;
    const nextRows = Math.max(1, Math.floor(numericRows));
    if (nextRows === rows) return;

    if (nextRows < rows) {
      const blocker = pieces.find((p) => p.y >= nextRows);
      if (blocker) {
        window.alert(
          `Para reducir filas mueva o borre las piezas que ocupan la fila ${blocker.y + 1}`
        );
        return;
      }
    }
    dispatch({ type: 'SET_GRID_SIZE', rows: nextRows });
  };

  const handleColsChange = (newCols: number) => {
    if (newCols < cols) {
      const blocker = pieces.find((p) => p.x >= newCols);
      if (blocker) {
        window.alert(
          `Para reducir columnas mueva o borre las piezas que ocupan la columna ${blocker.x + 1}`
        );
        return;
      }
    }
    dispatch({ type: 'SET_GRID_SIZE', cols: newCols });
  };

  // --- agregar piezas
  const findFreeCell = () => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!pieces.some((p) => p.x === x && p.y === y)) {
          return { x, y };
        }
      }
    }
    return null;
  };

  const handleAddReferenced = () => {
    const pos = findFreeCell();
    if (!pos) {
      window.alert(
        'No hay posiciones disponibles en la malla. Agregue filas/columnas o borre una pieza curricular.'
      );
      return;
    }

    const id = crypto.randomUUID();
    const piece: CurricularPieceRef = {
      kind: 'ref',
      id,
      ref: { sourceId: selectedMasterId, bounds, aspect }, // guarda bounds completos
      x: pos.x,
      y: pos.y,
    };
    dispatch({ type: 'ADD_PIECE', piece });
  };

  // --- TOGGLE: congelar ↔ descongelar
  const togglePieceKind = (id: string) => {
    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;

    let newPiece: CurricularPiece | null = null;
    if (piece.kind === 'ref') {
      const master = mastersById[piece.ref.sourceId] ?? { template, visual, aspect };
      const safeBounds = expandBoundsToMerges(master.template, piece.ref.bounds);
      const tpl = cropTemplate(master.template, safeBounds);
      const vis = cropVisualTemplate(master.visual, master.template, safeBounds);
      const origin: BlockSourceRef = { ...piece.ref };
      newPiece = {
        kind: 'snapshot',
        id: piece.id,
        template: tpl,
        visual: vis,
        aspect: master.aspect,
        x: piece.x,
        y: piece.y,
        origin,
      };
    } else {
      if (!piece.origin) return;
      newPiece = {
        kind: 'ref',
        id: piece.id,
        ref: { ...piece.origin },
        x: piece.x,
        y: piece.y,
      };
    }

    if (newPiece) {
      dispatch({ type: 'UPDATE_PIECE', piece: newPiece });
    }
  };

  // --- Duplicar pieza (mantiene kind y valores del usuario)
  const duplicatePiece = (src: CurricularPiece) => {
    const pos = findFreeCell();
    if (!pos) {
      window.alert(
        'No hay posiciones disponibles en la malla. Agregue filas/columnas o borre una pieza curricular.'
      );
      return;
    }

    const newId = crypto.randomUUID();

    let clone: CurricularPiece;
    if (src.kind === 'ref') {
      clone = {
        kind: 'ref',
        id: newId,
        ref: { ...src.ref },
        x: pos.x,
        y: pos.y,
      };
    } else {
      clone = {
        kind: 'snapshot',
        id: newId,
        template: structuredClone ? structuredClone(src.template) : JSON.parse(JSON.stringify(src.template)),
        visual: structuredClone ? structuredClone(src.visual) : JSON.parse(JSON.stringify(src.visual)),
        aspect: src.aspect,
        x: pos.x,
        y: pos.y,
        origin: src.origin ? { ...src.origin } : undefined,
      };
    }
    // Duplicar también los valores de usuario de la pieza
    const oldVals = pieceValues[src.id] ?? {};
    const nextValues = { ...pieceValues, [newId]: { ...oldVals } };

    dispatch({
      type: 'BATCH',
      actions: [
        { type: 'ADD_PIECE', piece: clone },
        { type: 'SET_PIECE_VALUES', values: nextValues }
      ]
    });
  };

  // --- Eliminar pieza (y sus valores)
  // --- Eliminar pieza (y sus valores)
  const deletePiece = (id: string) => {
    dispatch({ type: 'REMOVE_PIECE', id });
  };

  // --- completar o limpiar la macro-grilla
  // --- completar o limpiar la macro-grilla
  const handleFillGrid = () => {
    const occupied = new Set(pieces.map((p) => `${p.x}-${p.y}`));
    const additions: CurricularPiece[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${c}-${r}`)) {
          additions.push({
            kind: 'ref',
            id: crypto.randomUUID(),
            ref: { sourceId: selectedMasterId, bounds, aspect },
            x: c,
            y: r,
          });
        }
      }
    }
    if (additions.length > 0) {
      dispatch({ type: 'SET_PIECES', pieces: [...pieces, ...additions] });
    }
  };

  const handleClearGrid = () => {
    const isEmpty =
      pieces.length === 0 &&
      floatingPieces.length === 0 &&
      Object.keys(pieceValues).length === 0;

    const shouldClear =
      isEmpty ||
      (typeof window === 'undefined'
        ? true
        : window.confirm(
          'Esta acción eliminará todas las piezas de la malla y sus datos asociados. ¿Deseas continuar?'
        ));

    if (!shouldClear) {
      return;
    }

    dispatch({ type: 'CLEAR_GRID' });
  };

  // --- drag handlers
  const handleMouseDownPiece = (
    e: React.MouseEvent<HTMLDivElement>,
    piece: CurricularPiece,
    pieceOuterW: number,
    pieceOuterH: number
  ) => {
    if (e.target instanceof HTMLElement && isInteractive(e.target)) return;
    setDraggingId(piece.id);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragPieceOuter.current = { w: pieceOuterW, h: pieceOuterH };
    setDragPos({ x: colOffsets[piece.x], y: rowOffsets[piece.y] });
    const nextFloating = floatingPieces.filter((id) => id !== piece.id);
    if (nextFloating.length !== floatingPieces.length) {
      dispatch({ type: 'SET_FLOATING_PIECES', ids: nextFloating });
    }
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pointerMode !== 'select') return;
    if (!draggingId || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left - dragOffset.current.x;
    let y = e.clientY - rect.top - dragOffset.current.y;
    const maxX = gridWidth - dragPieceOuter.current.w;
    const maxY = gridHeight - dragPieceOuter.current.h;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    setDragPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!draggingId) return;
    const centerX = dragPos.x + dragPieceOuter.current.w / 2;
    const centerY = dragPos.y + dragPieceOuter.current.h / 2;
    let desiredCol = colWidths.length - 1;
    let accX = 0;
    for (let i = 0; i < colWidths.length; i++) {
      if (centerX < accX + colWidths[i]) { desiredCol = i; break; }
      accX += colWidths[i];
    }
    let desiredRow = rowHeights.length - 1;
    let accY = 0;
    for (let i = 0; i < rowHeights.length; i++) {
      if (centerY < accY + rowHeights[i]) { desiredRow = i; break; }
      accY += rowHeights[i];
    }
    let placed = true;

    const occupied = new Set(
      pieces.filter((p) => p.id !== draggingId).map((p) => `${p.x}-${p.y}`)
    );
    const piece = pieces.find((p) => p.id === draggingId);

    let nextPieces = pieces;
    if (piece) {
      let targetCol = desiredCol;
      let targetRow = desiredRow;
      if (occupied.has(`${targetCol}-${targetRow}`)) {
        let best: { col: number; row: number } | null = null;
        let bestDist = Infinity;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (occupied.has(`${c}-${r}`)) continue;
            const dist = Math.abs(c - desiredCol) + Math.abs(r - desiredRow);
            if (dist < bestDist) {
              bestDist = dist;
              best = { col: c, row: r };
            }
          }
        }
        if (!best) {
          placed = false;
        } else {
          targetCol = best.col;
          targetRow = best.row;
        }
      }

      if (placed) {
        nextPieces = pieces.map((p) =>
          p.id === draggingId ? { ...p, x: targetCol, y: targetRow } : p
        );
      }
    }

    if (placed) {
      dispatch({ type: 'SET_PIECES', pieces: nextPieces });
    } else {
      window.alert(
        'No hay posiciones disponibles en la malla. Agregue filas/columnas o borre una pieza curricular.'
      );
      dispatch({ type: 'SET_FLOATING_PIECES', ids: [...floatingPieces, draggingId] });
    }
    setDraggingId(null);
  };

  return (
    <div
      className={`${styles.mallaScreen} ${isRepositoryCollapsed ? styles.repositoryCollapsed : ''
        }`}
    >
      {isRepositoryCollapsed && (
        <Button
          type="button"
          className={`${styles.collapseToggle} ${styles.collapseToggleRestore}`}
          onClick={() => setIsRepositoryCollapsed(false)}
          title="Mostrar panel de maestros"
        >
          ›
        </Button>
      )}
      <div className={styles.repository}>
        <div className={styles.repositoryHeader}>
          <b>Bloque activo</b>
        </div>

        <div className={styles.masterRepo}>
          <select
            value={selectedMasterId || ''}
            onChange={(e) => handleSelectMaster(e.target.value)}
          >
            {availableMasters.length === 0 ? (
              <option value="" disabled>
                No hay bloques publicados
              </option>
            ) : (
              availableMasters.map(({ id, metadata }) => {
                const value = metadata.uuid || id;
                const displayName = formatMasterDisplayName(metadata, value);
                return (
                  <option key={value} value={value}>
                    {displayName}
                  </option>
                );
              })
            )}
          </select>
        </div>

        <div className={styles.repoSnapshot}>
          <BlockSnapshot
            template={template}
            visualTemplate={visual}
            aspect={aspect}
            paletteTokens={theme.tokens}
          />
        </div>
        <div className={styles.repoActions}>
          {onBack && (
            <ActionPillButton onClick={onBack} title="Ir a editor de bloque">
              ⬅️ Editar bloque activo
            </ActionPillButton>
          )}
          <ActionPillButton
            onClick={handleAddReferenced}
            title="Agregar bloque sincronizado con el maestro"
          >
            <img
              src={addRefIcon}
              alt=""
              style={{
                width: '2em',
                height: '2em',
                marginRight: '0.5em',
                verticalAlign: 'middle',
              }}
            />
            Agregar a la malla
          </ActionPillButton>
          <div className={styles.collapseToggleRow}>
            <Button
              type="button"
              className={`${styles.collapseToggle} ${styles.collapseToggleHide}`}
              onClick={() => setIsRepositoryCollapsed(true)}
              title="Ocultar panel de maestros"
            >
              ‹
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.mallaWrapper}>
        <Header
          className={styles.mallaHeader}
          title="Editor de Malla"
          left={
            <div className={styles.gridSizeControls}>
              <label className={styles.gridSizeControl}>
                <span>Filas</span>
                <input
                  className={styles.gridSizeInput}
                  type="number"
                  min={1}
                  value={rows}
                  onChange={(e) => handleRowsChange(Number(e.target.value))}
                />
              </label>
              <label className={styles.gridSizeControl}>
                <span>Columnas</span>
                <input
                  className={styles.gridSizeInput}
                  type="number"
                  min={1}
                  value={cols}
                  onChange={(e) => handleColsChange(Number(e.target.value))}
                />
              </label>
              <>
                <Button
                  type="button"
                  onClick={handleFillGrid}
                  title="Completar todas las posiciones vacías"
                >
                  Autocompletar
                </Button>
                <Button
                  type="button"
                  onClick={handleClearGrid}
                  title="Eliminar todas las piezas de la malla"
                >
                  Borrar todo
                </Button>
              </>
            </div>
          }
          center={
            <label className={`${styles.gridSizeControl} ${styles.zoomControl}`}>
              <div className={styles.zoomControlGroup}>
                <button
                  type="button"
                  className={styles.zoomButton}
                  onClick={() => handleZoomStep(-1)}
                  disabled={!canZoomOut}
                  aria-label="Reducir zoom"
                >
                  −
                </button>
                <input
                  className={styles.zoomSlider}
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={sliderStep}
                  value={zoomPercent}
                  onChange={(e) => handleZoomChange(Number(e.target.value) / 100)}
                  aria-label="Nivel de zoom de la malla"
                />
                <button
                  type="button"
                  className={styles.zoomButton}
                  onClick={() => handleZoomStep(1)}
                  disabled={!canZoomIn}
                  aria-label="Aumentar zoom"
                >
                  +
                </button>
                <span className={styles.zoomValue}>{zoomPercent}%</span>
              </div>
              <div className={styles.pointerToggle} role="group" aria-label="Modo del puntero">
                <button
                  type="button"
                  className={`${styles.pointerToggleButton} ${pointerMode === 'select' ? styles.pointerToggleButtonActive : ''
                    }`}
                  onClick={() => setPointerMode('select')}
                  aria-pressed={pointerMode === 'select'}
                  title="Seleccionar y mover piezas"
                >
                  👆🏻
                </button>
                <button
                  type="button"
                  className={`${styles.pointerToggleButton} ${pointerMode === 'pan' ? styles.pointerToggleButtonActive : ''
                    }`}
                  onClick={() => setPointerMode('pan')}
                  aria-pressed={pointerMode === 'pan'}
                  title="Desplazar la malla"
                >
                  🤚🏻
                </button>
              </div>
              <div className={styles.historyButtons}>
                <Button type="button" onClick={undo} disabled={!canUndo} title="Deshacer">
                  ↻
                </Button>
                <Button type="button" onClick={redo} disabled={!canRedo} title="Rehacer">
                  ↺
                </Button>
              </div>
            </label>
          }
          right={
            <>

              <label className={styles.blockMenuToggle}>
                <span>Menú de bloques:</span>
                <span className={styles.blockMenuToggleControl}>
                  <input
                    type="checkbox"
                    checked={showPieceMenus}
                    onChange={() => setShowPieceMenus((prev) => !prev)}
                    className={styles.blockMenuToggleInput}
                  />
                  <span className={styles.blockMenuToggleTrack} aria-hidden="true">
                    <span className={styles.blockMenuToggleThumb} />
                  </span>
                </span>
              </label>
            </>
          }
        />

        <div
          className={viewportClassName}
          ref={viewportRef}
          style={viewportStyle}
          onMouseDown={handleViewportMouseDown}
        >

          <div className={styles.mallaViewportGrid} style={zoomedGridContainerStyle}>
            <div
              className={styles.mallaViewportControlColumn}
              style={{ width: CONTROL_COLUMN_WIDTH }}
            >
              <div
                className={styles.rowControls}
                style={{ height: gridHeight * zoomScale }}
              >
                {rowControlButtons.plusButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    className={`${styles.rowControlButton} ${styles.rowControlButtonInsert}`}
                    style={{ top: button.top }}
                    onClick={() => handleInsertRow(button.index)}
                    aria-label={button.ariaLabel}
                    title={button.ariaLabel}
                  >
                    +
                  </button>
                ))}
                {rowControlButtons.minusButtons.map((button) => (
                  <button
                    key={button.key}
                    type="button"
                    className={`${styles.rowControlButton} ${styles.rowControlButtonRemove}`}
                    style={{ top: button.top }}
                    onClick={() => handleRemoveRow(button.index)}
                    aria-label={button.ariaLabel}
                    title={button.ariaLabel}
                    disabled={button.disabled}
                  >
                    −
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.mallaViewportGridContent}>
              <div className={styles.mallaAreaWrapper} style={zoomedGridWrapperStyle}>
                <div
                  className={mallaAreaClassName}
                  ref={gridRef}
                  style={zoomedGridAreaStyle}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  {pieces.map((p) => {
                    // --- calculo de template/visual/aspect por pieza (con expansión de merges para referenciadas)
                    let pieceTemplate: BlockTemplate;
                    let pieceVisual: VisualTemplate;
                    let pieceAspect: BlockAspect;
                    if (p.kind === 'ref') {
                      const master = mastersById[p.ref.sourceId] ?? { template, visual, aspect };
                      // Expande los bounds guardados a los merges vigentes del maestro
                      const safeBounds = expandBoundsToMerges(master.template, p.ref.bounds);

                      pieceTemplate = cropTemplate(master.template, safeBounds);
                      pieceVisual = cropVisualTemplate(master.visual, master.template, safeBounds);

                      // Las piezas referenciadas siguen el aspecto del maestro asociado
                      pieceAspect = master.aspect;
                    } else {
                      // Snapshot: usa su copia materializada tal cual
                      pieceTemplate = p.template;
                      pieceVisual = p.visual;
                      pieceAspect = p.aspect;
                    }

                    const m = computeMetrics(pieceTemplate, pieceAspect);

                    const left = draggingId === p.id ? dragPos.x : colOffsets[p.x];
                    const top = draggingId === p.id ? dragPos.y : rowOffsets[p.y];

                    const values = pieceValues[p.id] ?? {};
                    const onValueChange = (key: string, value: string | number | boolean) => {
                      dispatch({ type: 'UPDATE_PIECE_VALUE', pieceId: p.id, key, value });
                    };

                    const canUnfreeze = p.kind === 'snapshot' && !!p.origin;
                    const toggleLabel = p.kind === 'ref' ? '🧊 Congelar' : '🔗 Descongelar';

                    const floating = floatingPieces.includes(p.id);
                    const blockWrapperClassName = [
                      styles.blockWrapper,
                      floating ? styles.floating : '',
                      pointerMode === 'pan' ? styles.blockWrapperPan : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div
                        key={p.id}
                        className={blockWrapperClassName}
                        style={{ left, top, width: m.outerW, height: m.outerH, position: 'absolute' }}
                        onMouseDown={
                          pointerMode === 'select'
                            ? (e) => handleMouseDownPiece(e, p, m.outerW, m.outerH)
                            : undefined
                        }
                      >
                        {/* Toolbar por pieza */}
                        <div
                          className={`${styles.pieceToolbar} ${showPieceMenus ? '' : styles.toolbarHidden
                            }`}
                        >
                          {/* Toggle congelar/descongelar */}
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (p.kind === 'snapshot' && !p.origin) return;
                              togglePieceKind(p.id);
                            }}
                            title={toggleLabel}
                            disabled={p.kind === 'snapshot' && !p.origin}
                            style={{
                              background: p.kind === 'ref' || canUnfreeze
                                ? 'var(--color-surface)'
                                : 'var(--color-bg)',
                              color: p.kind === 'ref' || canUnfreeze ? 'inherit' : '#999',
                              cursor: p.kind === 'ref' || canUnfreeze ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {toggleLabel}
                          </Button>

                          {/* Duplicar */}
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePiece(p);
                            }}
                            title="Duplicar"
                          >
                            ⧉
                          </Button>

                          {/* Eliminar */}
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePiece(p.id);
                            }}
                            title="Eliminar"
                          >
                            🗑️
                          </Button>
                        </div>

                        <TemplateGrid
                          template={pieceTemplate}
                          selectedCells={[]}
                          onClick={() => { }}
                          onContextMenu={() => { }}
                          onMouseDown={() => { }}
                          onMouseEnter={() => { }}
                          onMouseUp={() => { }}
                          onMouseLeave={() => { }}
                          applyVisual={true}
                          visualTemplate={pieceVisual}
                          style={m.gridStyle}
                          values={values}
                          onValueChange={onValueChange}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
