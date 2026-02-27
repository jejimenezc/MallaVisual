import React from 'react';
import type { ColumnHeadersConfig } from '../types/column-headers.ts';
import { ensureHeaderInvariants, getHeaderTextForColumn, isHeaderRowVisible } from '../utils/column-headers.ts';
import styles from './ColumnHeadersBand.module.css';

interface Props {
  headers: ColumnHeadersConfig;
  columnCount: number;
  colWidths: number[];
  onCellClick?: (rowId: string, colIndex: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ColumnHeadersBand: React.FC<Props> = ({
  headers,
  columnCount,
  colWidths,
  onCellClick,
  className,
  style,
}) => {
  const normalizedHeaders = React.useMemo(() => ensureHeaderInvariants(headers), [headers]);
  const safeColumnCount = Math.max(0, columnCount);
  const canEditCells = typeof onCellClick === 'function';
  const rowsToRender = React.useMemo(
    () => normalizedHeaders.rows.filter((row) => isHeaderRowVisible(row)),
    [normalizedHeaders.rows],
  );
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

  if (normalizedHeaders.enabled === false) {
    return null;
  }

  if (rowsToRender.length === 0) {
    return null;
  }

  return (
    <div className={[styles.columnHeadersBand, className].filter(Boolean).join(' ')} style={style}>
      {rowsToRender.map((row, rowIndex) => (
        <div
          key={`column-headers-row-${row.id}`}
          className={styles.columnHeadersBandRow}
          style={{ gridTemplateColumns: rowGridTemplateColumns }}
        >
          {Array.from({ length: safeColumnCount }, (_, colIndex) => (
            <div
              key={`column-headers-cell-${row.id}-${colIndex}`}
              className={[
                styles.columnHeadersBandCell,
                canEditCells ? styles.columnHeadersBandCellInteractive : '',
              ].filter(Boolean).join(' ')}
              title={getHeaderTextForColumn(normalizedHeaders, row, colIndex)}
              role={canEditCells ? 'button' : undefined}
              tabIndex={canEditCells ? 0 : undefined}
              aria-label={canEditCells ? `Editar encabezado, fila ${rowIndex + 1}, periodo ${colIndex + 1}` : undefined}
              onClick={canEditCells ? () => onCellClick(row.id, colIndex) : undefined}
              onKeyDown={canEditCells
                ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCellClick(row.id, colIndex);
                  }
                }
                : undefined}
            >
              {getHeaderTextForColumn(normalizedHeaders, row, colIndex)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
