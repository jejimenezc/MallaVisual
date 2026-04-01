// src/components/TemplateGrid.tsx

import React from 'react';
import type { BlockTemplate } from '../types/curricular';
import { TemplateCell } from './TemplateCell';
import type { VisualTemplate } from '../types/visual';
import './BlockTemplateEditor.css';

interface Props {
  template: BlockTemplate;
  selectedCells: { row: number; col: number }[];
  onClick: (e: React.MouseEvent, row: number, col: number) => void;
  onContextMenu: (e: React.MouseEvent, row: number, col: number) => void;
  onMouseDown: (row: number, col: number) => void;
  onMouseEnter: (row: number, col: number) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  /** solo para el Viewer; en el Editor no lo pases */
  applyVisual?: boolean;
  /** mapa visual (solo Viewer) */
  visualTemplate?: VisualTemplate;
  /** valores para modo vista */
  values?: Record<string, string | number | boolean>;
  onValueChange?: (key: string, value: string | number | boolean) => void;
  /** estilos opcionales para la grilla */
  style?: React.CSSProperties;
}

export const TemplateGrid: React.FC<Props> = ({
  template,
  selectedCells,
  onClick,
  onContextMenu,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onMouseLeave,
  applyVisual = false,
  visualTemplate,
  values = {},
  onValueChange,
  style,
}) => {
  const isSelected = (r: number, c: number) =>
    selectedCells.some((s) => s.row === r && s.col === c);

  return (
    <div
      className="template-grid"
      style={style}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {template.map((row, rIdx) =>
        row.map((cell, cIdx) => (
          <TemplateCell
            key={`${rIdx}-${cIdx}`}
            cell={cell}
            row={rIdx}
            col={cIdx}
            template={template}
            isSelected={isSelected(rIdx, cIdx)}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            applyVisual={applyVisual}
            visualTemplate={visualTemplate}
            values={values}
            onValueChange={onValueChange}
          />
        ))
      )}
    </div>
  );
};
