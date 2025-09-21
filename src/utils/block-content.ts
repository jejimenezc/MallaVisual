// src/utils/block-content.ts
import type { BlockTemplate, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { BlockExport } from './block-io.ts';

export interface BlockContent {
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
}

type BlockSource = BlockExport | BlockContent | MasterBlockData;

export function toBlockContent(source: BlockSource): BlockContent {
  return {
    template: source.template,
    visual: source.visual,
    aspect: source.aspect,
  };
}

export function cloneBlockContent(content: BlockContent): BlockContent {
  if (typeof structuredClone === 'function') {
    return structuredClone(content);
  }
  return {
    template: JSON.parse(JSON.stringify(content.template)) as BlockTemplate,
    visual: JSON.parse(JSON.stringify(content.visual)) as VisualTemplate,
    aspect: content.aspect,
  };
}

export function blockContentEquals(
  a: BlockContent | null | undefined,
  b: BlockContent | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.aspect !== b.aspect) return false;
  return (
    JSON.stringify(a.template) === JSON.stringify(b.template) &&
    JSON.stringify(a.visual) === JSON.stringify(b.visual)
  );
}