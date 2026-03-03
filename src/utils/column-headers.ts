import type {
  ColumnHeaderRowConfig,
  ColumnHeaderTextOverride,
  ColumnHeadersConfig,
} from '../types/column-headers.ts';

const MAX_HEADER_ROWS = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const createId = (): string => crypto.randomUUID();

const createDefaultOverride = (): ColumnHeaderTextOverride => ({
  id: createId(),
  text: '',
  bold: false,
});

export const createDefaultColumnHeaders = (enabled = false): ColumnHeadersConfig => ({
  enabled,
  rows: [],
});

export const createHeaderRow = (): ColumnHeaderRowConfig => ({
  id: createId(),
  defaultText: '',
  defaultBold: false,
  usePaletteBg: false,
  columns: {},
});

export const isHeaderRowVisible = (row: ColumnHeaderRowConfig): boolean => row.hidden !== true;

const normalizeHeaderOverride = (
  value: unknown,
  fallbackId: string,
): ColumnHeaderTextOverride => {
  if (!isRecord(value)) {
    return { id: fallbackId, text: '' };
  }
  const rawId = typeof value.id === 'string' ? value.id.trim() : '';
  return {
    id: rawId.length > 0 ? rawId : fallbackId,
    text: typeof value.text === 'string' ? value.text : '',
    bold: typeof value.bold === 'boolean' ? value.bold : undefined,
  };
};

const normalizeHeaderRowConfig = (
  value: unknown,
  fallbackId: string,
): ColumnHeaderRowConfig => {
  if (!isRecord(value)) {
    return { id: fallbackId, defaultText: '', columns: {} };
  }

  const rawId = typeof value.id === 'string' ? value.id.trim() : '';
  const id = rawId.length > 0 ? rawId : fallbackId;
  const defaultText = typeof value.defaultText === 'string' ? value.defaultText : '';
  const defaultBold = typeof value.defaultBold === 'boolean' ? value.defaultBold : false;
  const usePaletteBg = typeof value.usePaletteBg === 'boolean' ? value.usePaletteBg : false;
  const rawColumns = isRecord(value.columns) ? value.columns : {};
  const columns: Record<number, ColumnHeaderTextOverride> = {};

  for (const [rawColIndex, rawOverride] of Object.entries(rawColumns)) {
    const colIndex = Number(rawColIndex);
    if (!Number.isInteger(colIndex) || colIndex < 0) continue;
    columns[colIndex] = normalizeHeaderOverride(rawOverride, `${id}-col-${colIndex}`);
  }

  return {
    id,
    defaultText,
    defaultBold,
    usePaletteBg,
    hidden: value.hidden === true ? true : undefined,
    columns,
  };
};

export const cloneHeaderRow = (row: ColumnHeaderRowConfig): ColumnHeaderRowConfig => {
  const columns: Record<number, ColumnHeaderTextOverride> = {};

  for (const [rawColIndex, rawOverride] of Object.entries(row.columns ?? {})) {
    const colIndex = Number(rawColIndex);
    if (!Number.isInteger(colIndex) || colIndex < 0) continue;
    columns[colIndex] = {
      id: createId(),
      text: typeof rawOverride?.text === 'string' ? rawOverride.text : '',
      bold: typeof rawOverride?.bold === 'boolean' ? rawOverride.bold : undefined,
    };
  }

  return {
    id: createId(),
    defaultText: typeof row.defaultText === 'string' ? row.defaultText : '',
    defaultBold: typeof row.defaultBold === 'boolean' ? row.defaultBold : false,
    usePaletteBg: typeof row.usePaletteBg === 'boolean' ? row.usePaletteBg : false,
    hidden: row.hidden === true ? true : undefined,
    columns,
  };
};

export const ensureHeaderInvariants = (headers: ColumnHeadersConfig): ColumnHeadersConfig => {
  const enabled = headers.enabled === true;
  const nextRows = (headers.rows ?? [])
    .slice(0, MAX_HEADER_ROWS)
    .map((row, index) => normalizeHeaderRowConfig(row, `header-row-${index + 1}`));

  if (enabled && nextRows.length === 0) {
    nextRows.push(createHeaderRow());
  }

  return {
    enabled,
    rows: nextRows,
  };
};

export const normalizeColumnHeadersConfig = (value: unknown): ColumnHeadersConfig => {
  if (!isRecord(value)) {
    return createDefaultColumnHeaders(false);
  }

  const enabled = value.enabled === true;
  const rawRows = Array.isArray(value.rows) ? value.rows : [];
  const rows = rawRows.map((row, index) => normalizeHeaderRowConfig(row, `header-row-${index + 1}`));

  return ensureHeaderInvariants({
    enabled,
    rows,
  });
};

export const getHeaderTextForColumn = (
  _headers: ColumnHeadersConfig,
  row: ColumnHeaderRowConfig,
  colIndex: number,
): string => {
  if (!Number.isInteger(colIndex) || colIndex < 0) {
    return row.defaultText;
  }
  return row.columns?.[colIndex]?.text ?? row.defaultText;
};

export const getHeaderBoldForColumn = (
  row: ColumnHeaderRowConfig,
  colIndex: number,
): boolean => {
  if (!Number.isInteger(colIndex) || colIndex < 0) {
    return row.defaultBold === true;
  }
  const override = row.columns?.[colIndex];
  if (!override) {
    return row.defaultBold === true;
  }
  if (typeof override.bold === 'boolean') {
    return override.bold;
  }
  return row.defaultBold === true;
};

export const rowHasAnyOverrides = (row: ColumnHeaderRowConfig): boolean =>
  Object.values(row.columns ?? {}).some(
    (override) => typeof override?.text === 'string' && override.text.trim().length > 0,
  );

export const applySequentialOverrides = (
  row: ColumnHeaderRowConfig,
  numColumns: number,
  makeText: (colIndex: number) => string,
): ColumnHeaderRowConfig => {
  const safeNumColumns = Number.isInteger(numColumns) ? Math.max(0, numColumns) : 0;
  const nextColumns: Record<number, ColumnHeaderTextOverride> = {};

  for (let colIndex = 0; colIndex < safeNumColumns; colIndex += 1) {
    const current = row.columns?.[colIndex];
    nextColumns[colIndex] = {
      id: current?.id ?? createId(),
      text: makeText(colIndex),
      ...(typeof current?.bold === 'boolean' ? { bold: current.bold } : {}),
    };
  }

  return {
    ...row,
    columns: nextColumns,
  };
};

export const createHeaderOverride = createDefaultOverride;
