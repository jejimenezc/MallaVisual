// src/utils/block-io.ts
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { BlockMetadata } from '../types/block.ts';
import {
  createDefaultProjectTheme,
  normalizeProjectTheme,
  type ProjectTheme,
} from './project-theme.ts';

export interface BlockExport {
  version: number;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  metadata?: BlockMetadata;
  theme: ProjectTheme;
}

export const BLOCK_SCHEMA_VERSION = 1;
export const SUPPORTED_BLOCK_SCHEMA_VERSIONS = [BLOCK_SCHEMA_VERSION] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function migrateBlock(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) {
    throw new Error('JSON inválido');
  }
  if (input.version === undefined) {
    throw new Error('Versión de bloque faltante');
  }
  if (typeof input.version !== 'number' || !Number.isFinite(input.version)) {
    throw new Error('Versión de bloque inválida');
  }
  if (
    !SUPPORTED_BLOCK_SCHEMA_VERSIONS.includes(
      input.version as (typeof SUPPORTED_BLOCK_SCHEMA_VERSIONS)[number],
    )
  ) {
    throw new Error(`Versión de bloque no soportada: ${String(input.version)}`);
  }
  return input;
}

export function exportBlock(
  template: BlockTemplate,
  visual: VisualTemplate,
  aspect: BlockAspect,
  metadata?: BlockMetadata,
  theme: ProjectTheme = createDefaultProjectTheme(),
): string {
  const data: BlockExport = {
    version: BLOCK_SCHEMA_VERSION,
    template,
    visual,
    aspect,
    metadata,
    theme,
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
  const migrated = migrateBlock(parsed);
  const data = migrated as Partial<BlockExport>;
  if (!data.template || !data.visual || !data.aspect) {
    throw new Error('Datos incompletos');
  }
  const theme = normalizeProjectTheme((data as { theme?: unknown }).theme);
  return {
    version: BLOCK_SCHEMA_VERSION,
    template: data.template,
    visual: data.visual,
    aspect: data.aspect,
    metadata: data.metadata,
    theme,
  };
}
