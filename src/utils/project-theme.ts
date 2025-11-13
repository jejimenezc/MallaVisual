// src/utils/project-theme.ts

export interface ProjectThemeParameters {
  seedHue?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProjectThemeTokens {
  [token: string]: string;
}

export interface ProjectTheme {
  paletteId: string | null;
  params?: ProjectThemeParameters;
  tokens: ProjectThemeTokens;
}

export function createDefaultProjectTheme(): ProjectTheme {
  return { paletteId: null, tokens: {} };
}

function normalizeThemeParams(params: unknown): ProjectTheme['params'] {
  if (!params || typeof params !== 'object') {
    return undefined;
  }
  const entries = Object.entries(params as Record<string, unknown>);
  if (entries.length === 0) {
    return undefined;
  }
  const normalized: Record<string, string | number | boolean | null | undefined> = {};
  for (const [key, value] of entries) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      normalized[key] = value;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeThemeTokens(tokens: unknown): ProjectThemeTokens {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }
  const normalized: ProjectThemeTokens = {};
  for (const [key, value] of Object.entries(tokens as Record<string, unknown>)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function normalizeProjectTheme(theme: unknown): ProjectTheme {
  if (!theme || typeof theme !== 'object') {
    return createDefaultProjectTheme();
  }
  const source = theme as Partial<ProjectTheme>;
  const paletteId = typeof source.paletteId === 'string' ? source.paletteId.trim() : null;
  const params = normalizeThemeParams(source.params);
  const tokens = normalizeThemeTokens((source as { tokens?: unknown }).tokens);
  const normalizedPaletteId = paletteId && paletteId.length > 0 ? paletteId : null;
  const normalized: ProjectTheme = {
    paletteId: normalizedPaletteId,
    tokens,
  };
  if (params) {
    normalized.params = params;
  }
  return normalized;
}