import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultMetaPanel,
  normalizeMetaPanelConfig,
  type ColumnHeadersConfig,
  type MetaCellConfig,
  type MetaPanelConfig,
} from '../utils/malla-io.ts';
import {
  applySequentialOverrides,
  cloneHeaderRow,
  createHeaderOverride,
  createHeaderRow,
  ensureHeaderInvariants,
  normalizeColumnHeadersConfig,
  rowHasAnyOverrides,
} from '../utils/column-headers.ts';
import type { ColumnHeaderRowConfig } from '../types/column-headers.ts';
import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import { confirmAsync } from '../ui/alerts';
import { logAppError } from '../core/runtime/logger.ts';
import {
  cloneMetaCellConfig,
  cloneMetaRowWithNewIds,
  createEmptyMetaRow,
} from './malla-editor-bands-meta.ts';
import { useMallaEditorBandsData } from './use-malla-editor-bands-data.ts';
import { useMallaEditorBandsLayout } from './use-malla-editor-bands-layout.ts';

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
  const {
    normalizedColumnHeaders,
    normalizedMetaRows,
    topBandsHeight,
    zoomedGridContainerStyle,
    zoomedMetaCalcHeaderWrapperStyle,
    zoomedMetaCalcColWidths,
  } = useMallaEditorBandsLayout({
    colWidths,
    gridWidth,
    gridHeight,
    zoomScale,
    metaPanel: normalizedMetaPanel,
    columnHeaders,
  });

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
  const {
    mallaForMetaCalc,
    metaCalcDeps,
    activeMetaRow,
    activeMetaRowPosition,
    activeMetaCellConfig,
    isEditingOverrideActive,
    activeMetaEditorCatalog,
    columnMetaEditorCatalog,
  } = useMallaEditorBandsData({
    cols,
    rows,
    pieces,
    pieceValues,
    mastersById,
    template,
    availableMasters,
    formatMasterDisplayName,
    normalizedMetaRows,
    activeMetaRowId,
    activeMetaColIndex,
  });

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
  }, [runHistoryTransaction, setMetaPanel]);

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
    [runHistoryTransaction, setMetaPanel],
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
    [activeMetaColIndex, normalizedMetaRows, runHistoryTransaction, setMetaPanel],
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
    [activeMetaColIndex, normalizedMetaRows, runHistoryTransaction, setMetaPanel, showToast],
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
