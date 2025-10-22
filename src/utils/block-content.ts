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

export function hasBlockDesign(content: BlockContent): boolean {
  const hasConfiguredCell = content.template.some((row) =>
    row.some((cell) => {
      if (!cell) return false;
      if (cell.active) return true;
      if (cell.type) return true;
      if (typeof cell.label === 'string' && cell.label.trim().length > 0) {
        return true;
      }
      if (cell.dropdownOptions && cell.dropdownOptions.length > 0) {
        return true;
      }
      if (typeof cell.placeholder === 'string' && cell.placeholder.trim().length > 0) {
        return true;
      }
      if (cell.decimalDigits !== undefined) {
        return true;
      }
      if (typeof cell.expression === 'string' && cell.expression.trim().length > 0) {
        return true;
      }
      if (cell.mergedWith) return true;
      if (cell.style && Object.keys(cell.style).length > 0) {
        return true;
      }
      if (cell.visualStyle && Object.keys(cell.visualStyle).length > 0) {
        return true;
      }
      return false;
    }),
  );

  if (hasConfiguredCell) {
    return true;
  }

  const merges = (content.visual as unknown as { merges?: Record<string, unknown> | null })?.merges;
  if (merges && typeof merges === 'object' && Object.keys(merges).length > 0) {
    return true;
  }

  const visualEntries = Object.values(content.visual ?? {});
  const hasVisualConfiguration = visualEntries.some((value) => {
    if (!value) return false;
    return Object.keys(value).length > 0;
  });
  if (hasVisualConfiguration) {
    return true;
  }

  const metaName = (content as unknown as { meta?: { name?: string | null } }).meta?.name;
  if (typeof metaName === 'string' && metaName.trim().length > 0) {
    return true;
  }

  return false;
}

export function isBlockDesignEmpty(content: BlockContent): boolean {
  return !hasBlockDesign(content);
}