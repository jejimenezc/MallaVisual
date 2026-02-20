import React from 'react';
import type { MetaPanelRowConfig } from '../types/meta-panel.ts';
import { getCellConfigForColumn } from '../utils/malla-io.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import { computeMetaRowValueForColumn, type MetaCalcDeps } from '../utils/meta-calc.ts';

interface Props {
  columnCount: number;
  rowConfig: MetaPanelRowConfig;
  malla: MallaQuerySource;
  deps: MetaCalcDeps;
  onCellClick?: (colIndex: number) => void;
  isOverrideColumn?: (colIndex: number) => boolean;
  placeholder?: string;
  invalidPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MetaCalcHeader: React.FC<Props> = ({
  columnCount,
  rowConfig,
  malla,
  deps,
  onCellClick,
  isOverrideColumn,
  placeholder = '-',
  invalidPlaceholder = '-',
  className,
  style,
}) => {
  const valuesByColumn = React.useMemo(
    () =>
      Array.from({ length: Math.max(0, columnCount) }, (_, index) => {
        return computeMetaRowValueForColumn(malla, index, rowConfig, deps);
      }),
    [columnCount, rowConfig, malla, deps],
  );

  const cells = Array.from({ length: Math.max(0, columnCount) }, (_, index) => {
    const cellConfig = getCellConfigForColumn(rowConfig, index);
    const value = valuesByColumn[index];
    const overrideLabel = rowConfig.columns?.[index]?.label?.trim();
    const generalLabel = rowConfig.label?.trim();
    const rowLabel = overrideLabel || generalLabel || undefined;
    const hasTerms = cellConfig.terms.length > 0;
    const hasOverride = isOverrideColumn?.(index) ?? false;
    const displayValue = value == null
      ? (hasTerms ? invalidPlaceholder : placeholder)
      : `#${value}`;
    return (
      <div
        key={`meta-calc-header-cell-${index}`}
        style={{
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'stretch',
          borderRight: '1px solid var(--color-border)',
          fontSize: '0.85rem',
          color: 'var(--color-secondary)',
          background: 'var(--color-surface)',
          cursor: onCellClick ? 'pointer' : 'default',
          padding: '0 6px',
        }}
        title={rowLabel ? `${rowLabel} (${cellConfig.id})` : cellConfig.id}
        onClick={onCellClick ? () => onCellClick(index) : undefined}
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
            {hasOverride ? <span style={{ marginLeft: 4, fontSize: '0.65rem' }}>●</span> : null}
          </span>
        </div>
      </div>
    );
  });

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(0, columnCount)}, minmax(0, 1fr))`,
        border: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {cells}
    </div>
  );
};
