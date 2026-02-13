import React from 'react';

interface Props {
  columnCount: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MetaCalcHeader: React.FC<Props> = ({ columnCount, className, style }) => {
  const cells = Array.from({ length: Math.max(0, columnCount) }, (_, index) => (
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
    >
      Σ
    </div>
  ));

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
