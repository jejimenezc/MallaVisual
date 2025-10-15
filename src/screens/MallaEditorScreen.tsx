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
import { type MallaExport, MALLA_SCHEMA_VERSION } from '../utils/malla-io.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import { useProject, useBlocksRepo } from '../core/persistence/hooks.ts';
import { blocksToRepository } from '../utils/repository-snapshot.ts';
import styles from './MallaEditorScreen.module.css';
import { GRID_GAP, GRID_PAD } from '../styles/constants.ts';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { ActionPillButton } from '../components/ActionPillButton/ActionPillButton';
import addRefIcon from '../assets/icons/icono-plus-50.png';

const STORAGE_KEY = 'malla-editor-state';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

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
  // --- maestro + recorte activo
  const bounds = useMemo(() => getActiveBounds(template), [template]);
  const subTemplate = useMemo(() => cropTemplate(template, bounds), [template, bounds]);
  const baseMetrics = useMemo(() => computeMetrics(subTemplate, aspect), [subTemplate, aspect]);

  // --- malla y piezas
  const [cols, setCols] = useState(initialMalla?.grid?.cols ?? 5);
  const [rows, setRows] = useState(initialMalla?.grid?.rows ?? 5);
  const [pieces, setPieces] = useState<CurricularPiece[]>(initialMalla?.pieces ?? []);
  const [pieceValues, setPieceValues] = useState<
    Record<string, Record<string, string | number | boolean>>
  >(initialMalla?.values ?? {});
  const [floatingPieces, setFloatingPieces] = useState<string[]>(
    initialMalla?.floatingPieces ?? []);
  const [showPieceMenus, setShowPieceMenus] = useState(true);
  const [isRepositoryCollapsed, setIsRepositoryCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { autoSave, flushAutoSave, loadDraft } = useProject({
    storageKey: STORAGE_KEY,
    projectId,
    projectName,
  });
  const { listBlocks } = useBlocksRepo();
  
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
  const [mastersById, setMastersById] = useState<Record<string, MasterBlockData>>(initialMasters);
  const [selectedMasterId, setSelectedMasterId] = useState(initialMasterId);

  useEffect(() => {
    if (!repoId) return;
    setSelectedMasterId((prevId) => (prevId === repoId ? prevId : repoId));
  }, [repoId]);

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

  const handleUndo = useCallback(() => {
    console.warn('Acción de deshacer no implementada todavía');
  }, []);

  const handleRedo = useCallback(() => {
    console.warn('Acción de rehacer no implementada todavía');
  }, []);

  // Refresca los maestros almacenados cuando el repositorio cambia
  useEffect(() => {
    if (availableMasters.length === 0) return;
    setMastersById((prev) => {
      let updated = false;
      let next = prev;
      for (const { metadata, data } of availableMasters) {
        const key = metadata.uuid;
        const incoming: MasterBlockData = {
          template: data.template,
          visual: data.visual,
          aspect: data.aspect,
        };
        if (!blockContentEquals(prev[key], incoming)) {
          if (!updated) {
            next = { ...prev };
            updated = true;
          }
          next[key] = incoming;
        }
      }
      return updated ? next : prev;
    });
  }, [availableMasters]);

  // Sincroniza el maestro activo con el mapa local
  useEffect(() => {
    if (!selectedMasterId) return;
    const data: MasterBlockData = { template, visual, aspect };
    setMastersById((prev) => ({
      ...prev,
      [selectedMasterId]: data,
    }));
  }, [selectedMasterId, template, visual, aspect]);

  // --- drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPieceOuter = useRef({ w: 0, h: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<string | null>(null);
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

  const zoomScale = useMemo(() => Math.sqrt(zoom), [zoom]);
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);
  const canZoomOut = zoom > MIN_ZOOM + 0.001;
  const canZoomIn = zoom < MAX_ZOOM - 0.001;
  const sliderMin = Math.round(MIN_ZOOM * 100);
  const sliderMax = Math.round(MAX_ZOOM * 100);
  const sliderStep = Math.round(ZOOM_STEP * 100);

  const viewportZoomStyle = useMemo(
    () =>
      ({
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
      }) as React.CSSProperties,
    [zoomScale],
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


  const handleSelectMaster = (id: string) => {
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
  };

  const normalizedInitial = useMemo(() => {
    if (!initialMalla) {
      return null;
    }

    const nextGrid = {
      cols: initialMalla.grid?.cols ?? 5,
      rows: initialMalla.grid?.rows ?? 5,
    };
    let nextMasters = { ...initialMalla.masters };
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

    const project: MallaExport = {
      version: MALLA_SCHEMA_VERSION,
      masters: nextMasters,
      grid: nextGrid,
      pieces: nextPieces,
      values: nextValues,
      floatingPieces: nextFloating,
      activeMasterId: nextActiveId,
      repository: initialMalla.repository ?? {},
    };

    return {
      project,
      masters: nextMasters,
      grid: nextGrid,
      pieces: nextPieces,
      values: nextValues,
      floatingPieces: nextFloating,
      activeMasterId: nextActiveId,
    };
  }, [initialMalla, repoId, template, visual, aspect]);

  useEffect(() => {
    if (!normalizedInitial) {
      savedRef.current = null;
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
    } = normalizedInitial;

    const serialized = JSON.stringify(project);
    if (savedRef.current === serialized) return;

    savedRef.current = serialized;
    setMastersById(masters);
    setCols(grid.cols);
    setRows(grid.rows);
    setPieces(nextPieces);
    setPieceValues(values);
    setFloatingPieces(nextFloating);
    setSelectedMasterId(activeMasterId);
  }, [normalizedInitial]);

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
    };
    const serialized = JSON.stringify(project);
    if (savedRef.current === serialized) return;
    savedRef.current = serialized;
    onMallaChange?.(project);
    autoSave(project);
  }, [
    mastersById,
    cols,
    rows,
    pieces,
    pieceValues,
    floatingPieces,
    selectedMasterId,
    repositoryEntries,
    autoSave,
    onMallaChange,
  ]);
  
  useEffect(() => () => flushAutoSave(), [flushAutoSave]);
  
  useEffect(() => {
    if (!initialMalla) {
      const data = loadDraft();
      if (!data) return;
      const firstId = Object.keys(data.masters)[0];
      const activeId = data.activeMasterId ?? firstId;
      const active = data.masters[activeId];
      onUpdateMaster?.({
        template: active.template,
        visual: active.visual,
        aspect: active.aspect,
      });
      setSelectedMasterId(activeId);
      setMastersById(data.masters);
      setCols(data.grid?.cols ?? 5);
      setRows(data.grid?.rows ?? 5);
      setPieces(data.pieces);
      setPieceValues(data.values);
      setFloatingPieces(data.floatingPieces ?? []);
    }
  }, [initialMalla, loadDraft, onUpdateMaster]);

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
  const handleRowsChange = (newRows: number) => {
    if (newRows < rows) {
      const blocker = pieces.find((p) => p.y >= newRows);
      if (blocker) {
        window.alert(
          `Para reducir filas mueva o borre las piezas que ocupan la fila ${blocker.y + 1}`
        );
        return;
      }
    }
    setRows(newRows);
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
    setCols(newCols);
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
          const vis = cropVisualTemplate(master.visual, safeBounds);
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
      return [...prev, ...additions];
    });
  };

  const handleClearGrid = () => {
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
      window.alert(
        'No hay posiciones disponibles en la malla. Agregue filas/columnas o borre una pieza curricular.'
      );
      setFloatingPieces((prev) => [...prev, draggingId]);
    }
    setDraggingId(null);
  };

  return (
    <div
      className={`${styles.mallaScreen} ${
        isRepositoryCollapsed ? styles.repositoryCollapsed : ''
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
          <BlockSnapshot template={template} visualTemplate={visual} aspect={aspect} />
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
              <label className={`${styles.gridSizeControl} ${styles.zoomControl}`}>
                <span>Zoom</span>
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
              </label>
            </div>
          }
          center={
            <>
              <Button
                type="button"
                onClick={handleFillGrid}
                title="Completar todas las posiciones vacías"
              >
                Generar malla completa
              </Button>
              <Button
                type="button"
                onClick={handleClearGrid}
                title="Eliminar todas las piezas de la malla"
              >
                Borrar malla completa
              </Button>
          </>
          }
          right={
            <>              
              <div className={styles.historyButtons}>
                <Button type="button" onClick={handleUndo}>
                  ↩️ Deshacer
                </Button>
                <Button type="button" onClick={handleRedo}>
                  ↪️ Rehacer
                </Button>
              </div>
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

        <div className={styles.mallaViewport} style={viewportZoomStyle}>
          <div
            className={styles.mallaArea}
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
              pieceVisual   = cropVisualTemplate(master.visual, safeBounds);

              // Las piezas referenciadas siguen el aspecto del maestro asociado
              pieceAspect = master.aspect;
            } else {
              // Snapshot: usa su copia materializada tal cual
              pieceTemplate = p.template;
              pieceVisual   = p.visual;
              pieceAspect   = p.aspect;
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

            const floating = floatingPieces.includes(p.id);
            return (
                <div
                  key={p.id}
                  className={`${styles.blockWrapper} ${floating ? styles.floating : ''}`}
                  style={{ left, top, width: m.outerW, height: m.outerH, position: 'absolute' }}
                  onMouseDown={(e) => handleMouseDownPiece(e, p, m.outerW, m.outerH)}
                >
                  {/* Toolbar por pieza */}
                  <div
                    className={`${styles.pieceToolbar} ${
                      showPieceMenus ? '' : styles.toolbarHidden
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
                      background: p.kind === 'ref' || canUnfreeze ? 'var(--color-surface)' : 'var(--color-bg)',
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
                  onClick={() => {}}
                  onContextMenu={() => {}}
                  onMouseDown={() => {}}
                  onMouseEnter={() => {}}
                  onMouseUp={() => {}}
                  onMouseLeave={() => {}}
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
  );
};
