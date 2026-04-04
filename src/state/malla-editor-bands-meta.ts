import type { MetaCellConfig, MetaPanelRowConfig, MetricExprToken } from '../types/meta-panel.ts';

export const createMetaConfigId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const cloneMetaCellConfig = (config: MetaCellConfig): MetaCellConfig => ({
  ...config,
  terms: (config.terms ?? []).map((term) => ({
    ...term,
    ...(term.condition ? { condition: { ...term.condition } } : {}),
  })),
  expr: config.expr?.map((token): MetricExprToken => ({ ...token })),
});

export const cloneMetaCellConfigWithNewIds = (config: MetaCellConfig): MetaCellConfig => {
  const clonedConfig = cloneMetaCellConfig(config);
  const termIdMap = new Map<string, string>();
  const nextTerms = (clonedConfig.terms ?? []).map((term) => {
    const nextId = createMetaConfigId('meta-term');
    termIdMap.set(term.id, nextId);
    return {
      ...term,
      id: nextId,
    };
  });

  const nextExpr = clonedConfig.expr?.map((token) => {
    if (token.type !== 'term') {
      return token;
    }
    return {
      ...token,
      termId: termIdMap.get(token.termId) ?? token.termId,
    };
  });

  return {
    ...clonedConfig,
    id: createMetaConfigId('meta-cell'),
    terms: nextTerms,
    ...(nextExpr ? { expr: nextExpr } : {}),
  };
};

export const createEmptyMetaRow = (): MetaPanelRowConfig => ({
  id: createMetaConfigId('meta-row'),
  defaultCell: {
    id: createMetaConfigId('meta-cell'),
    mode: 'count',
    terms: [],
  },
  columns: {},
});

export const cloneMetaRowWithNewIds = (row: MetaPanelRowConfig): MetaPanelRowConfig => {
  const nextColumns: Record<number, MetaCellConfig> = {};
  for (const [rawColIndex, cell] of Object.entries(row.columns ?? {})) {
    const colIndex = Number(rawColIndex);
    if (!Number.isInteger(colIndex) || colIndex < 0) {
      continue;
    }
    nextColumns[colIndex] = cloneMetaCellConfigWithNewIds(cell);
  }

  return {
    ...row,
    id: createMetaConfigId('meta-row'),
    defaultCell: cloneMetaCellConfigWithNewIds(row.defaultCell),
    columns: nextColumns,
  };
};
