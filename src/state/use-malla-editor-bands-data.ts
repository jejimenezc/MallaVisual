import { useCallback, useMemo } from 'react';
import { getCellConfigForColumn, type MetaPanelRowConfig } from '../utils/malla-io.ts';
import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import type { MetaCalcDeps } from '../utils/meta-calc.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import type { MetaPanelCatalog } from '../utils/meta-panel-catalog.ts';
import {
  buildMetaPanelCatalogForColumn,
  buildMetaPanelCatalogForMalla,
} from '../utils/meta-panel-catalog.ts';
import { cropTemplate, expandBoundsToMerges } from '../utils/block-active.ts';

interface UseMallaEditorBandsDataParams<TMetadata extends { uuid: string }> {
  cols: number;
  rows: number;
  pieces: CurricularPiece[];
  pieceValues: Record<string, Record<string, string | number | boolean>>;
  mastersById: Record<string, { template: BlockTemplate }>;
  template: BlockTemplate;
  availableMasters: Array<{ metadata: TMetadata }>;
  formatMasterDisplayName: (metadata: TMetadata, fallbackId: string) => string;
  normalizedMetaRows: MetaPanelRowConfig[];
  activeMetaRowId: string | null;
  activeMetaColIndex: number | null;
}

export function useMallaEditorBandsData<TMetadata extends { uuid: string }>({
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
}: UseMallaEditorBandsDataParams<TMetadata>) {
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

  const activeMetaCellConfig = useMemo(() => {
    if (activeMetaColIndex == null) {
      return activeMetaRow.defaultCell;
    }
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

  return {
    mallaForMetaCalc,
    metaCalcDeps,
    activeMetaRow,
    activeMetaRowPosition,
    activeMetaCellConfig,
    isEditingOverrideActive,
    activeMetaEditorCatalog,
    columnMetaEditorCatalog,
  };
}
