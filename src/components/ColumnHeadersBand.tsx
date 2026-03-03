import React from 'react';
import type { ColumnHeadersConfig } from '../types/column-headers.ts';
import {
  ensureHeaderInvariants,
  getHeaderBoldForColumn,
  getHeaderTextForColumn,
  isHeaderRowVisible,
} from '../utils/column-headers.ts';
import styles from './ColumnHeadersBand.module.css';

const EMPTY_HEADER_HINT = 'Click para editar';

interface Props {
  headers: ColumnHeadersConfig;
  columnCount: number;
  colWidths: number[];
  onCellClick?: (rowId: string, colIndex: number) => void;
  activeRowId?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const ColumnHeadersBand: React.FC<Props> = ({
  headers,
  columnCount,
  colWidths,
  onCellClick,
  activeRowId,
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
          className={[
            styles.columnHeadersBandRow,
            activeRowId === row.id ? styles.columnHeadersBandRowActive : '',
          ].filter(Boolean).join(' ')}
          style={{ gridTemplateColumns: rowGridTemplateColumns }}
        >
          {Array.from({ length: safeColumnCount }, (_, colIndex) => {
            const headerText = getHeaderTextForColumn(normalizedHeaders, row, colIndex);
            const isBold = getHeaderBoldForColumn(row, colIndex);
            const showHint = headerText.trim().length === 0;

            return (
              <div
                key={`column-headers-cell-${row.id}-${colIndex}`}
                className={[
                  styles.columnHeadersBandCell,
                  isBold ? styles.columnHeadersBandCellBold : '',
                  canEditCells ? styles.columnHeadersBandCellInteractive : '',
                  showHint ? styles.columnHeadersBandCellHint : '',
                ].filter(Boolean).join(' ')}
                title={showHint ? EMPTY_HEADER_HINT : headerText}
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
                {showHint ? EMPTY_HEADER_HINT : headerText}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
