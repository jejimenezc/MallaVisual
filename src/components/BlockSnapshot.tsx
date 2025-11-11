import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlockTemplate } from '../types/curricular';
import { VisualTemplate, BlockAspect } from '../types/visual';
import { TemplateGrid } from './TemplateGrid';
import { getActiveBounds, cropTemplate, cropVisualTemplate } from '../utils/block-active';
import { GRID_GAP, GRID_PAD } from '../styles/constants.ts';
import './BlockSnapshot.css';
import type { ProjectThemeTokens } from '../utils/project-theme.ts';
import { buildThemeStyleObject } from '../utils/theme-style.ts';

interface Props {
  template: BlockTemplate;
  visualTemplate: VisualTemplate;
  aspect: BlockAspect;
  paletteTokens?: ProjectThemeTokens;
}

/** Tamaños base por aspecto (centralizado) */
export function getCellSizeByAspect(aspect: BlockAspect) {
  switch (aspect) {
    case '1/2': return { cellW: 25, cellH: 50 };
    case '2/1': return { cellW: 50, cellH: 25 };
    case '1/1':
    default:    return { cellW: 50, cellH: 50 };
  }
}

/**
 * Snapshot estático del BLOQUE ACTIVO (recorte), escalado para caber en el contenedor,
 * respetando la relación de aspecto y SIN interacciones.
 */
export const BlockSnapshot: React.FC<Props> = ({
  template,
  visualTemplate,
  aspect,
  paletteTokens,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const paletteStyle = useMemo(() => buildThemeStyleObject(paletteTokens), [paletteTokens]);

  const bounds = useMemo(() => getActiveBounds(template), [template]);
  const subTemplate = useMemo(() => cropTemplate(template, bounds), [template, bounds]);
  const subVisual = useMemo(
    () => cropVisualTemplate(visualTemplate, template, bounds),
    [visualTemplate, template, bounds],
  );
  
  const { cellW, cellH } = useMemo(() => getCellSizeByAspect(aspect), [aspect]);

  // Medidas de la grilla a partir del recorte activo
  const cols = subTemplate[0]?.length ?? 0;
  const rows = subTemplate.length;

  // Deben coincidir con tu CSS (.template-grid): ajusta si cambiaste estos valores

  // Tamaño de CONTENIDO (celdas + gaps). OJO: sin padding.
  const contentW = cols * cellW + Math.max(0, cols - 1) * GRID_GAP;
  const contentH = rows * cellH + Math.max(0, rows - 1) * GRID_GAP;

  // Tamaño EXTERNO del grid (contenido + padding en los 4 lados)
  const outerW = contentW + GRID_PAD * 2;
  const outerH = contentH + GRID_PAD * 2;

  // Recalcular scale en función del contenedor y del tamaño externo
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const SAFE = 1; // margen de seguridad para evitar clipping por redondeos
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const s = Math.min((width - SAFE) / outerW, (height - SAFE) / outerH, 1);
      setScale(s > 0 ? s : 1);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [outerW, outerH]);

  // Caja que se escala (debe usar el tamaño EXTERNO)
  const scaledStyle: React.CSSProperties = {
    width: outerW,
    height: outerH,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    pointerEvents: 'none',
    display: 'block',
  };

  // Estilos INLINE del grid interno: tamaño de CONTENIDO + columnas/filas + padding/gap
  const gridStyle: React.CSSProperties = {
    width: contentW,
    height: contentH,
    gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
    padding: 'var(--grid-pad)',
    gap: 'var(--grid-gap)',
  };

  return (
    <div
      className="snapshot-viewport"
      ref={containerRef}
      data-aspect={aspect}
      style={paletteStyle}
    >
      <div className="snapshot-scale" style={scaledStyle}>
        <TemplateGrid
          template={subTemplate}
          selectedCells={[]}
          onClick={() => {}}
          onContextMenu={() => {}}
          onMouseDown={() => {}}
          onMouseEnter={() => {}}
          onMouseUp={() => {}}
          onMouseLeave={() => {}}
          applyVisual={true}
          visualTemplate={subVisual}
          style={gridStyle}
        />
      </div>
    </div>
  );
};
