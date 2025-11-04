// src/utils/block-clone.ts
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import { getActiveBounds, cropTemplate, cropVisualTemplate } from './block-active.ts';

export interface BlockData {
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
}

export const duplicateBlock = (data: BlockData): BlockData => ({
  template: data.template.map((row) => row.map((cell) => ({ ...cell }))) as BlockTemplate,
  visual: structuredClone(data.visual),
  aspect: data.aspect,
});

/** Duplica solo el recorte activo (para piezas snapshot) */
export const duplicateActiveCrop = (data: BlockData): BlockData => {
  const b = getActiveBounds(data.template);
  return {
    template: cropTemplate(data.template, b),
    visual: cropVisualTemplate(data.visual, data.template, b),
    aspect: data.aspect,
  };
};
