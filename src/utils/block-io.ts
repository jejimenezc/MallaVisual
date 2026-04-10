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

const BLOCK_ASPECT_VALUES: readonly BlockAspect[] = ['1/1', '1/2', '2/1'] as const;

const isTemplateCell = (value: unknown): boolean =>
  isRecord(value) && typeof value.active === 'boolean';

const normalizeImportedTemplate = (value: unknown): BlockTemplate => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Template de bloque invalido');
  }
  const rows = value.map((row) => {
    if (!Array.isArray(row) || row.length === 0) {
      throw new Error('Template de bloque invalido');
    }
    if (!row.every(isTemplateCell)) {
      throw new Error('Template de bloque invalido');
    }
    return row;
  });
  const colCount = rows[0]?.length ?? 0;
  if (colCount === 0 || rows.some((row) => row.length !== colCount)) {
    throw new Error('Template de bloque invalido');
  }
  return rows as BlockTemplate;
};

const normalizeImportedVisual = (value: unknown): VisualTemplate => {
  if (!isRecord(value)) {
    throw new Error('Visual de bloque invalido');
  }
  for (const entry of Object.values(value)) {
    if (entry !== undefined && entry !== null && !isRecord(entry)) {
      throw new Error('Visual de bloque invalido');
    }
  }
  return value as VisualTemplate;
};

const normalizeImportedAspect = (value: unknown): BlockAspect => {
  if (typeof value !== 'string' || !BLOCK_ASPECT_VALUES.includes(value as BlockAspect)) {
    throw new Error('Aspecto de bloque invalido');
  }
  return value as BlockAspect;
};

export function normalizeImportedBlockContent(value: unknown): Pick<BlockExport, 'template' | 'visual' | 'aspect'> {
  if (!isRecord(value)) {
    throw new Error('Datos de bloque invalidos');
  }
  return {
    template: normalizeImportedTemplate(value.template),
    visual: normalizeImportedVisual(value.visual),
    aspect: normalizeImportedAspect(value.aspect),
  };
}

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
  const content = normalizeImportedBlockContent(data);
  const theme = normalizeProjectTheme((data as { theme?: unknown }).theme);
  return {
    version: BLOCK_SCHEMA_VERSION,
    template: content.template,
    visual: content.visual,
    aspect: content.aspect,
    metadata: isRecord(data.metadata) ? (data.metadata as BlockMetadata) : undefined,
    theme,
  };
}
