import React from 'react';
import type { MetaPanelRowConfig } from '../types/meta-panel.ts';
import { getCellConfigForColumn } from '../utils/malla-io.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import { computeMetaRowValueForColumn, type MetaCalcDeps } from '../utils/meta-calc.ts';
import styles from './MetaCalcHeader.module.css';

const EMPTY_METRIC_HINT = 'Click para editar';

interface Props {
  columnCount: number;
  colWidths: number[];
  rowsConfig: MetaPanelRowConfig[];
  malla: MallaQuerySource;
  deps: MetaCalcDeps;
  onCellClick?: (rowId: string, colIndex: number) => void;
  isOverrideColumn?: (rowConfig: MetaPanelRowConfig, colIndex: number) => boolean;
  activeRowId?: string | null;
  placeholder?: string;
  invalidPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MetaCalcHeader: React.FC<Props> = ({
  columnCount,
  colWidths,
  rowsConfig,
  malla,
  deps,
  onCellClick,
  isOverrideColumn,
  activeRowId,
  placeholder = '-',
  invalidPlaceholder = '-',
  className,
  style,
}) => {
  const safeRows = React.useMemo(
    () => rowsConfig.filter((row) => !!row),
    [rowsConfig],
  );
  const safeColumnCount = Math.max(0, columnCount);
  const resolvedColWidths = React.useMemo(
    () =>
      Array.from({ length: safeColumnCount }, (_, colIndex) => {
        const width = colWidths[colIndex];
        return Number.isFinite(width) && width > 0 ? width : 0;
      }),
    [safeColumnCount, colWidths],
  );
  const rowGridTemplateColumns = React.useMemo(
    () => (resolvedColWidths.length > 0 ? resolvedColWidths.map((w) => `${w}px`).join(' ') : 'none'),
    [resolvedColWidths],
  );

  const valuesByRow = React.useMemo(
    () =>
      safeRows.map((rowConfig) =>
        Array.from({ length: safeColumnCount }, (_, colIndex) =>
          computeMetaRowValueForColumn(malla, colIndex, rowConfig, deps),
        )),
    [safeColumnCount, safeRows, malla, deps],
  );

  return (
    <div
      className={[styles.metaCalcHeader, className].filter(Boolean).join(' ')}
      style={style}
    >
      {safeRows.map((rowConfig, rowIndex) => {
        const rowValues = valuesByRow[rowIndex] ?? [];
        const isActiveRow = activeRowId != null && rowConfig.id === activeRowId;

        return (
          <div
            key={`meta-calc-header-row-${rowConfig.id}`}
            className={styles.metaCalcHeaderRow}
            style={{ gridTemplateColumns: rowGridTemplateColumns }}
          >
            {Array.from({ length: safeColumnCount }, (_, colIndex) => {
              const cellConfig = getCellConfigForColumn(rowConfig, colIndex);
              const value = rowValues[colIndex];
              const overrideLabel = rowConfig.columns?.[colIndex]?.label?.trim();
              const generalLabel = rowConfig.label?.trim();
              const rowLabel = overrideLabel || generalLabel || undefined;
              const hasTerms = cellConfig.terms.length > 0;
              const hasOverride = isOverrideColumn?.(rowConfig, colIndex) ?? false;
              const hasRowLabel = typeof rowLabel === 'string' && rowLabel.trim().length > 0;
              const showEmptyHint = value == null && !hasTerms && !hasRowLabel;
              const displayValue = value == null
                ? (showEmptyHint ? EMPTY_METRIC_HINT : (hasTerms ? invalidPlaceholder : placeholder))
                : `#${value}`;

              return (
                <div
                  key={`meta-calc-header-cell-${rowConfig.id}-${colIndex}`}
                  className={[
                    styles.metaCalcHeaderCell,
                    isActiveRow ? styles.metaCalcHeaderCellActive : '',
                    onCellClick ? styles.metaCalcHeaderCellInteractive : '',
                  ].filter(Boolean).join(' ')}
                  title={rowLabel ? `${rowLabel} (${cellConfig.id})` : cellConfig.id}
                  onClick={onCellClick ? () => onCellClick(rowConfig.id, colIndex) : undefined}
                >
                  <div
                    className={[
                      styles.metaCalcHeaderCellContent,
                      showEmptyHint ? styles.metaCalcHeaderCellContentHint : styles.metaCalcHeaderCellContentWithLabel,
                    ].join(' ')}
                  >
                    {!showEmptyHint ? (
                      <span className={styles.metaCalcHeaderCellLabel}>
                        {rowLabel ?? ''}
                      </span>
                    ) : null}
                    <span className={showEmptyHint ? styles.metaCalcHeaderCellValueHint : styles.metaCalcHeaderCellValue}>
                      {displayValue}
                      {hasOverride ? <span className={styles.metaCalcHeaderOverrideMark}>*</span> : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
