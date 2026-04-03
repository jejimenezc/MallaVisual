import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultMetaPanel,
  getCellConfigForColumn,
  normalizeMetaPanelConfig,
  type ColumnHeadersConfig,
  type MetaCellConfig,
  type MetaPanelConfig,
  type MetaPanelRowConfig,
} from '../utils/malla-io.ts';
import {
  applySequentialOverrides,
  cloneHeaderRow,
  createHeaderOverride,
  createHeaderRow,
  ensureHeaderInvariants,
  isHeaderRowVisible,
  normalizeColumnHeadersConfig,
  rowHasAnyOverrides,
} from '../utils/column-headers.ts';
import type { ColumnHeaderRowConfig } from '../types/column-headers.ts';
import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import type { MetaCalcDeps } from '../utils/meta-calc.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import type { MetaPanelCatalog } from '../utils/meta-panel-catalog.ts';
import {
  buildMetaPanelCatalogForColumn,
  buildMetaPanelCatalogForMalla,
} from '../utils/meta-panel-catalog.ts';
import { confirmAsync } from '../ui/alerts';
import { cropTemplate, expandBoundsToMerges } from '../utils/block-active.ts';
import { logAppError } from '../core/runtime/logger.ts';

const COLUMN_HEADER_ROW_HEIGHT = 28;
const META_CALC_HEADER_ROW_HEIGHT = 30;

