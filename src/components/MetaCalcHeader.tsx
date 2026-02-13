import React from 'react';
import type { MetaPanelRowConfig } from '../types/meta-panel.ts';
import { getOrCreateMetaCellConfig } from '../utils/malla-io.ts';
import type { MallaQuerySource } from '../utils/malla-queries.ts';
import { computeMetaCellValueForColumn, type MetaCalcDeps } from '../utils/meta-calc.ts';

interface Props {
  columnCount: number;
  rowConfig: MetaPanelRowConfig;
  malla: MallaQuerySource;
  deps: MetaCalcDeps;
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
  placeholder = '-',
  invalidPlaceholder = '-',
  className,
  style,
}) => {
  const valuesByColumn = React.useMemo(
    () =>
      Array.from({ length: Math.max(0, columnCount) }, (_, index) => {
        const cellConfig = getOrCreateMetaCellConfig(rowConfig, index);
        return computeMetaCellValueForColumn(malla, index, cellConfig, deps);
      }),
    [columnCount, rowConfig, malla, deps],
  );

  const cells = Array.from({ length: Math.max(0, columnCount) }, (_, index) => {
    const cellConfig = getOrCreateMetaCellConfig(rowConfig, index);
    const value = valuesByColumn[index];
    const hasTerms = cellConfig.terms.length > 0;
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
          justifyContent: 'center',
          borderRight: '1px solid var(--color-border)',
          fontSize: '0.85rem',
          color: 'var(--color-secondary)',
          background: 'var(--color-surface)',
        }}
        title={cellConfig.id}
      >
        {displayValue}
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
