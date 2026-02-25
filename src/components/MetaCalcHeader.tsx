import React from 'react';
import type { MetaPanelRowConfig } from '../types/meta-panel.ts';
import { getCellConfigForColumn } from '../utils/malla-io.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import { computeMetaRowValueForColumn, type MetaCalcDeps } from '../utils/meta-calc.ts';

interface Props {
  columnCount: number;
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

  const valuesByRow = React.useMemo(
    () =>
      safeRows.map((rowConfig) =>
        Array.from({ length: Math.max(0, columnCount) }, (_, colIndex) =>
          computeMetaRowValueForColumn(malla, colIndex, rowConfig, deps),
        )),
    [columnCount, safeRows, malla, deps],
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {safeRows.map((rowConfig, rowIndex) => {
        const rowValues = valuesByRow[rowIndex] ?? [];
        const isActiveRow = activeRowId != null && rowConfig.id === activeRowId;

        return (
          <div
            key={`meta-calc-header-row-${rowConfig.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(0, columnCount)}, minmax(0, 1fr))`,
              borderBottom: rowIndex < safeRows.length - 1 ? '1px solid var(--color-border)' : undefined,
            }}
          >
            {Array.from({ length: Math.max(0, columnCount) }, (_, colIndex) => {
              const cellConfig = getCellConfigForColumn(rowConfig, colIndex);
              const value = rowValues[colIndex];
              const overrideLabel = rowConfig.columns?.[colIndex]?.label?.trim();
              const generalLabel = rowConfig.label?.trim();
              const rowLabel = overrideLabel || generalLabel || undefined;
              const hasTerms = cellConfig.terms.length > 0;
              const hasOverride = isOverrideColumn?.(rowConfig, colIndex) ?? false;
              const displayValue = value == null
                ? (hasTerms ? invalidPlaceholder : placeholder)
                : `#${value}`;

              return (
                <div
                  key={`meta-calc-header-cell-${rowConfig.id}-${colIndex}`}
                  style={{
                    minHeight: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'stretch',
                    borderRight: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    color: 'var(--color-secondary)',
                    background: isActiveRow
                      ? 'var(--color-primary-10, rgba(37, 99, 235, 0.1))'
                      : 'var(--color-surface)',
                    cursor: onCellClick ? 'pointer' : 'default',
                    padding: '0 6px',
                  }}
                  title={rowLabel ? `${rowLabel} (${cellConfig.id})` : cellConfig.id}
                  onClick={onCellClick ? () => onCellClick(rowConfig.id, colIndex) : undefined}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'center',
                      columnGap: 6,
                      width: '100%',
                      lineHeight: 1.1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.62rem',
                        opacity: 0.8,
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {rowLabel ?? ''}
                    </span>
                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {displayValue}
                      {hasOverride ? <span style={{ marginLeft: 4, fontSize: '0.65rem' }}>*</span> : null}
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
