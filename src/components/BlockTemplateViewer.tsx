// src/components/BlockTemplateViewer.tsx

import React, { useState } from 'react';
import { BlockTemplate } from '../types/curricular';
import { TemplateGrid } from './TemplateGrid';
import { VisualTemplate, BlockAspect } from '../types/visual';
import './BlockTemplateEditor.css';
import './BlockTemplateViewer.css';

interface Props {
  template: BlockTemplate;
  visualTemplate: VisualTemplate;
  selectedCoord?: { row: number; col: number };
  onSelectCoord: (coord: { row: number; col: number }) => void;
  aspect: BlockAspect;

}

export const BlockTemplateViewer: React.FC<Props> = ({
  template,
  visualTemplate,
  selectedCoord,
  onSelectCoord,
  aspect,
}) => {
  const selectedCells = selectedCoord ? [selectedCoord] : [];
  const [values, setValues] = useState<Record<string, string | number>>({});

  const handleValueChange = (key: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="block-template-viewer">
      <div className="viewer-grid" data-aspect={aspect}>
        <TemplateGrid
          template={template}
          selectedCells={selectedCells}
          onClick={(e, row, col) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'LABEL') {
              e.preventDefault();
            }
            const cell = template[row][col];
            const isMerged = !!cell.mergedWith;
            if (!cell.active || isMerged) return;
            onSelectCoord({ row, col });
          }}
          onContextMenu={() => {}}
          onMouseDown={() => {}}
          onMouseEnter={() => {}}
          onMouseUp={() => {}}
          onMouseLeave={() => {}}
          applyVisual={true}
          visualTemplate={visualTemplate}
          values={values}
          onValueChange={handleValueChange}
        />
      </div>
    </div>
  );
};
