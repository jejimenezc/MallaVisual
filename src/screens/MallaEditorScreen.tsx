// src/screens/MallaEditorScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Link2, Snowflake } from 'lucide-react';
import type {
  BlockTemplate,
  CurricularPiece,
  CurricularPieceRef,
  CurricularPieceSnapshot,
  BlockSourceRef,
} from '../types/curricular.ts';
import { TemplateGrid } from '../components/TemplateGrid';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import {
  cropTemplate,
  cropVisualTemplate,
  getActiveBounds,
  expandBoundsToMerges,
} from '../utils/block-active.ts';
import { BlockSnapshot } from '../components/BlockSnapshot';
import {
  type MallaExport,
  MALLA_SCHEMA_VERSION,
  createDefaultMetaPanel,
  createDefaultProjectTheme,
  normalizeMetaPanelConfig,
  normalizeProjectTheme,
  type ColumnHeadersConfig,
  type MetaPanelConfig,
  type ProjectTheme,
} from '../utils/malla-io.ts';
import {
  createDefaultColumnHeaders,
  normalizeColumnHeadersConfig,
} from '../utils/column-headers.ts';
import { useProject, useBlocksRepo } from '../core/persistence/hooks.ts';
import styles from './MallaEditorScreen.module.css';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { ActionPillButton } from '../components/ActionPillButton/ActionPillButton';
import { MetaCalcHeader } from '../components/MetaCalcHeader';
import { MetaCalcCellEditor } from '../components/MetaCalcCellEditor';
import { MallaGridOverlay } from '../components/MallaGridOverlay';
import { ColumnHeadersBand } from '../components/ColumnHeadersBand';
import { ColumnHeaderRowEditor } from '../components/ColumnHeaderRowEditor';
import addRefIcon from '../assets/icons/icono-plus-50.png';
import { useAppCommand } from '../state/app-commands';
import { useMallaEditorMasters } from '../state/use-malla-editor-masters.ts';
import { useMallaEditorBands } from '../state/use-malla-editor-bands.ts';
import { computeSignature } from '../utils/comparators.ts';
import { pushHistoryEntry } from '../utils/history.ts';
import { confirmAsync } from '../ui/alerts';
import { useToast } from '../ui/toast/ToastContext.tsx';
import {
  type MallaHistoryEntry,
  boundsEqual,
  buildNormalizedInitialMalla,
  cloneMallaHistoryEntry,
  computeMetrics,
  describePieceLocation,
  findFirstFreeCell,
  formatMasterDisplayName,
  getPieceVisualStatus,
  isInteractive,
} from '../utils/malla-editor-helpers.ts';

const STORAGE_KEY = 'malla-editor-state';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const CONTROL_COLUMN_WIDTH = 56;
const REPO_MIN_OUTER_METRICS_FALLBACK = computeMetrics([[{ active: true }]], '1/1');

const DuplicateIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <rect x="3" y="6" width="9" height="9" rx="1.5" />
    <rect x="7" y="2" width="9" height="9" rx="1.5" />
    <path d="M15.5 13v5M13 15.5h5" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 6h12" />
    <path d="M8 6V4h4v2" />
    <path d="M6.5 6l.7 10h5.6l.7-10" />
    <path d="M8.5 9v5M11.5 9v5" />
  </svg>
);

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
  suspendAutosave?: boolean;
  onOpenPublicationPreview?: () => void;
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
  suspendAutosave = false,
  onOpenPublicationPreview,
}) => {
  const initialMallaSignature = useMemo(() => {
    if (!initialMalla) return null;
    return computeSignature(initialMalla);
  }, [initialMalla]);
  const bounds = useMemo(() => getActiveBounds(template), [template]);

  // --- malla y piezas
  const [cols, setCols] = useState(initialMalla?.grid?.cols ?? 5);
  const [rows, setRows] = useState(initialMalla?.grid?.rows ?? 5);
  const [pieces, setPieces] = useState<CurricularPiece[]>(initialMalla?.pieces ?? []);
  const [pieceValues, setPieceValues] = useState<
    Record<string, Record<string, string | number | boolean>>
  >(initialMalla?.values ?? {});
  const [floatingPieces, setFloatingPieces] = useState<string[]>(
    initialMalla?.floatingPieces ?? []);
  const [metaPanel, setMetaPanel] = useState<MetaPanelConfig>(
    initialMalla
      ? normalizeMetaPanelConfig(initialMalla.metaPanel)
      : createDefaultMetaPanel(false),
  );
  const [columnHeaders, setColumnHeaders] = useState<ColumnHeadersConfig>(
    initialMalla
      ? normalizeColumnHeadersConfig(initialMalla.columnHeaders)
      : createDefaultColumnHeaders(false),
  );
  const [theme, setTheme] = useState<ProjectTheme>(
    initialMalla ? normalizeProjectTheme(initialMalla.theme) : createDefaultProjectTheme(),
  );
  const [isResetting, setIsResetting] = useState(false);
  const [showPieceMenus, setShowPieceMenus] = useState(true);
  const [isRepositoryCollapsed, setIsRepositoryCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isStructureMenuOpen, setIsStructureMenuOpen] = useState(false);
  const [isGlobalToolsMenuOpen, setIsGlobalToolsMenuOpen] = useState(false);
  const { autoSave, clearDraft, flushAutoSave, loadDraft } = useProject({
    storageKey: STORAGE_KEY,
    projectId,
    projectName,
  });
  const { listBlocks } = useBlocksRepo();
  const showToast = useToast();

  const historyRef = useRef<MallaHistoryEntry[]>([]);
  const historySerializedRef = useRef<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isHistoryInitialized, setIsHistoryInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const ignoreNextInitialMallaRef = useRef(false);
  const initialProjectIdRef = useRef<string | null | undefined>(projectId);
  const ignoreDraftForProjectChangeRef = useRef(false);
  const skipNextHistoryForMasterChangeRef = useRef(false);
  const historyTransactionDepthRef = useRef(0);
  const historyShouldMergeRef = useRef(false);

  const runHistoryTransaction = useCallback(<T,>(task: () => T | Promise<T>): T | Promise<T> => {
    historyTransactionDepthRef.current += 1;
    historyShouldMergeRef.current = true;

    const scheduleClose = () => {
      setTimeout(() => {
        historyTransactionDepthRef.current -= 1;
        if (historyTransactionDepthRef.current <= 0) {
          historyTransactionDepthRef.current = 0;
          historyShouldMergeRef.current = false;
        }
      }, 0);
    };

    try {
      const result = task();
      if (result && typeof (result as PromiseLike<T>).then === 'function') {
        return (result as Promise<T>).finally(scheduleClose);
      }
      scheduleClose();
      return result;
    } catch (error) {
      scheduleClose();
      throw error;
    }
  }, []);

  const {
    availableMasters,
    mastersById,
    setMastersById,
    initialMasters,
    initialMasterId,
    selectedMasterId,
    setSelectedMasterId,
    selectedMasterIdRef,
    skipNextMasterSyncRef,
    repositoryEntries,
    repoMinOuterW,
    repoMinOuterH,
  } = useMallaEditorMasters({
    initialMalla,
    repoId,
    template,
    visual,
    aspect,
    listBlocks,
    runHistoryTransaction,
    repoMinOuterFallback: REPO_MIN_OUTER_METRICS_FALLBACK,
  });

  const historySnapshot = useMemo<MallaHistoryEntry>(
    () => ({
      cols,
      rows,
      pieces,
      pieceValues,
      floatingPieces,
      mastersById,
      selectedMasterId,
      metaPanel,
      columnHeaders,
      theme,
    }),
    [cols, rows, pieces, pieceValues, floatingPieces, mastersById, selectedMasterId, metaPanel, columnHeaders, theme],
  );

  const historySnapshotSerialized = useMemo(
    () => computeSignature(historySnapshot),
    [historySnapshot],
  );

  useEffect(() => {
    if (!isHistoryInitialized) {
      const entry = cloneMallaHistoryEntry(historySnapshot);
      historyRef.current = [entry];
      historySerializedRef.current = [historySnapshotSerialized];
      setHistoryIndex(0);
      setIsHistoryInitialized(true);
      return;
    }
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    if (skipNextHistoryForMasterChangeRef.current) {
      skipNextHistoryForMasterChangeRef.current = false;
      const currentHistory = historyRef.current.slice();
      const currentSerialized = historySerializedRef.current.slice();
      currentHistory[historyIndex] = cloneMallaHistoryEntry(historySnapshot);
      currentSerialized[historyIndex] = historySnapshotSerialized;
      historyRef.current = currentHistory;
      historySerializedRef.current = currentSerialized;
      return;
    }
    if (historyShouldMergeRef.current) {
      const currentHistory = historyRef.current.slice();
      const currentSerialized = historySerializedRef.current.slice();
      currentHistory[historyIndex] = cloneMallaHistoryEntry(historySnapshot);
      currentSerialized[historyIndex] = historySnapshotSerialized;
      historyRef.current = currentHistory;
      historySerializedRef.current = currentSerialized;
      return;
    }
    const currentSerialized = historySerializedRef.current[historyIndex];
    if (currentSerialized === historySnapshotSerialized) return;
    const result = pushHistoryEntry({
      entries: historyRef.current,
      serialized: historySerializedRef.current,
      index: historyIndex,
      newEntry: cloneMallaHistoryEntry(historySnapshot),
      newSerialized: historySnapshotSerialized,
    });
    historyRef.current = result.entries;
    historySerializedRef.current = result.serialized;
    setHistoryIndex(result.index);
  }, [
    historySnapshot,
    historySnapshotSerialized,
    historyIndex,
    isHistoryInitialized,
  ]);

  useEffect(() => {
    if (ignoreNextInitialMallaRef.current) {
      ignoreNextInitialMallaRef.current = false;
      return;
    }
    setIsHistoryInitialized(false);
  }, [initialMallaSignature]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  // --- drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPieceOuter = useRef({ w: 0, h: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const structureMenuRef = useRef<HTMLDivElement>(null);
  const globalToolsMenuRef = useRef<HTMLDivElement>(null);
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

  const applyHistorySnapshot = useCallback(
    (entry: MallaHistoryEntry) => {
      const clone = cloneMallaHistoryEntry(entry);
      const nextMasters = clone.mastersById;
      const preferredMasterId = selectedMasterIdRef.current;
      const fallbackMasterId = clone.selectedMasterId;
      const nextSelectedId =
        preferredMasterId && nextMasters[preferredMasterId]
          ? preferredMasterId
          : fallbackMasterId;

      setCols(clone.cols);
      setRows(clone.rows);
      setPieces(clone.pieces);
      setPieceValues(clone.pieceValues);
      setFloatingPieces(clone.floatingPieces);
      skipNextMasterSyncRef.current = true;
      setMastersById(nextMasters);
      setSelectedMasterId(nextSelectedId);
      setDraggingId(null);
      setDragPos({ x: 0, y: 0 });
      setMetaPanel(clone.metaPanel);
      setColumnHeaders(clone.columnHeaders);
      setTheme(clone.theme);
      const restoredMaster = nextSelectedId ? nextMasters[nextSelectedId] : undefined;
      if (restoredMaster) {
        onUpdateMaster?.({
          template: restoredMaster.template,
          visual: restoredMaster.visual,
          aspect: restoredMaster.aspect,
          repoId: nextSelectedId,
        });
      }
    },
    [
      setCols,
      setRows,
      setPieces,
      setPieceValues,
      setFloatingPieces,
      setMastersById,
      setSelectedMasterId,
      setDraggingId,
      setDragPos,
      setMetaPanel,
      setColumnHeaders,
      setTheme,
      onUpdateMaster,
      selectedMasterIdRef,
      skipNextMasterSyncRef,
    ],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistorySnapshot(entry);
    setHistoryIndex(newIndex);
  }, [historyIndex, applyHistorySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistorySnapshot(entry);
    setHistoryIndex(newIndex);
  }, [historyIndex, applyHistorySnapshot]);

  useAppCommand('undo', handleUndo, canUndo);
  useAppCommand('redo', handleRedo, canRedo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.target instanceof HTMLElement && isInteractive(event.target)) return;
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

  useEffect(() => {
    if (!isStructureMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (structureMenuRef.current?.contains(target)) {
        return;
      }
      setIsStructureMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStructureMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isStructureMenuOpen]);

  useEffect(() => {
    if (!isGlobalToolsMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (globalToolsMenuRef.current?.contains(target)) {
        return;
      }
      setIsGlobalToolsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGlobalToolsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isGlobalToolsMenuOpen]);
  const {
    colWidths,
    rowHeights,
    colOffsets,
    rowOffsets,
    gridWidth,
    gridHeight,
  } = useMemo(() => {
    const colWidths = Array(cols).fill(repoMinOuterW);
    const rowHeights = Array(rows).fill(repoMinOuterH);
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
  }, [pieces, cols, rows, template, visual, aspect, mastersById, repoMinOuterW, repoMinOuterH]);

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

  const {
    metaMenuRef,
    headersMenuRef,
    isMetaMenuOpen,
    setIsMetaMenuOpen,
    isHeadersMenuOpen,
    setIsHeadersMenuOpen,
    isMetaEditorOpen,
    activeMetaRowId,
    activeMetaColIndex,
    isHeaderEditorOpen,
    activeHeaderRowId,
    activeHeaderColIndex,
    normalizedColumnHeaders,
    normalizedMetaRows,
    topBandsHeight,
    zoomedGridContainerStyle,
    zoomedMetaCalcHeaderWrapperStyle,
    zoomedMetaCalcColWidths,
    mallaForMetaCalc,
    metaCalcDeps,
    handleMetaCellClick,
    activeMetaRow,
    activeMetaRowPosition,
    activeMetaCellConfig,
    isEditingOverrideActive,
    activeMetaEditorCatalog,
    columnMetaEditorCatalog,
    handleMetaPanelEnabledChange,
    handleMetaEditorCancel,
    handleMetaAddRow,
    handleMetaRowVisibilityChange,
    handleMetaDuplicateRow,
    handleMetaDeleteRow,
    handleMetaOverrideToggle,
    handleMetaEditorSave,
    closeHeaderRowEditor,
    handleColumnHeadersEnabledChange,
    handleColumnHeaderAddRow,
    handleColumnHeaderCellClick,
    handleColumnHeaderDuplicateRow,
    handleColumnHeaderDeleteRow,
    handleColumnHeaderRowVisibilityChange,
    handleColumnHeaderEditorSave,
    handleColumnHeaderEditorApplySeries,
    activeHeaderRow,
    activeHeaderRowPosition,
    canAddColumnHeaderRow,
    canEditColumnHeaders,
    getHeaderRowPreview,
  } = useMallaEditorBands({
    cols,
    rows,
    pieces,
    pieceValues,
    colWidths,
    gridWidth,
    gridHeight,
    zoomScale,
    metaPanel,
    setMetaPanel,
    columnHeaders,
    setColumnHeaders,
    mastersById,
    template,
    availableMasters,
    formatMasterDisplayName,
    runHistoryTransaction,
    showToast,
  });

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
    runHistoryTransaction(() => {
      if (id !== selectedMasterId) {
        skipNextNormalizedInitialRef.current = true;
        skipNextHistoryForMasterChangeRef.current = true;
      }
      setSelectedMasterId(id);
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
        setMastersById((prev) => ({ ...prev, [id]: data }));
        onUpdateMaster?.({
          template: data.template,
          visual: data.visual,
          aspect: data.aspect,
          repoId: id,
        });
      }
    });
  };

  const normalizedInitial = useMemo(
    () =>
      buildNormalizedInitialMalla({
        initialMalla,
        repoId,
        template,
        visual,
        aspect,
      }),
    [initialMalla, repoId, template, visual, aspect],
  );

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
      metaPanel: nextMetaPanel,
      columnHeaders: nextColumnHeaders,
      theme: nextTheme,
    } = normalizedInitial;

    const serialized = computeSignature(project);
    if (savedRef.current === serialized) return;

    skipNextSyncRef.current = true;
    initialPersistenceSignatureRef.current = serialized;
    savedRef.current = serialized;
    setMastersById(masters);
    setCols(grid.cols);
    setRows(grid.rows);
    setPieces(nextPieces);
    setPieceValues(values);
    setFloatingPieces(nextFloating);
    setMetaPanel(nextMetaPanel);
    setColumnHeaders(nextColumnHeaders);
    setSelectedMasterId(activeMasterId);
    setTheme(nextTheme);
    setIsHistoryInitialized(false);
  }, [normalizedInitial, setMastersById, setSelectedMasterId]);

  useEffect(() => {
    if (isResetting && ignoreDraftForProjectChangeRef.current) return;

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
      metaPanel,
      columnHeaders,
    };
    const serialized = computeSignature(project);
    const shouldRunInitialPersist = initialPersistenceSignatureRef.current === serialized;
    const shouldSkipMallaChange = skipNextSyncRef.current;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
    }

    if (savedRef.current === serialized) {
      if (shouldRunInitialPersist) {
        if (!suspendAutosave) {
          autoSave(project);
        }
        initialPersistenceSignatureRef.current = null;
      }
      return;
    }

    savedRef.current = serialized;
    if (!shouldSkipMallaChange && onMallaChange) {
      ignoreNextInitialMallaRef.current = true;
      onMallaChange(project);
    }
    if (suspendAutosave) {
      if (shouldRunInitialPersist) {
        initialPersistenceSignatureRef.current = null;
      }
      return;
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
    metaPanel,
    columnHeaders,
    selectedMasterId,
    repositoryEntries,
    theme,
    autoSave,
    onMallaChange,
    isResetting,
    suspendAutosave,
  ]);

  useEffect(() => {
    if (suspendAutosave) {
      return undefined;
    }

    return () => flushAutoSave();
  }, [flushAutoSave, suspendAutosave]);

  useEffect(() => {
    if (initialMalla) {
      return;
    }

    if (ignoreDraftForProjectChangeRef.current) {
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

    setSelectedMasterId(nextActiveId);
    setMastersById(nextMasters);
    setCols(data?.grid?.cols ?? 5);
    setRows(data?.grid?.rows ?? 5);
    setPieces(data?.pieces ?? []);
    setPieceValues(data?.values ?? {});
    setFloatingPieces(data?.floatingPieces ?? []);
    setMetaPanel(data ? normalizeMetaPanelConfig(data.metaPanel) : createDefaultMetaPanel(false));
    setColumnHeaders(
      data ? normalizeColumnHeadersConfig(data.columnHeaders) : createDefaultColumnHeaders(false),
    );
    setTheme(normalizeProjectTheme(data?.theme));
    setIsHistoryInitialized(false);
  }, [
    aspect,
    initialMalla,
    loadDraft,
    onUpdateMaster,
    repoId,
    selectedMasterIdRef,
    setMastersById,
    setSelectedMasterId,
    template,
    visual,
  ]);

  useEffect(() => {
    if (initialProjectIdRef.current === undefined) {
      initialProjectIdRef.current = projectId;
      return;
    }

    if (initialProjectIdRef.current === projectId) {
      return;
    }

    initialProjectIdRef.current = projectId;
    ignoreDraftForProjectChangeRef.current = true;
    setIsResetting(true);
    clearDraft(STORAGE_KEY);
    flushAutoSave();

    historyRef.current = [];
    historySerializedRef.current = [];
    setHistoryIndex(0);

    const nextMasters = initialMasters;
    const nextSelectedMasterId = initialMasterId;
    const nextCols = initialMalla?.grid?.cols ?? 5;
    const nextRows = initialMalla?.grid?.rows ?? 5;
    const nextPieces = initialMalla?.pieces ?? [];
    const nextValues = initialMalla?.values ?? {};
    const nextFloatingPieces = initialMalla?.floatingPieces ?? [];
    const nextMetaPanel = initialMalla
      ? normalizeMetaPanelConfig(initialMalla.metaPanel)
      : createDefaultMetaPanel(false);
    const nextColumnHeaders = initialMalla
      ? normalizeColumnHeadersConfig(initialMalla.columnHeaders)
      : createDefaultColumnHeaders(false);
    const nextTheme = initialMalla
      ? normalizeProjectTheme(initialMalla.theme)
      : createDefaultProjectTheme();

    setMastersById(nextMasters);
    setSelectedMasterId(() => {
      selectedMasterIdRef.current = nextSelectedMasterId;
      return nextSelectedMasterId;
    });
    setCols(nextCols);
    setRows(nextRows);
    setPieces(nextPieces);
    setPieceValues(nextValues);
    setFloatingPieces(nextFloatingPieces);
    setMetaPanel(nextMetaPanel);
    setColumnHeaders(nextColumnHeaders);
    setTheme(nextTheme);
    setIsHistoryInitialized(false);

    const timeout = setTimeout(() => {
      setIsResetting(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [
    clearDraft,
    flushAutoSave,
    initialMalla,
    initialMasterId,
    initialMasters,
    projectId,
    selectedMasterIdRef,
    setMastersById,
    setSelectedMasterId,
  ]);

  useEffect(() => {
    if (ignoreDraftForProjectChangeRef.current && !isResetting) {
      ignoreDraftForProjectChangeRef.current = false;
    }
  }, [isResetting, mastersById, cols, rows, pieces, pieceValues, floatingPieces, metaPanel, columnHeaders]);

  useEffect(() => {
    const nextBounds = expandBoundsToMerges(template, getActiveBounds(template));
    setPieces((prev) => {
      let changed = false;
      const next = prev.map((p) => {
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
      return changed ? next : prev;
    });
  }, [template, aspect, selectedMasterId]);

  // --- validación de reducción de la macro-grilla
  const insertRowAt = (targetIndex: number) => {
    setRows((prev) => prev + 1);
    setPieces((prev) =>
      prev.map((piece) => (piece.y >= targetIndex ? { ...piece, y: piece.y + 1 } : piece))
    );
  };

  const removeRowAt = (targetIndex: number) => {
    setRows((prev) => Math.max(1, prev - 1));
    setPieces((prev) =>
      prev.map((piece) => (piece.y > targetIndex ? { ...piece, y: piece.y - 1 } : piece))
    );
  };

  type RowMutationOptions = {
    recordHistory?: boolean;
  };

  const handleInsertRow = (index: number, options?: RowMutationOptions) => {
    const targetIndex = Math.max(0, Math.min(index, rows));
    const task = () => insertRowAt(targetIndex);
    if (options?.recordHistory === false) {
      task();
    } else {
      runHistoryTransaction(task);
    }
  };

  const handleRemoveRow = (index: number, options?: RowMutationOptions) => {
    if (rows <= 1) return;
    const targetIndex = Math.max(0, Math.min(index, rows - 1));
    const blocker = pieces.find((p) => p.y === targetIndex);
    if (blocker) {
      const location = describePieceLocation(blocker);
      showToast(
        `No se puede eliminar la fila ${targetIndex + 1} porque la pieza en ${location} la está usando. ` +
        'Mueve o elimina esa pieza antes de quitar la fila.',
        'error'
      );
      return;
    }
    const task = () => removeRowAt(targetIndex);
    if (options?.recordHistory === false) {
      task();
    } else {
      runHistoryTransaction(task);
    }
  };

  const handleRowsChange = (newRows: number) => {
    const numericRows = Number.isFinite(newRows) ? newRows : rows;
    const nextRows = Math.max(1, Math.floor(numericRows));
    if (nextRows === rows) return;

    if (nextRows < rows) {
      const blocker = pieces.find((p) => p.y >= nextRows);
      if (blocker) {
        const location = describePieceLocation(blocker);
        showToast(
          `No se puede reducir la malla a ${nextRows} filas porque la pieza en ${location} quedaría fuera. ` +
          'Mueve o elimina la pieza antes de ajustar el tamaño.',
          'error'
        );
        return;
      }

      runHistoryTransaction(() => {
        let currentRows = rows;
        for (let i = 0; i < rows - nextRows; i += 1) {
          const targetIndex = currentRows - 1;
          handleRemoveRow(targetIndex, { recordHistory: false });
          currentRows -= 1;
        }
      });
      return;
    }

    runHistoryTransaction(() => {
      let currentRows = rows;
      for (let i = 0; i < nextRows - rows; i += 1) {
        handleInsertRow(currentRows, { recordHistory: false });
        currentRows += 1;
      }
    });
  };

  const handleColsChange = (newCols: number) => {
    if (newCols < cols) {
      const blocker = pieces.find((p) => p.x >= newCols);
      if (blocker) {
        const location = describePieceLocation(blocker);
        showToast(
          `No se puede reducir la malla a ${newCols} columnas porque la pieza en ${location} quedaría fuera. ` +
          'Mueve o elimina la pieza para continuar.',
          'error'
        );
        return;
      }
    }
    setCols(newCols);
  };

  // --- agregar piezas
  const findFreeCell = () => findFirstFreeCell(cols, rows, pieces);

  const handleAddReferenced = () => {
    const pos = findFreeCell();
    if (!pos) {
      showToast(
        'No hay espacio libre en la malla para agregar otra pieza. Agrega filas/columnas o libera una celda antes de continuar.',
        'error'
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
    setPieces((prev) => [...prev, piece]);
    setFloatingPieces((prev) => [...prev, id]);
  };

  // --- TOGGLE: congelar ↔ descongelar
  const togglePieceKind = (id: string) => {
    setPieces((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        if (p.kind === 'ref') {
          // ref -> snapshot (congelar)
          const master = mastersById[p.ref.sourceId] ?? { template, visual, aspect };
          const safeBounds = expandBoundsToMerges(master.template, p.ref.bounds);
          const tpl = cropTemplate(master.template, safeBounds);
          const vis = cropVisualTemplate(master.visual, master.template, safeBounds);
          const origin: BlockSourceRef = { ...p.ref };
          return {
            kind: 'snapshot',
            id: p.id,
            template: tpl,
            visual: vis,
            aspect: master.aspect,
            x: p.x,
            y: p.y,
            origin,
          } as CurricularPieceSnapshot;
        } else {
          // snapshot -> ref (descongelar) solo si hay origen
          if (!p.origin) return p;
          return {
            kind: 'ref',
            id: p.id,
            ref: { ...p.origin },
            x: p.x,
            y: p.y,
          } as CurricularPieceRef;
        }
      })
    );
  };

  // --- Duplicar pieza (mantiene kind y valores del usuario)
  const duplicatePiece = (src: CurricularPiece) => {
    const pos = findFreeCell();
    if (!pos) {
      const location = describePieceLocation(src);
      showToast(
        `No hay espacio para duplicar la pieza ubicada en ${location}. Amplía la malla o libera un espacio disponible.`,
        'error'
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
    setPieces((prev) => [...prev, clone]);
    setFloatingPieces((prev) => [...prev, newId]);

    // Duplicar también los valores de usuario de la pieza
    setPieceValues((prev) => {
      const oldVals = prev[src.id] ?? {};
      return { ...prev, [newId]: { ...oldVals } };
    });
  };

  // --- Eliminar pieza (y sus valores)
  const deletePiece = (id: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== id));
    setPieceValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // --- completar o limpiar la macro-grilla
  const handleFillGrid = () => {
    setPieces((prev) => {
      const occupied = new Set(prev.map((p) => `${p.x}-${p.y}`));
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
      if (additions.length === 0) {
        showToast(
          'La malla ya está completa. Amplía filas/columnas o libera una celda antes de autocompletar.',
          'error',
        );
        return prev;
      }
      return [...prev, ...additions];
    });
  };

  const handleClearGrid = async () => {
    const isEmpty =
      pieces.length === 0 &&
      floatingPieces.length === 0 &&
      Object.keys(pieceValues).length === 0;

    if (!isEmpty) {
      const pieceCount = pieces.length;
      const floatingCount = floatingPieces.length;
      const valueCount = Object.keys(pieceValues).length;
      const impactSummary = [
        pieceCount ? `${pieceCount} piezas en la malla` : null,
        floatingCount ? `${floatingCount} piezas flotantes` : null,
        valueCount ? `${valueCount} conjuntos de datos` : null,
      ]
        .filter(Boolean)
        .join(', ');

      const confirmed = await confirmAsync({
        title: 'Borrar malla y datos',
        message:
          `Se eliminarán ${impactSummary || 'las piezas y datos actuales de la malla'}. ` +
          'Podrás cancelar si necesitas hacer un respaldo antes de continuar.',
        confirmLabel: 'Sí, borrar todo',
        cancelLabel: 'Cancelar',
        variant: 'destructive',
      });

      if (!confirmed) {
        return;
      }
    }

    setPieces([]);
    setPieceValues({});
    setFloatingPieces([]);
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
    setFloatingPieces((prev) => prev.filter((id) => id !== piece.id));
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
    setPieces((prev) => {
      const occupied = new Set(
        prev.filter((p) => p.id !== draggingId).map((p) => `${p.x}-${p.y}`)
      );
      const piece = prev.find((p) => p.id === draggingId);
      if (!piece) return prev;
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
          return prev;
        }
        targetCol = best.col;
        targetRow = best.row;
      }
      return prev.map((p) =>
        p.id === draggingId ? { ...p, x: targetCol, y: targetRow } : p
      );
    });
    if (!placed) {
      const draggedPiece = pieces.find((p) => p.id === draggingId);
      const location = draggedPiece ? describePieceLocation(draggedPiece) : null;
      const message = location
        ? `No hay posiciones libres para reubicar la pieza que estaba en ${location}. Amplía la malla o libera una celda para continuar.`
        : 'No hay posiciones libres para ubicar la pieza arrastrada. Amplía la malla o libera una celda para continuar.';
      showToast(message, 'error');
      setFloatingPieces((prev) => [...prev, draggingId]);
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
              <div className={styles.headerPopoverMenu} ref={structureMenuRef}>
                <Button
                  type="button"
                  onClick={() => setIsStructureMenuOpen((prev) => !prev)}
                  className={styles.headerPopoverTrigger}
                  aria-haspopup="menu"
                  aria-expanded={isStructureMenuOpen}
                  aria-label="Estructura de la malla"
                  title="Estructura de la malla"
                >
                  Estructura general
                </Button>
                {isStructureMenuOpen ? (
                  <div className={styles.headerPopover} role="menu" aria-label="Estructura de la malla">
                    <div className={styles.headerPopoverHint}>Ajusta la estructura base de la malla.</div>
                    <label className={styles.headerPopoverField}>
                      <span>Líneas</span>
                      <input
                        className={styles.gridSizeInput}
                        type="number"
                        min={1}
                        value={rows}
                        onChange={(e) => handleRowsChange(Number(e.target.value))}
                      />
                    </label>
                    <label className={styles.headerPopoverField}>
                      <span>Periodos</span>
                      <input
                        className={styles.gridSizeInput}
                        type="number"
                        min={1}
                        value={cols}
                        onChange={(e) => handleColsChange(Number(e.target.value))}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
              <div className={styles.headerPopoverMenu} ref={globalToolsMenuRef}>
                <Button
                  type="button"
                  onClick={() => setIsGlobalToolsMenuOpen((prev) => !prev)}
                  className={styles.headerPopoverTrigger}
                  aria-haspopup="menu"
                  aria-expanded={isGlobalToolsMenuOpen}
                  aria-label="Acciones globales de malla"
                  title="Acciones globales de malla"
                >
                  {'\u22EE'}
                </Button>
                {isGlobalToolsMenuOpen ? (
                  <div
                    className={styles.headerPopover}
                    role="menu"
                    aria-label="Acciones globales de malla"
                  >
                    <button
                      type="button"
                      className={styles.metaMenuAction}
                      onClick={() => {
                        handleFillGrid();
                        setIsGlobalToolsMenuOpen(false);
                      }}
                    >
                      Autocompletar
                    </button>
                    <button
                      type="button"
                      className={`${styles.metaMenuAction} ${styles.headerPopoverDangerAction}`}
                      onClick={() => {
                        void handleClearGrid();
                        setIsGlobalToolsMenuOpen(false);
                      }}
                    >
                      Borrar todo
                    </button>
                  </div>
                ) : null}
              </div>
              <span className={styles.headerInlineSeparator} aria-hidden="true">
                |
              </span>
              <Button
                type="button"
                onClick={onOpenPublicationPreview}
                className={styles.headerPopoverTrigger}
                aria-label="Ver en Modo Presentación"
                title="Visualización de una versión publicable del proyecto activo"
                disabled={!onOpenPublicationPreview}
              >
                Ver en Modo Presentación
              </Button>
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
                <Button type="button" onClick={handleUndo} disabled={!canUndo} title="Deshacer">
                  ↻
                </Button>
                <Button type="button" onClick={handleRedo} disabled={!canRedo} title="Rehacer">
                  ↺
                </Button>
              </div>
            </label>
          }
          right={
            <>

              <div className={styles.metaMenu} ref={headersMenuRef}>
                <Button
                  type="button"
                  onClick={() => setIsHeadersMenuOpen((prev) => !prev)}
                  className={styles.metaMenuTrigger}
                  aria-haspopup="menu"
                  aria-expanded={isHeadersMenuOpen}
                  aria-label="Encabezados por periodo"
                >
                  Encabezados
                </Button>
                {isHeadersMenuOpen ? (
                  <div className={styles.metaMenuPopover} role="menu" aria-label="Opciones de encabezados por periodo">
                    <label className={styles.blockMenuToggle}>
                      <span>Mostrar encabezados</span>
                      <span className={styles.blockMenuToggleControl}>
                        <input
                          type="checkbox"
                          checked={normalizedColumnHeaders.enabled !== false}
                          onChange={(event) => handleColumnHeadersEnabledChange(event.target.checked)}
                          className={styles.blockMenuToggleInput}
                        />
                        <span className={styles.blockMenuToggleTrack} aria-hidden="true">
                          <span className={styles.blockMenuToggleThumb} />
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className={styles.metaMenuAction}
                      onClick={handleColumnHeaderAddRow}
                      disabled={!canAddColumnHeaderRow}
                    >
                      Agregar fila de encabezado
                    </button>
                    {normalizedColumnHeaders.rows.length >= 5 ? (
                      <div className={styles.metaMenuSectionTitle}>Maximo 5 filas</div>
                    ) : null}
                    <div className={styles.metaMenuSectionTitle}>Filas de encabezado</div>
                    <ul className={styles.metaMenuRows} aria-label="Lista de filas de encabezado">
                      {normalizedColumnHeaders.rows.map((row, index) => (
                        <li key={row.id} className={styles.metaMenuRowItem}>
                          <span className={styles.metaMenuRowLabel}>{getHeaderRowPreview(row, index)}</span>
                          <div className={styles.metaMenuRowActions}>
                            <button
                              type="button"
                              className={styles.metaMenuIconToggle}
                              onClick={() => handleColumnHeaderRowVisibilityChange(row.id, row.hidden === true)}
                              disabled={!canEditColumnHeaders}
                              aria-label={`${row.hidden === true ? 'Mostrar' : 'Ocultar'} encabezado ${index + 1}`}
                              title={row.hidden === true ? 'no visible' : 'visible'}
                            >
                              {row.hidden === true ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              className={styles.metaMenuIconAction}
                              onClick={() => handleColumnHeaderDuplicateRow(row.id)}
                              disabled={!canEditColumnHeaders || normalizedColumnHeaders.rows.length >= 5}
                              aria-label={`Duplicar encabezado ${index + 1}`}
                              title="Duplicar"
                            >
                              <DuplicateIcon />
                            </button>
                            <button
                              type="button"
                              className={styles.metaMenuIconAction}
                              onClick={() => void handleColumnHeaderDeleteRow(row.id)}
                              disabled={!canEditColumnHeaders || normalizedColumnHeaders.rows.length <= 1}
                              aria-label={`Eliminar encabezado ${index + 1}`}
                              title="Eliminar"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className={styles.metaMenu} ref={metaMenuRef}>
                <Button
                  type="button"
                  onClick={() => setIsMetaMenuOpen((prev) => !prev)}
                  className={styles.metaMenuTrigger}
                  aria-haspopup="menu"
                  aria-expanded={isMetaMenuOpen}
                  aria-label="Abrir menú de métricas por periodo"
                >
                  Métricas
                </Button>
                {isMetaMenuOpen ? (
                  <div className={styles.metaMenuPopover} role="menu" aria-label="Opciones de métricas por periodo">
                    <label className={styles.blockMenuToggle}>
                      <span>Métricas por periodo</span>
                      <span className={styles.blockMenuToggleControl}>
                        <input
                          type="checkbox"
                          checked={metaPanel.enabled !== false}
                          onChange={(event) => handleMetaPanelEnabledChange(event.target.checked)}
                          className={styles.blockMenuToggleInput}
                        />
                        <span className={styles.blockMenuToggleTrack} aria-hidden="true">
                          <span className={styles.blockMenuToggleThumb} />
                        </span>
                      </span>
                    </label>
                    {metaPanel.enabled !== false ? (
                      <>
                        <button
                          type="button"
                          className={styles.metaMenuAction}
                          onClick={handleMetaAddRow}
                        >
                          Agregar métrica
                        </button>
                        <div className={styles.metaMenuSectionTitle}>Métricas</div>
                        <ul className={styles.metaMenuRows} aria-label="Lista de métricas">
                          {normalizedMetaRows.map((row, index) => (
                            <li key={row.id} className={styles.metaMenuRowItem}>
                              <span className={styles.metaMenuRowLabel}>
                                {row.label?.trim() || `Métrica ${index + 1}`}
                              </span>
                              <div className={styles.metaMenuRowActions}>
                                <button
                                  type="button"
                                  className={styles.metaMenuIconToggle}
                                  onClick={() => handleMetaRowVisibilityChange(row.id, row.hidden === true)}
                                  aria-label={`${row.hidden === true ? 'Mostrar' : 'Ocultar'} métrica ${index + 1}`}
                                  title={row.hidden === true ? 'no visible' : 'visible'}
                                >
                                  {row.hidden === true ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                </button>
                                <button
                                  type="button"
                                  className={styles.metaMenuIconAction}
                                  onClick={() => handleMetaDuplicateRow(row.id)}
                                  title="Duplicar"
                                  aria-label="Duplicar métrica"
                                >
                                  <DuplicateIcon />
                                </button>
                                <button
                                  type="button"
                                  className={styles.metaMenuIconAction}
                                  onClick={() => void handleMetaDeleteRow(row.id)}
                                  disabled={normalizedMetaRows.length <= 1}
                                  title="Eliminar"
                                  aria-label="Eliminar métrica"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <label className={styles.blockMenuToggle}>
                <span className={styles.blockMenuToggleLabel}>Menú de bloques</span>
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
                style={{
                  height: gridHeight * zoomScale,
                  marginTop: topBandsHeight,
                }}
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
              <div className={styles.mallaTopBands}>
                {normalizedColumnHeaders.enabled !== false ? (
                  <div className={styles.columnHeadersBandWrapper} style={zoomedMetaCalcHeaderWrapperStyle}>
                    <ColumnHeadersBand
                      headers={normalizedColumnHeaders}
                      columnCount={cols}
                      colWidths={zoomedMetaCalcColWidths}
                      paletteTokens={theme.tokens}
                      onCellClick={handleColumnHeaderCellClick}
                      activeRowId={isHeaderEditorOpen ? activeHeaderRowId : null}
                    />
                  </div>
                ) : null}
                {metaPanel.enabled !== false ? (
                  <div className={styles.metaCalcHeaderWrapper} style={zoomedMetaCalcHeaderWrapperStyle}>
                    <MetaCalcHeader
                      columnCount={cols}
                      colWidths={zoomedMetaCalcColWidths}
                      rowsConfig={metaPanel.rows.filter((row) => row.hidden !== true)}
                      malla={mallaForMetaCalc}
                      deps={metaCalcDeps}
                      onCellClick={handleMetaCellClick}
                      isOverrideColumn={(rowConfig, colIndex) => !!rowConfig.columns?.[colIndex]}
                      activeRowId={isMetaEditorOpen ? activeMetaRowId : null}
                      className={styles.metaCalcHeader}
                    />
                  </div>
                ) : null}
              </div>
              <div className={styles.mallaAreaWrapper} style={zoomedGridWrapperStyle}>
                <div
                  className={mallaAreaClassName}
                  ref={gridRef}
                  style={zoomedGridAreaStyle}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <MallaGridOverlay
                    colOffsets={colOffsets}
                    rowOffsets={rowOffsets}
                    gridWidth={gridWidth}
                    gridHeight={gridHeight}
                    className={styles.mallaGridOverlay}
                    lineClassName={styles.mallaGridOverlayLines}
                  />
                  {pieces.map((p) => {
                    // --- cálculo de template/visual/aspect por pieza (con expansión de merges para referenciadas)
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
                      setPieceValues((prev) => ({
                        ...prev,
                        [p.id]: { ...(prev[p.id] ?? {}), [key]: value },
                      }));
                    };

                    const canUnfreeze = p.kind === 'snapshot' && !!p.origin;
                    const toggleLabel = p.kind === 'ref' ? '🧊 Congelar' : '🔗 Descongelar';

                    const pieceStatus = getPieceVisualStatus(p);
                    const floating = floatingPieces.includes(p.id);
                    const blockWrapperClassName = [
                      styles.blockWrapper,
                      pieceStatus.tone === 'reference'
                        ? styles.blockWrapperReference
                        : styles.blockWrapperSnapshot,
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
                        <div
                          className={`${styles.pieceBadge} ${
                            pieceStatus.tone === 'reference'
                              ? styles.pieceBadgeReference
                              : styles.pieceBadgeSnapshot
                          }`}
                          title={`${pieceStatus.label}. ${pieceStatus.detail}`}
                          aria-hidden="true"
                        >
                          {pieceStatus.tone === 'reference' ? (
                            <Link2 size={16} strokeWidth={2.2} />
                          ) : (
                            <Snowflake size={16} strokeWidth={2.2} />
                          )}
                        </div>

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
      <MetaCalcCellEditor
        isOpen={metaPanel.enabled !== false && isMetaEditorOpen && activeMetaColIndex != null && activeMetaCellConfig != null}
        colIndex={activeMetaColIndex ?? 0}
        rowId={activeMetaRow.id}
        rowLabel={activeMetaRow.label}
        rowPosition={activeMetaRowPosition}
        isOverrideActive={isEditingOverrideActive}
        initialCellConfig={activeMetaCellConfig ?? activeMetaRow.defaultCell}
        catalog={activeMetaEditorCatalog}
        availabilityCatalog={columnMetaEditorCatalog}
        onToggleOverride={handleMetaOverrideToggle}
        onSave={handleMetaEditorSave}
        onCancel={handleMetaEditorCancel}
      />
      <ColumnHeaderRowEditor
        isOpen={normalizedColumnHeaders.enabled !== false && isHeaderEditorOpen}
        row={activeHeaderRow}
        rowPosition={activeHeaderRowPosition}
        colIndex={activeHeaderColIndex}
        columnCount={cols}
        onCancel={closeHeaderRowEditor}
        onSave={handleColumnHeaderEditorSave}
        onApplySeries={handleColumnHeaderEditorApplySeries}
      />
    </div>
  );
};
