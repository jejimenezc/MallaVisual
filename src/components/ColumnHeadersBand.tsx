import React from 'react';
import type { ColumnHeadersConfig } from '../types/column-headers.ts';
import { ensureHeaderInvariants, getHeaderTextForColumn } from '../utils/column-headers.ts';
import styles from './ColumnHeadersBand.module.css';

interface Props {
  headers: ColumnHeadersConfig;
  columnCount: number;
  colWidths: number[];
  className?: string;
  style?: React.CSSProperties;
}

export const ColumnHeadersBand: React.FC<Props> = ({
  headers,
  columnCount,
  colWidths,
  className,
  style,
}) => {
  const normalizedHeaders = React.useMemo(() => ensureHeaderInvariants(headers), [headers]);

  if (normalizedHeaders.enabled === false) {
    return null;
  }

  const safeRows = normalizedHeaders.rows.length > 0
    ? normalizedHeaders.rows
    : [{ id: 'header-row-fallback', defaultText: '', columns: {} }];
  const safeColumnCount = Math.max(0, columnCount);
  const resolvedColWidths = React.useMemo(
    () =>
      Array.from({ length: safeColumnCount }, (_, colIndex) => {
        const width = colWidths[colIndex];
        return Number.isFinite(width) && width > 0 ? width : 0;
      }),
    [colWidths, safeColumnCount],
  );
  const rowGridTemplateColumns = React.useMemo(
    () => (resolvedColWidths.length > 0 ? resolvedColWidths.map((w) => `${w}px`).join(' ') : 'none'),
    [resolvedColWidths],
  );

  return (
    <div className={[styles.columnHeadersBand, className].filter(Boolean).join(' ')} style={style}>
      {safeRows.map((row) => (
        <div
          key={`column-headers-row-${row.id}`}
          className={styles.columnHeadersBandRow}
          style={{ gridTemplateColumns: rowGridTemplateColumns }}
        >
          {Array.from({ length: safeColumnCount }, (_, colIndex) => (
            <div
              key={`column-headers-cell-${row.id}-${colIndex}`}
              className={styles.columnHeadersBandCell}
              title={getHeaderTextForColumn(normalizedHeaders, row, colIndex)}
            >
              {getHeaderTextForColumn(normalizedHeaders, row, colIndex)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
