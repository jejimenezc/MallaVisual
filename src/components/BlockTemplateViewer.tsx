// src/components/BlockTemplateViewer.tsx

import React, { useMemo, useState } from 'react';
import { BlockTemplate } from '../types/curricular';
import { TemplateGrid } from './TemplateGrid';
import { VisualTemplate, BlockAspect } from '../types/visual';
import './BlockTemplateEditor.css';
import './BlockTemplateViewer.css';
import type { ProjectThemeTokens } from '../utils/project-theme.ts';
import { buildThemeStyleObject } from '../utils/theme-style.ts';

interface Props {
  template: BlockTemplate;
  visualTemplate: VisualTemplate;
  selectedCoord?: { row: number; col: number };
  onSelectCoord?: (coord: { row: number; col: number }) => void;
  aspect: BlockAspect;
  paletteTokens?: ProjectThemeTokens;

}

export const BlockTemplateViewer: React.FC<Props> = ({
  template,
  visualTemplate,
  selectedCoord,
  onSelectCoord,
  aspect,
  paletteTokens,
}) => {
  const selectedCells = selectedCoord ? [selectedCoord] : [];
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const paletteStyle = useMemo(() => buildThemeStyleObject(paletteTokens), [paletteTokens]);

  const handleValueChange = (key: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="block-template-viewer" style={paletteStyle}>
      <div className="viewer-grid" data-aspect={aspect}>
        <TemplateGrid
          template={template}
          selectedCells={selectedCells}
          onClick={(e, row, col) => {
            const tag = (e.target as HTMLElement).tagName.toUpperCase();
            if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'LABEL' && tag !== 'TEXTAREA') {
              e.preventDefault();
            }
            const cell = template[row][col];
            const isMerged = !!cell.mergedWith;
            if (!cell.active || isMerged) return;
            onSelectCoord?.({ row, col });
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
