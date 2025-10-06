// src/utils/block-io.ts
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';

export interface BlockMetadata {
  name?: string | null;
}

export interface BlockExport {
  version: number;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  meta?: BlockMetadata;
}

export const BLOCK_SCHEMA_VERSION = 1;

export function exportBlock(
  template: BlockTemplate,
  visual: VisualTemplate,
  aspect: BlockAspect,
  meta?: BlockMetadata,
): string {
  const data: BlockExport = {
    version: BLOCK_SCHEMA_VERSION,
    template,
    visual,
    aspect,
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(data, null, 2);
}

export function importBlock(json: string): BlockExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON inválido');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JSON inválido');
  }
  const data = parsed as Partial<BlockExport>;
  if (data.version !== BLOCK_SCHEMA_VERSION) {
    throw new Error('Versión incompatible');
  }
  if (!data.template || !data.visual || !data.aspect) {
    throw new Error('Datos incompletos');
  }
  return data as BlockExport;
}