interface UseMallaEditorBandsParams<TMetadata extends { uuid: string }> {
  cols: number;
  rows: number;
  pieces: CurricularPiece[];
  pieceValues: Record<string, Record<string, string | number | boolean>>;
  colWidths: number[];
  gridWidth: number;
  gridHeight: number;
  zoomScale: number;
  metaPanel: MetaPanelConfig;
  setMetaPanel: React.Dispatch<React.SetStateAction<MetaPanelConfig>>;
  columnHeaders: ColumnHeadersConfig;
  setColumnHeaders: React.Dispatch<React.SetStateAction<ColumnHeadersConfig>>;
  mastersById: Record<string, { template: BlockTemplate }>;
  template: BlockTemplate;
  availableMasters: Array<{ metadata: TMetadata }>;
  formatMasterDisplayName: (metadata: TMetadata, fallbackId: string) => string;
  runHistoryTransaction: <T>(task: () => T | Promise<T>) => T | Promise<T>;
  showToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function useMallaEditorBands<TMetadata extends { uuid: string }>({
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
}: UseMallaEditorBandsParams<TMetadata>) {
  const [isMetaEditorOpen, setIsMetaEditorOpen] = useState(false);
  const [activeMetaRowId, setActiveMetaRowId] = useState<string | null>(null);
  const [activeMetaColIndex, setActiveMetaColIndex] = useState<number | null>(null);
  const [isMetaMenuOpen, setIsMetaMenuOpen] = useState(false);
  const [isHeadersMenuOpen, setIsHeadersMenuOpen] = useState(false);
  const [isHeaderEditorOpen, setIsHeaderEditorOpen] = useState(false);
  const [activeHeaderRowId, setActiveHeaderRowId] = useState<string | null>(null);
  const [activeHeaderColIndex, setActiveHeaderColIndex] = useState(0);
  const metaMenuRef = useRef<HTMLDivElement>(null);
  const headersMenuRef = useRef<HTMLDivElement>(null);

  const normalizedMetaPanel = useMemo(() => normalizeMetaPanelConfig(metaPanel), [metaPanel]);
  const normalizedColumnHeaders = useMemo(
    () => ensureHeaderInvariants(columnHeaders),
    [columnHeaders],
  );
  const normalizedMetaRows = normalizedMetaPanel.rows;
  const columnHeaderRowCount = useMemo(() => {
    if (normalizedColumnHeaders.enabled === false) {
      return 0;
    }
    return normalizedColumnHeaders.rows.filter((row) => isHeaderRowVisible(row)).length;
  }, [normalizedColumnHeaders]);
  const columnHeadersBandHeight = useMemo(
    () => columnHeaderRowCount * COLUMN_HEADER_ROW_HEIGHT,
    [columnHeaderRowCount],
  );
  const metaCalcRowCount = useMemo(() => {
    if (normalizedMetaPanel.enabled === false) {
      return 0;
    }
    return normalizedMetaRows.length;
  }, [normalizedMetaPanel.enabled, normalizedMetaRows]);
  const metaCalcHeaderHeight = useMemo(
    () => metaCalcRowCount * META_CALC_HEADER_ROW_HEIGHT,
    [metaCalcRowCount],
  );
  const topBandsHeight = columnHeadersBandHeight + metaCalcHeaderHeight;

  const zoomedGridContainerStyle = useMemo(
    () =>
      ({
        height: gridHeight * zoomScale + topBandsHeight,
      }) as React.CSSProperties,
    [gridHeight, topBandsHeight, zoomScale],
  );

  const zoomedMetaCalcHeaderWrapperStyle = useMemo(
    () =>
      ({
        width: gridWidth * zoomScale,
      }) as React.CSSProperties,
    [gridWidth, zoomScale],
  );

  const zoomedMetaCalcColWidths = useMemo(
    () => colWidths.map((width) => width * zoomScale),
    [colWidths, zoomScale],
  );

  useEffect(() => {
    if (!isMetaMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (metaMenuRef.current?.contains(target)) {
        return;
      }
      setIsMetaMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMetaMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMetaMenuOpen]);

  useEffect(() => {
    if (!isHeadersMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (headersMenuRef.current?.contains(target)) {
        return;
      }
      setIsHeadersMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHeadersMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isHeadersMenuOpen]);

  useEffect(() => {
    if (normalizedMetaPanel.enabled === false) {
      return;
    }
    const fallbackRow = normalizedMetaRows[0];
    if (!fallbackRow) {
      return;
    }
    const hasActiveRow =
      activeMetaRowId != null && normalizedMetaRows.some((row) => row.id === activeMetaRowId);
    if (hasActiveRow) {
      return;
    }
    setActiveMetaRowId(fallbackRow.id);
  }, [activeMetaRowId, normalizedMetaPanel.enabled, normalizedMetaRows]);

  const activeMetaRow = useMemo<MetaPanelRowConfig>(() => {
    const fallbackRow = normalizedMetaRows[0]!;
    if (activeMetaRowId == null) {
      return fallbackRow;
    }
    return normalizedMetaRows.find((row) => row.id === activeMetaRowId) ?? fallbackRow;
  }, [activeMetaRowId, normalizedMetaRows]);

  const activeMetaRowPosition = useMemo(() => {
    const index = normalizedMetaRows.findIndex((row) => row.id === activeMetaRow.id);
    return index >= 0 ? index + 1 : 1;
  }, [activeMetaRow.id, normalizedMetaRows]);

  const mallaForMetaCalc = useMemo<MallaQuerySource>(
    () => ({
      grid: { cols, rows },
      pieces,
    }),
    [cols, rows, pieces],
  );

  const resolveTemplateForPiece = useCallback(
    (piece: CurricularPiece): BlockTemplate | null => {
      if (piece.kind === 'ref') {
        const master = mastersById[piece.ref.sourceId] ?? { template };
        const safeBounds = expandBoundsToMerges(master.template, piece.ref.bounds);
        return cropTemplate(master.template, safeBounds);
      }
      return piece.template;
    },
    [mastersById, template],
  );

  const metaCalcDeps = useMemo<MetaCalcDeps>(
    () => ({
      valuesByPiece: pieceValues,
      resolveTemplateForPiece,
    }),
    [pieceValues, resolveTemplateForPiece],
  );

  const templateLabelById = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        availableMasters.map((entry) => [
          entry.metadata.uuid,
          formatMasterDisplayName(entry.metadata, entry.metadata.uuid),
        ]),
      ),
    [availableMasters, formatMasterDisplayName],
  );

  const activeMetaCellConfig = useMemo(() => {
    if (activeMetaColIndex == null) return activeMetaRow.defaultCell;
    return getCellConfigForColumn(activeMetaRow, activeMetaColIndex);
  }, [activeMetaColIndex, activeMetaRow]);

  const isEditingOverrideActive = useMemo(
    () => (activeMetaColIndex != null ? !!activeMetaRow.columns?.[activeMetaColIndex] : false),
    [activeMetaColIndex, activeMetaRow],
  );

  const globalMetaEditorCatalog = useMemo<MetaPanelCatalog>(
    () =>
      buildMetaPanelCatalogForMalla({
        malla: mallaForMetaCalc,
        resolveTemplateForPiece,
        resolveTemplateLabel: (templateId) => templateLabelById[templateId] ?? templateId,
      }),
    [mallaForMetaCalc, resolveTemplateForPiece, templateLabelById],
  );

  const columnMetaEditorCatalog = useMemo<MetaPanelCatalog>(() => {
    if (activeMetaColIndex == null) {
      return { templates: [], controlsByTemplateId: {} };
    }
    return buildMetaPanelCatalogForColumn({
      malla: mallaForMetaCalc,
      colIndex: activeMetaColIndex,
      resolveTemplateForPiece,
      resolveTemplateLabel: (templateId) => templateLabelById[templateId] ?? templateId,
    });
  }, [activeMetaColIndex, mallaForMetaCalc, resolveTemplateForPiece, templateLabelById]);

  const activeMetaEditorCatalog = isEditingOverrideActive
    ? columnMetaEditorCatalog
    : globalMetaEditorCatalog;

  const handleMetaCellClick = useCallback(
    (rowId: string, colIndex: number) => {
      if (metaPanel.enabled === false) {
        return;
      }
      setActiveMetaRowId(rowId);
      setActiveMetaColIndex(colIndex);
      setIsMetaEditorOpen(true);
    },
    [metaPanel.enabled],
  );

  useEffect(() => {
    if (metaPanel.enabled === false && isMetaEditorOpen) {
      setIsMetaEditorOpen(false);
      setActiveMetaRowId(null);
      setActiveMetaColIndex(null);
    }
  }, [isMetaEditorOpen, metaPanel.enabled]);

  useEffect(() => {
    if (normalizedColumnHeaders.enabled === false && isHeaderEditorOpen) {
      setIsHeaderEditorOpen(false);
      setActiveHeaderRowId(null);
    }
  }, [isHeaderEditorOpen, normalizedColumnHeaders.enabled]);

  const handleMetaPanelEnabledChange = useCallback(
    (nextEnabled: boolean) => {
      runHistoryTransaction(() => {
        setMetaPanel((prev) => {
          const normalized = normalizeMetaPanelConfig(prev);
          if (normalized.enabled === nextEnabled) {
            return normalized;
          }
          const nextRows =
            nextEnabled && normalized.rows.length === 0
              ? createDefaultMetaPanel(true).rows
              : normalized.rows;
          return {
            ...normalized,
            enabled: nextEnabled,
            rows: nextRows,
          };
        });
      });
      if (!nextEnabled) {
        setIsMetaEditorOpen(false);
        setActiveMetaRowId(null);
        setActiveMetaColIndex(null);
      }
    },
    [runHistoryTransaction, setMetaPanel],
  );

  const handleMetaEditorCancel = useCallback(() => {
    setIsMetaEditorOpen(false);
    setActiveMetaRowId(null);
    setActiveMetaColIndex(null);
  }, []);

  const closeHeaderRowEditor = useCallback(() => {
    setIsHeaderEditorOpen(false);
    setActiveHeaderRowId(null);
  }, []);

  useEffect(() => {
    if (!isHeaderEditorOpen) {
      return;
    }
    const activeRow = normalizedColumnHeaders.rows.find((row) => row.id === activeHeaderRowId);
    if (!activeRow || activeRow.hidden === true) {
      closeHeaderRowEditor();
    }
  }, [activeHeaderRowId, closeHeaderRowEditor, isHeaderEditorOpen, normalizedColumnHeaders.rows]);

  const handleColumnHeadersEnabledChange = useCallback(
    (nextEnabled: boolean) => {
      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === nextEnabled) {
            return normalized;
          }
          if (nextEnabled) {
            return ensureHeaderInvariants({
              ...normalized,
              enabled: true,
            });
          }
          return {
            ...normalized,
            enabled: false,
          };
        });
      });
      if (!nextEnabled) {
        closeHeaderRowEditor();
      }
    },
    [closeHeaderRowEditor, runHistoryTransaction, setColumnHeaders],
  );

  const handleColumnHeaderAddRow = useCallback(() => {
    runHistoryTransaction(() => {
      setColumnHeaders((prev) => {
        const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
        if (normalized.enabled === false || normalized.rows.length >= 5) {
          return normalized;
        }
        return {
          ...normalized,
          rows: [...normalized.rows, createHeaderRow()],
        };
      });
    });
  }, [runHistoryTransaction, setColumnHeaders]);

  const handleColumnHeaderCellClick = useCallback(
    (rowId: string, colIndex: number) => {
      if (normalizedColumnHeaders.enabled === false) {
        return;
      }
      setActiveHeaderRowId(rowId);
      setActiveHeaderColIndex(Math.max(colIndex, 0));
      setIsHeaderEditorOpen(true);
    },
    [normalizedColumnHeaders.enabled],
  );

  const handleColumnHeaderDuplicateRow = useCallback(
    (rowId: string) => {
      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === false || normalized.rows.length >= 5) {
            return normalized;
          }
          const targetIndex = normalized.rows.findIndex((row) => row.id === rowId);
          if (targetIndex < 0) {
            return normalized;
          }
          const nextRows = normalized.rows.slice();
          nextRows.splice(targetIndex + 1, 0, cloneHeaderRow(nextRows[targetIndex]!));
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });
    },
    [runHistoryTransaction, setColumnHeaders],
  );

  const handleColumnHeaderDeleteRow = useCallback(
    async (rowId: string) => {
      if (normalizedColumnHeaders.enabled === false || normalizedColumnHeaders.rows.length <= 1) {
        return;
      }
      const confirmed = await confirmAsync({
        title: 'Eliminar fila de encabezado',
        message: 'Se eliminara esta fila de encabezado. ¿Continuar?',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        variant: 'destructive',
      });
      if (!confirmed) {
        return;
      }

      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === false || normalized.rows.length <= 1) {
            return normalized;
          }
          const nextRows = normalized.rows.filter((row) => row.id !== rowId);
          if (nextRows.length === normalized.rows.length) {
            return normalized;
          }
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });

      if (activeHeaderRowId === rowId) {
        closeHeaderRowEditor();
      }
      showToast('Fila de encabezado eliminada', 'success');
    },
    [
      activeHeaderRowId,
      closeHeaderRowEditor,
      normalizedColumnHeaders.enabled,
      normalizedColumnHeaders.rows.length,
      runHistoryTransaction,
      setColumnHeaders,
      showToast,
    ],
  );

  const handleColumnHeaderRowVisibilityChange = useCallback(
    (rowId: string, isVisible: boolean) => {
      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === false) {
            return normalized;
          }
          const targetIndex = normalized.rows.findIndex((row) => row.id === rowId);
          if (targetIndex < 0) {
            return normalized;
          }
          const targetRow = normalized.rows[targetIndex]!;
          const nextRows = normalized.rows.slice();
          nextRows[targetIndex] = {
            ...targetRow,
            hidden: isVisible ? undefined : true,
          };
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });
      if (!isVisible && activeHeaderRowId === rowId) {
        closeHeaderRowEditor();
      }
    },
    [activeHeaderRowId, closeHeaderRowEditor, runHistoryTransaction, setColumnHeaders],
  );

  const handleColumnHeaderEditorSave = useCallback(
    (
      rowId: string,
      text: string,
      bold: boolean,
      usePaletteBg: boolean,
      useOverride: boolean,
      colIndex: number,
    ) => {
      const safeText = typeof text === 'string' ? text : '';
      const safeBold = bold === true;
      const safeUsePaletteBg = usePaletteBg === true;
      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === false) {
            return normalized;
          }
          const targetIndex = normalized.rows.findIndex((row) => row.id === rowId);
          if (targetIndex < 0) {
            return normalized;
          }
          const targetRow = normalized.rows[targetIndex]!;
          const nextRows = normalized.rows.slice();
          if (useOverride) {
            const nextColumns = { ...(targetRow.columns ?? {}) };
            nextColumns[colIndex] = {
              id: nextColumns[colIndex]?.id ?? createHeaderOverride().id,
              text: safeText,
              bold: safeBold,
            };
            nextRows[targetIndex] = {
              ...targetRow,
              usePaletteBg: safeUsePaletteBg,
              columns: nextColumns,
            };
          } else {
            const nextColumns = { ...(targetRow.columns ?? {}) };
            if (Number.isInteger(colIndex) && colIndex >= 0) {
              delete nextColumns[colIndex];
            }
            nextRows[targetIndex] = {
              ...targetRow,
              defaultText: safeText,
              defaultBold: safeBold,
              usePaletteBg: safeUsePaletteBg,
              columns: nextColumns,
            };
          }
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });
      closeHeaderRowEditor();
      showToast('Encabezado guardado', 'success');
    },
    [closeHeaderRowEditor, runHistoryTransaction, setColumnHeaders, showToast],
  );

  const handleColumnHeaderEditorApplySeries = useCallback(
    async (rowId: string, makeText: (colIndex: number) => string): Promise<boolean> => {
      if (normalizedColumnHeaders.enabled === false) {
        return false;
      }

      const currentRow = normalizedColumnHeaders.rows.find((row) => row.id === rowId);
      if (!currentRow) {
        return false;
      }

      if (rowHasAnyOverrides(currentRow)) {
        const confirmed = await confirmAsync({
          title: 'Reemplazar encabezados personalizados',
          message:
            'Esto reemplazara los encabezados personalizados existentes en esta fila. ¿Continuar?',
          confirmLabel: 'Reemplazar',
          cancelLabel: 'Cancelar',
        });
        if (!confirmed) {
          return false;
        }
      }

      runHistoryTransaction(() => {
        setColumnHeaders((prev) => {
          const normalized = ensureHeaderInvariants(normalizeColumnHeadersConfig(prev));
          if (normalized.enabled === false) {
            return normalized;
          }
          const targetIndex = normalized.rows.findIndex((row) => row.id === rowId);
          if (targetIndex < 0) {
            return normalized;
          }
          const targetRow = normalized.rows[targetIndex]!;
          const nextRows = normalized.rows.slice();
          nextRows[targetIndex] = applySequentialOverrides(targetRow, cols, makeText);
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });

      closeHeaderRowEditor();
      showToast('Encabezado guardado', 'success');
      return true;
    },
    [
      closeHeaderRowEditor,
      cols,
      normalizedColumnHeaders.enabled,
      normalizedColumnHeaders.rows,
      runHistoryTransaction,
      setColumnHeaders,
      showToast,
    ],
  );

  const cloneMetaCellConfig = useCallback((config: MetaCellConfig): MetaCellConfig => ({
    ...config,
    terms: (config.terms ?? []).map((term) => ({
      ...term,
      ...(term.condition ? { condition: { ...term.condition } } : {}),
    })),
  }), []);

  const createMetaConfigId = useCallback(
    (prefix: string) =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    [],
  );

  const cloneMetaCellConfigWithNewIds = useCallback(
    (config: MetaCellConfig): MetaCellConfig => {
      const clonedConfig = cloneMetaCellConfig(config);
      return {
        ...clonedConfig,
        id: createMetaConfigId('meta-cell'),
        terms: (clonedConfig.terms ?? []).map((term) => ({
          ...term,
          id: createMetaConfigId('meta-term'),
        })),
      };
    },
    [cloneMetaCellConfig, createMetaConfigId],
  );

  const createEmptyMetaRow = useCallback(
    (): MetaPanelRowConfig => ({
      id: createMetaConfigId('meta-row'),
      defaultCell: {
        id: createMetaConfigId('meta-cell'),
        mode: 'count',
        terms: [],
      },
      columns: {},
    }),
    [createMetaConfigId],
  );

  const cloneMetaRowWithNewIds = useCallback(
    (row: MetaPanelRowConfig): MetaPanelRowConfig => {
      const nextColumns: Record<number, MetaCellConfig> = {};
      for (const [rawColIndex, cell] of Object.entries(row.columns ?? {})) {
        const colIndex = Number(rawColIndex);
        if (!Number.isInteger(colIndex) || colIndex < 0) {
          continue;
        }
        nextColumns[colIndex] = cloneMetaCellConfigWithNewIds(cell);
      }

      return {
        ...row,
        id: createMetaConfigId('meta-row'),
        defaultCell: cloneMetaCellConfigWithNewIds(row.defaultCell),
        columns: nextColumns,
      };
    },
    [cloneMetaCellConfigWithNewIds, createMetaConfigId],
  );

  const handleMetaAddRow = useCallback(() => {
    runHistoryTransaction(() => {
      setMetaPanel((prev) => {
        const normalized = normalizeMetaPanelConfig(prev);
        if (normalized.enabled === false) {
          return normalized;
        }
        return {
          ...normalized,
          rows: [...normalized.rows, createEmptyMetaRow()],
        };
      });
    });
  }, [createEmptyMetaRow, runHistoryTransaction, setMetaPanel]);

  const handleMetaDuplicateRow = useCallback(
    (rowId: string) => {
      runHistoryTransaction(() => {
        setMetaPanel((prev) => {
          const normalized = normalizeMetaPanelConfig(prev);
          const targetIndex = normalized.rows.findIndex((row) => row.id === rowId);
          if (targetIndex < 0) {
            return normalized;
          }
          const nextRows = normalized.rows.slice();
          nextRows.splice(targetIndex + 1, 0, cloneMetaRowWithNewIds(nextRows[targetIndex]!));
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });
    },
    [cloneMetaRowWithNewIds, runHistoryTransaction, setMetaPanel],
  );

  const handleMetaDeleteRow = useCallback(
    async (rowId: string) => {
      if (normalizedMetaRows.length <= 1) {
        return;
      }
      const rowLabel = normalizedMetaRows.find((row) => row.id === rowId)?.label?.trim();
      const deleteTitle = rowLabel ? `Eliminar métrica: ${rowLabel}` : 'Eliminar métrica';

      const confirmed = await confirmAsync({
        title: deleteTitle,
        message: 'Se eliminara esta métrica y su configuracion. Continuar?',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        variant: 'destructive',
      });
      if (!confirmed) {
        return;
      }

      runHistoryTransaction(() => {
        setMetaPanel((prev) => {
          const normalized = normalizeMetaPanelConfig(prev);
          if (normalized.rows.length <= 1) {
            return normalized;
          }
          const nextRows = normalized.rows.filter((row) => row.id !== rowId);
          if (nextRows.length === normalized.rows.length) {
            return normalized;
          }
          return {
            ...normalized,
            rows: nextRows,
          };
        });
      });

      if (activeMetaRowId === rowId) {
        setIsMetaEditorOpen(false);
        setActiveMetaRowId(null);
        setActiveMetaColIndex(null);
      }
      showToast(deleteTitle, 'success');
    },
    [activeMetaRowId, normalizedMetaRows, runHistoryTransaction, setMetaPanel, showToast],
  );

  const handleMetaOverrideToggle = useCallback(
    async (rowId: string, active: boolean) => {
      if (activeMetaColIndex == null) {
        return;
      }
      const fallbackRow = normalizedMetaRows[0];
      if (!fallbackRow) {
        return;
      }
      const resolvedRow = normalizedMetaRows.find((row) => row.id === rowId) ?? fallbackRow;
      const targetRowId = resolvedRow.id;
      if (targetRowId !== rowId) {
        setActiveMetaRowId(targetRowId);
      }
      const hasOverride = !!resolvedRow.columns?.[activeMetaColIndex];
      if (!active && hasOverride) {
        const confirmed = await confirmAsync({
          title: 'Volver a la métrica general',
          message:
            'Volver a la métrica general?\nSe perdera la configuracion personalizada de este periodo.',
          confirmLabel: 'Si, volver',
          cancelLabel: 'Cancelar',
          variant: 'destructive',
        });
        if (!confirmed) {
          return;
        }
      }
      runHistoryTransaction(() => {
        setMetaPanel((prev) => {
          const normalized = normalizeMetaPanelConfig(prev);
          const nextRows = normalized.rows.slice();
          const targetRowIndex = nextRows.findIndex((row) => row.id === targetRowId);
          if (targetRowIndex < 0) {
            return normalized;
          }
          const currentRow = nextRows[targetRowIndex]!;
          const nextColumns = { ...(currentRow.columns ?? {}) };
          if (active) {
            nextColumns[activeMetaColIndex] = cloneMetaCellConfig(currentRow.defaultCell);
          } else {
            delete nextColumns[activeMetaColIndex];
          }
          nextRows[targetRowIndex] = {
            ...currentRow,
            columns: nextColumns,
          };
          return { ...normalized, rows: nextRows };
        });
      });
    },
    [activeMetaColIndex, cloneMetaCellConfig, normalizedMetaRows, runHistoryTransaction, setMetaPanel],
  );

  const handleMetaEditorSave = useCallback(
    (
      rowId: string,
      nextCellConfig: MetaCellConfig,
      nextRowLabel: string,
      nextOverrideLabel: string,
    ) => {
      try {
        const fallbackRow = normalizedMetaRows[0];
        if (!fallbackRow) {
          return;
        }
        const resolvedRow = normalizedMetaRows.find((row) => row.id === rowId) ?? fallbackRow;
        const targetRowId = resolvedRow.id;
        if (targetRowId !== rowId) {
          setActiveMetaRowId(targetRowId);
        }
        runHistoryTransaction(() => {
          setMetaPanel((prev) => {
            const normalized = normalizeMetaPanelConfig(prev);
            const nextRows = normalized.rows.slice();
            const targetRowIndex = nextRows.findIndex((row) => row.id === targetRowId);
            if (targetRowIndex < 0) {
              return normalized;
            }
            const currentRow = nextRows[targetRowIndex]!;
            if (activeMetaColIndex != null && currentRow.columns?.[activeMetaColIndex]) {
              const nextColumns = { ...(currentRow.columns ?? {}) };
              nextColumns[activeMetaColIndex] = {
                ...cloneMetaCellConfig(nextCellConfig),
                label: nextOverrideLabel || undefined,
              };
              nextRows[targetRowIndex] = {
                ...currentRow,
                columns: nextColumns,
              };
            } else {
              nextRows[targetRowIndex] = {
                ...currentRow,
                label: nextRowLabel || undefined,
                defaultCell: cloneMetaCellConfig(nextCellConfig),
              };
            }
            return { ...normalized, rows: nextRows };
          });
        });
        setIsMetaEditorOpen(false);
        setActiveMetaRowId(null);
        setActiveMetaColIndex(null);
        showToast('Métrica guardada', 'success');
      } catch (error) {
        logAppError({
          scope: 'editor',
          severity: 'non-fatal',
          message: 'Fallo el guardado de configuracion de una metrica.',
          error,
          context: {
            rowId,
            activeMetaColIndex,
          },
        });
        showToast('No se pudo guardar la métrica', 'error');
      }
    },
    [activeMetaColIndex, cloneMetaCellConfig, normalizedMetaRows, runHistoryTransaction, setMetaPanel, showToast],
  );

  const activeHeaderRow = useMemo<ColumnHeaderRowConfig | null>(
    () => normalizedColumnHeaders.rows.find((row) => row.id === activeHeaderRowId) ?? null,
    [activeHeaderRowId, normalizedColumnHeaders.rows],
  );

  const activeHeaderRowPosition = useMemo(() => {
    if (!activeHeaderRow) {
      return 1;
    }
    const index = normalizedColumnHeaders.rows.findIndex((row) => row.id === activeHeaderRow.id);
    return index >= 0 ? index + 1 : 1;
  }, [activeHeaderRow, normalizedColumnHeaders.rows]);

  const canAddColumnHeaderRow =
    normalizedColumnHeaders.enabled !== false && normalizedColumnHeaders.rows.length < 5;
  const canEditColumnHeaders = normalizedColumnHeaders.enabled !== false;

  const getHeaderRowPreview = useCallback((row: ColumnHeaderRowConfig, index: number) => {
    const baseText = (row.defaultText ?? '').trim();
    const fallback = `Encabezado ${index + 1}`;
    if (!baseText) {
      return fallback;
    }
    if (baseText.length <= 30) {
      return baseText;
    }
    return `${baseText.slice(0, 30)}…`;
  }, []);

  return {
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
    normalizedMetaPanel,
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
  };
}
