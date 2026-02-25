import React from 'react';

interface Props {
  colOffsets: number[];
  rowOffsets: number[];
  gridWidth: number;
  gridHeight: number;
  className?: string;
  lineClassName?: string;
}

function buildAxisLines(offsets: number[], max: number) {
  const lines: number[] = [];
  const safeMax = Number.isFinite(max) ? Math.max(0, max) : 0;
  const pushUnique = (value: number) => {
    if (!Number.isFinite(value)) return;
    const safeValue = Math.min(safeMax, Math.max(0, value));
    if (lines.length === 0 || lines[lines.length - 1] !== safeValue) {
      lines.push(safeValue);
    }
  };

  pushUnique(0);
  for (const offset of offsets) {
    pushUnique(offset);
  }
  pushUnique(safeMax);
  return lines;
}

export const MallaGridOverlay: React.FC<Props> = ({
  colOffsets,
  rowOffsets,
  gridWidth,
  gridHeight,
  className,
  lineClassName,
}) => {
  const safeGridWidth = Number.isFinite(gridWidth) ? Math.max(0, gridWidth) : 0;
  const safeGridHeight = Number.isFinite(gridHeight) ? Math.max(0, gridHeight) : 0;

  const verticalPath = React.useMemo(() => {
    const xLines = buildAxisLines(colOffsets, safeGridWidth);
    return xLines.map((x) => `M ${x} 0 L ${x} ${safeGridHeight}`).join(' ');
  }, [colOffsets, safeGridWidth, safeGridHeight]);

  const horizontalPath = React.useMemo(() => {
    const yLines = buildAxisLines(rowOffsets, safeGridHeight);
    return yLines.map((y) => `M 0 ${y} L ${safeGridWidth} ${y}`).join(' ');
  }, [rowOffsets, safeGridWidth, safeGridHeight]);

  return (
    <svg
      className={className}
      width={safeGridWidth}
      height={safeGridHeight}
      viewBox={`0 0 ${safeGridWidth} ${safeGridHeight}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className={lineClassName} d={verticalPath} />
      <path className={lineClassName} d={horizontalPath} />
    </svg>
  );
};
