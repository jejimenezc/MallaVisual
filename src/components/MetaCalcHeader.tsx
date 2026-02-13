import React from 'react';
import type { MetaPanelRowConfig } from '../types/meta-panel.ts';
import { getOrCreateMetaCellConfig } from '../utils/malla-io.ts';

interface Props {
  columnCount: number;
  valuesByColumn?: Array<string | number | null>;
  rowConfig?: MetaPanelRowConfig;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MetaCalcHeader: React.FC<Props> = ({
  columnCount,
  valuesByColumn = [],
  rowConfig,
  placeholder = '-',
  className,
  style,
}) => {
  const cells = Array.from({ length: Math.max(0, columnCount) }, (_, index) => {
    const cellConfig = getOrCreateMetaCellConfig(rowConfig, index);
    const value = valuesByColumn[index];
    const displayValue = value == null ? placeholder : `#${value}`;
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
