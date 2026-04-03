import type React from 'react';
import { useMemo } from 'react';
import { type ColumnHeadersConfig, type MetaPanelConfig } from '../utils/malla-io.ts';
import { ensureHeaderInvariants, isHeaderRowVisible } from '../utils/column-headers.ts';

const COLUMN_HEADER_ROW_HEIGHT = 28;
const META_CALC_HEADER_ROW_HEIGHT = 30;

interface UseMallaEditorBandsLayoutParams {
  colWidths: number[];
  gridWidth: number;
  gridHeight: number;
  zoomScale: number;
  metaPanel: MetaPanelConfig;
  columnHeaders: ColumnHeadersConfig;
}

export function useMallaEditorBandsLayout({
  colWidths,
  gridWidth,
  gridHeight,
  zoomScale,
  metaPanel,
  columnHeaders,
}: UseMallaEditorBandsLayoutParams) {
  const normalizedMetaPanel = useMemo(() => metaPanel, [metaPanel]);
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

  return {
    normalizedMetaPanel,
    normalizedColumnHeaders,
    normalizedMetaRows,
    topBandsHeight,
    zoomedGridContainerStyle,
    zoomedMetaCalcHeaderWrapperStyle,
    zoomedMetaCalcColWidths,
  };
}
