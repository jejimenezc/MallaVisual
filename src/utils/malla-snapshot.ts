import type { BlockTemplate, CurricularPiece, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate } from '../types/visual.ts';
import {
  MALLA_SNAPSHOT_FORMAT_VERSION,
  MALLA_SNAPSHOT_PAYLOAD_KIND,
  type MallaSnapshot,
  type SnapshotBandCell,
  type SnapshotBands,
  type SnapshotHeaderBand,
  type SnapshotHeaderRow,
  type SnapshotMetricRow,
  type SnapshotMetricsBand,
  type MallaSnapshotCell,
  type MallaSnapshotItem,
  type MallaSnapshotMerge,
  type MallaSnapshotValidationResult,
  type SnapshotCellStyle,
} from '../types/malla-snapshot.ts';
import {
  MALLA_SCHEMA_VERSION,
  type MallaExport,
  getCellConfigForColumn,
  normalizeMetaPanelConfig,
} from './malla-io.ts';
import { cropTemplate, cropVisualTemplate, expandBoundsToMerges } from './block-active.ts';
import { collectSelectControls } from './selectControls.ts';
import { evaluateExpression } from './calc.ts';
import { normalizeProjectTheme } from './project-theme.ts';
import {
  ensureHeaderInvariants,
  getHeaderBoldForColumn,
  getHeaderTextForColumn,
  isHeaderRowVisible,
} from './column-headers.ts';
import {
  computeMetaRowValueForColumn,
  type MetaCalcDeps,
} from './meta-calc.ts';
import { normalizeViewerTheme } from './viewer-theme.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';

const DEFAULT_BG_COLOR = '#ffffff';
const DEFAULT_TEXT_COLOR = '#111827';
const DEFAULT_CHECKBOX_ACTIVE_COLOR = '#2dd4bf';
const HEADER_BAND_BG_COLOR = '#f8fafc';
const HEADER_BAND_TEXT_COLOR = '#475569';
const METRIC_BAND_BG_COLOR = '#ffffff';
const METRIC_BAND_TEXT_COLOR = '#6b7280';
const BAND_FONT_SIZE_PX = 12;

const createBandCellStyle = (input?: Partial<SnapshotCellStyle>): SnapshotCellStyle => ({
  backgroundColor: input?.backgroundColor ?? DEFAULT_BG_COLOR,
  textColor: input?.textColor ?? DEFAULT_TEXT_COLOR,
  textAlign: input?.textAlign ?? 'center',
  border: input?.border ?? 'thin',
  fontSizePx: input?.fontSizePx ?? BAND_FONT_SIZE_PX,
  paddingX: input?.paddingX ?? 6,
  paddingY: input?.paddingY ?? 4,
  bold: input?.bold ?? false,
  italic: input?.italic ?? false,
});

interface BuildSnapshotOptions {
  projectName: string;
  createdAt?: string;
  snapshotId?: string;
  appVersion?: string;
  sourceSchemaVersion?: number;
  appearance?: ViewerTheme;
}

export const SUPPORTED_MALLA_SNAPSHOT_FORMAT_VERSIONS = [MALLA_SNAPSHOT_FORMAT_VERSION] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isIsoDateString = (value: string): boolean => !Number.isNaN(new Date(value).getTime());

const parseCssVar = (value: string): { token: string; fallback: string } | null => {
  const trimmed = value.trim();
  const match = /^var\((--[a-zA-Z0-9-_]+)\s*,\s*(.+)\)$/.exec(trimmed);
  if (!match) return null;
  return {
    token: match[1]!,
    fallback: match[2]!.trim(),
  };
};

const resolveCssColor = (value: string, tokens: Record<string, string>): string => {
  const parsed = parseCssVar(value);
  if (!parsed) return value;
  return tokens[parsed.token] ?? parsed.fallback;
};

const clampFontSize = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(8, Math.min(72, value));
};

const enumToPx = (fontSize?: 'small' | 'normal' | 'large') =>
  fontSize === 'small' ? 12 : fontSize === 'large' ? 20 : 14;

const compareByRowCol = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  a.row - b.row || a.col - b.col;

const canonicalizeSnapshotCells = (cells: MallaSnapshotCell[]): MallaSnapshotCell[] =>
  cells.slice().sort(compareByRowCol);

const canonicalizeSnapshotMerges = (merges: MallaSnapshotMerge[]): MallaSnapshotMerge[] =>
  merges.slice().sort(compareByRowCol);

const canonicalizeSnapshotItems = (items: MallaSnapshotItem[]): MallaSnapshotItem[] =>
  items
    .map((item) => ({
      ...item,
      merges: canonicalizeSnapshotMerges(item.merges),
      cells: canonicalizeSnapshotCells(item.cells),
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id));

const canonicalizeBandCells = (cells: SnapshotBandCell[]): SnapshotBandCell[] =>
  cells.slice().sort((a, b) => a.col - b.col);

const canonicalizeBands = (bands: SnapshotBands | undefined): SnapshotBands | undefined => {
  if (!bands) return undefined;
  return {
    ...(bands.headers
      ? {
          headers: {
            rows: bands.headers.rows.map((row) => ({
              ...row,
              cells: canonicalizeBandCells(row.cells),
            })),
          },
        }
      : {}),
    ...(bands.metrics
      ? {
          metrics: {
            rows: bands.metrics.rows.map((row) => ({
              ...row,
              cells: canonicalizeBandCells(row.cells),
            })),
          },
        }
      : {}),
  };
};

const safeCell = (template: BlockTemplate, row: number, col: number) =>
  template[row]?.[col] ?? { active: false };

const groupMembers = (
  template: BlockTemplate,
  baseRow: number,
  baseCol: number,
): Array<{ row: number; col: number }> => {
  const baseKey = `${baseRow}-${baseCol}`;
  const members: Array<{ row: number; col: number }> = [{ row: baseRow, col: baseCol }];
  for (let r = 0; r < template.length; r += 1) {
    const row = template[r] ?? [];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c]?.mergedWith === baseKey) {
        members.push({ row: r, col: c });
      }
    }
  }
  return members;
};

const resolveConditionalColor = (
  template: BlockTemplate,
  visual: VisualTemplate,
  row: number,
  col: number,
  values: Record<string, string | number | boolean>,
): { color?: string; optionIndex: number | null } => {
  const key = `${row}-${col}`;
  const style = visual[key];
  const source = style?.conditionalBg?.selectSource;
  if (!source) {
    return { color: undefined, optionIndex: null };
  }

  const controls = collectSelectControls(template);
  const byName = new Map(controls.map((control) => [control.name, control]));
  const byCoord = new Map(controls.map((control) => [control.coord, control]));
  const control =
    (source.controlName ? byName.get(source.controlName) : undefined) ??
    (source.coord ? byCoord.get(source.coord) : undefined);
  if (!control) {
    return { color: undefined, optionIndex: null };
  }

  const selectedValue = values[`r${control.row}c${control.col}`];
  if (selectedValue === undefined) {
    return { color: undefined, optionIndex: null };
  }

  const selectedText = String(selectedValue);
  return {
    color: source.colors[selectedText],
    optionIndex: control.options.findIndex((option) => option === selectedText),
  };
};

const resolveStyle = (params: {
  template: BlockTemplate;
  visual: VisualTemplate;
  row: number;
  col: number;
  values: Record<string, string | number | boolean>;
  themeTokens: Record<string, string>;
}): SnapshotCellStyle => {
  const { template, visual, row, col, values, themeTokens } = params;
  const cell = safeCell(template, row, col);
  const baseKey = cell.mergedWith ?? `${row}-${col}`;
  const style = visual[baseKey];
  const conditional = resolveConditionalColor(template, visual, row, col, values);
  const paletteActive = Boolean(style?.paintWithPalette);
  const checked = Boolean(values[`r${row}c${col}`]);

  let backgroundColor = conditional.color ?? style?.backgroundColor ?? DEFAULT_BG_COLOR;
  let textColor = style?.textColor ?? cell.style?.textColor ?? DEFAULT_TEXT_COLOR;

  if (paletteActive) {
    if (conditional.optionIndex !== null && conditional.optionIndex >= 0) {
      const index = conditional.optionIndex + 1;
      backgroundColor = themeTokens[`--option-${index}`] ?? backgroundColor;
      textColor = themeTokens[`--option-${index}-text`] ?? textColor;
    } else {
      backgroundColor = themeTokens['--cell-active'] ?? backgroundColor;
      textColor = themeTokens['--cell-active-text'] ?? textColor;
    }
  }

  if (cell.type === 'checkbox' && checked) {
    const checkboxBg = style?.conditionalBg?.checkedColor ?? DEFAULT_CHECKBOX_ACTIVE_COLOR;
    backgroundColor = paletteActive
      ? themeTokens['--checkbox-on'] ?? checkboxBg
      : checkboxBg;
    textColor = paletteActive
      ? themeTokens['--checkbox-on-text'] ?? textColor
      : textColor;
  }

  return {
    backgroundColor: resolveCssColor(backgroundColor, themeTokens),
    textColor: resolveCssColor(textColor, themeTokens),
    textAlign: style?.textAlign ?? 'left',
    border: style?.border === false ? 'none' : style?.border ? 'strong' : 'thin',
    fontSizePx: clampFontSize(style?.fontSizePx, enumToPx(style?.fontSize)),
    paddingX: Math.max(0, Math.min(64, style?.paddingX ?? 8)),
    paddingY: Math.max(0, Math.min(64, style?.paddingY ?? 6)),
    bold: Boolean(cell.style?.bold),
    italic: Boolean(cell.style?.italic),
  };
};

const resolveCellText = (
  template: BlockTemplate,
  row: number,
  col: number,
  values: Record<string, string | number | boolean>,
): Pick<MallaSnapshotCell, 'text' | 'value' | 'placeholder' | 'checked' | 'type'> => {
  const cell = safeCell(template, row, col);
  const valueKey = `r${row}c${col}`;
  const value = values[valueKey];
  const textValue = value == null ? '' : String(value);

  switch (cell.type) {
    case 'staticText':
      return { type: 'staticText', text: cell.label?.trim() ?? '' };
    case 'text':
      return {
        type: 'text',
        text: textValue,
        value,
        placeholder: cell.placeholder ?? '',
      };
    case 'number':
      return {
        type: 'number',
        text: typeof value === 'number' ? String(value) : '',
        value,
        placeholder: cell.placeholder ?? '',
      };
    case 'checkbox':
      return {
        type: 'checkbox',
        text: cell.label?.trim() ?? '',
        value: Boolean(value),
        checked: Boolean(value),
      };
    case 'select':
      return { type: 'select', text: textValue, value };
    case 'calculated': {
      const result = cell.expression
        ? evaluateExpression(cell.expression, values as Record<string, number | string>)
        : Number.NaN;
      const finalText = Number.isFinite(result) ? String(result) : '';
      return { type: 'calculated', text: finalText, value: finalText };
    }
    default:
      return { type: 'empty', text: '' };
  }
};

const buildPieceRenderData = (
  piece: CurricularPiece,
  masters: Record<string, MasterBlockData>,
  values: Record<string, string | number | boolean>,
  themeTokens: Record<string, string>,
): MallaSnapshotItem => {
  let pieceTemplate: BlockTemplate;
  let pieceVisual: VisualTemplate;
  let aspect: string;

  if (piece.kind === 'ref') {
    const source = masters[piece.ref.sourceId];
    if (!source) {
      throw new Error(`Maestro no encontrado para pieza referenciada: ${piece.ref.sourceId}`);
    }
    const bounds = expandBoundsToMerges(source.template, piece.ref.bounds);
    pieceTemplate = cropTemplate(source.template, bounds);
    pieceVisual = cropVisualTemplate(source.visual, source.template, bounds);
    aspect = source.aspect;
  } else {
    pieceTemplate = piece.template;
    pieceVisual = piece.visual;
    aspect = piece.aspect;
  }

  const merges: MallaSnapshotMerge[] = [];
  const cells: MallaSnapshotCell[] = [];

  for (let r = 0; r < pieceTemplate.length; r += 1) {
    const row = pieceTemplate[r] ?? [];
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      if (!cell?.active) continue;
      if (cell.mergedWith) continue;

      const members = groupMembers(pieceTemplate, r, c);
      const allActive = members.every((coord) => Boolean(safeCell(pieceTemplate, coord.row, coord.col).active));
      const minRow = Math.min(...members.map((coord) => coord.row));
      const maxRow = Math.max(...members.map((coord) => coord.row));
      const minCol = Math.min(...members.map((coord) => coord.col));
      const maxCol = Math.max(...members.map((coord) => coord.col));
      const hasMerge = members.length > 1 && allActive;
      const rowSpan = hasMerge ? maxRow - minRow + 1 : 1;
      const colSpan = hasMerge ? maxCol - minCol + 1 : 1;

      if (hasMerge) {
        merges.push({ row: r, col: c, rowSpan, colSpan });
      }

      const textData = resolveCellText(pieceTemplate, r, c, values);
      const style = resolveStyle({
        template: pieceTemplate,
        visual: pieceVisual,
        row: r,
        col: c,
        values,
        themeTokens,
      });
      cells.push({
        row: r,
        col: c,
        rowSpan,
        colSpan,
        ...textData,
        style,
      });
    }
  }

  return {
    id: piece.id,
    row: piece.y,
    col: piece.x,
    aspect,
    rows: pieceTemplate.length,
    cols: pieceTemplate[0]?.length ?? 0,
    merges,
    cells,
  };
};

const getPieceTemplateForMetaCalc = (
  piece: CurricularPiece,
  masters: Record<string, MasterBlockData>,
): BlockTemplate | null => {
  if (piece.kind === 'ref') {
    const source = masters[piece.ref.sourceId];
    if (!source) {
      return null;
    }
    const bounds = expandBoundsToMerges(source.template, piece.ref.bounds);
    return cropTemplate(source.template, bounds);
  }
  return piece.template;
};

const getPaletteHeaderColors = (tokens: Record<string, string>): string[] => {
  const optionEntries = Object.entries(tokens)
    .map(([key, value]) => {
      const match = key.match(/^--option-(\d+)$/);
      if (!match || !value) return null;
      const index = Number(match[1]);
      if (!Number.isFinite(index)) return null;
      return { index, value };
    })
    .filter((entry): entry is { index: number; value: string } => entry !== null)
    .sort((a, b) => a.index - b.index);
  if (optionEntries.length > 0) {
    return optionEntries.map((entry) => entry.value);
  }
  const activeCell = tokens['--cell-active'];
  return activeCell ? [activeCell] : [];
};

const buildHeaderBand = (malla: MallaExport, tokens: Record<string, string>): SnapshotHeaderBand | null => {
  const columnHeaders = ensureHeaderInvariants(malla.columnHeaders ?? { enabled: false, rows: [] });
  if (columnHeaders.enabled === false) {
    return null;
  }
  const visibleRows = columnHeaders.rows.filter((row) => isHeaderRowVisible(row));
  if (visibleRows.length === 0) {
    return null;
  }

  const paletteColors = getPaletteHeaderColors(tokens);
  const columnCount = Math.max(1, malla.grid?.cols ?? 1);
  const rows: SnapshotHeaderRow[] = visibleRows.map((row) => {
    const cells: SnapshotBandCell[] = Array.from({ length: columnCount }, (_, colIndex) => {
      const text = getHeaderTextForColumn(columnHeaders, row, colIndex);
      const bold = getHeaderBoldForColumn(row, colIndex);
      const paletteBackground =
        row.usePaletteBg === true && paletteColors.length > 0
          ? paletteColors[colIndex % paletteColors.length]
          : undefined;
      return {
        col: colIndex,
        text: text.trim(),
        bold,
        style: createBandCellStyle({
          backgroundColor: paletteBackground ?? HEADER_BAND_BG_COLOR,
          textColor: HEADER_BAND_TEXT_COLOR,
          textAlign: 'center',
          border: 'thin',
          fontSizePx: BAND_FONT_SIZE_PX,
          paddingX: 6,
          paddingY: 4,
          bold,
          italic: false,
        }),
      };
    });
    return {
      id: row.id,
      cells,
    };
  });

  return { rows };
};

const buildMetricsBand = (
  malla: MallaExport,
  masters: Record<string, MasterBlockData>,
): SnapshotMetricsBand | null => {
  const metaPanel = normalizeMetaPanelConfig(malla.metaPanel);
  if (metaPanel.enabled === false) {
    return null;
  }
  const rowsConfig = (metaPanel.rows ?? []).filter((row) => row.hidden !== true);
  if (rowsConfig.length === 0) {
    return null;
  }
  const columnCount = Math.max(1, malla.grid?.cols ?? 1);
  const querySource = {
    grid: { cols: columnCount, rows: Math.max(1, malla.grid?.rows ?? 1) },
    pieces: malla.pieces ?? [],
  };
  const deps: MetaCalcDeps = {
    valuesByPiece: malla.values ?? {},
    resolveTemplateForPiece: (piece) => getPieceTemplateForMetaCalc(piece, masters),
  };

  const rows: SnapshotMetricRow[] = rowsConfig.map((rowConfig) => {
    const cells: SnapshotBandCell[] = Array.from({ length: columnCount }, (_, colIndex) => {
      const cellConfig = getCellConfigForColumn(rowConfig, colIndex);
      const value = computeMetaRowValueForColumn(querySource, colIndex, rowConfig, deps);
      const overrideLabel = rowConfig.columns?.[colIndex]?.label?.trim();
      const generalLabel = rowConfig.label?.trim();
      const rowLabel = overrideLabel || generalLabel || undefined;
      const hasTerms = cellConfig.terms.length > 0;
      const hasOverride = !!rowConfig.columns?.[colIndex];
      const hasRowLabel = typeof rowLabel === 'string' && rowLabel.trim().length > 0;
      const showEmptyHint = value == null && !hasTerms && !hasRowLabel;
      const displayValue = value == null
        ? (showEmptyHint ? '' : '-')
        : `#${value}${hasOverride ? '*' : ''}`;

      return {
        col: colIndex,
        text: displayValue,
        ...(rowLabel ? { label: rowLabel } : {}),
        style: createBandCellStyle({
          backgroundColor: METRIC_BAND_BG_COLOR,
          textColor: METRIC_BAND_TEXT_COLOR,
          textAlign: showEmptyHint ? 'center' : 'right',
          border: 'thin',
          fontSizePx: BAND_FONT_SIZE_PX,
          paddingX: 6,
          paddingY: 4,
          italic: false,
        }),
      };
    });
    return {
      id: rowConfig.id,
      ...(rowConfig.label?.trim() ? { label: rowConfig.label.trim() } : {}),
      cells,
    };
  });

  return { rows };
};

export const buildMallaSnapshotFromState = (
  malla: MallaExport,
  options: BuildSnapshotOptions,
): MallaSnapshot => {
  const projectName = options.projectName?.trim();
  if (!projectName) {
    throw new Error('projectName es obligatorio para exportar snapshot');
  }

  const normalizedTheme = normalizeProjectTheme(malla.theme);
  const masters: Record<string, MasterBlockData> = { ...(malla.masters ?? {}) };
  for (const [repoId, entry] of Object.entries(malla.repository ?? {})) {
    if (!masters[repoId]) {
      masters[repoId] = {
        template: entry.data.template,
        visual: entry.data.visual,
        aspect: entry.data.aspect,
      };
    }
  }
  const pieceValues = malla.values ?? {};
  const createdAt = options.createdAt ?? new Date().toISOString();

  const items = (malla.pieces ?? []).map((piece) =>
    buildPieceRenderData(piece, masters, pieceValues[piece.id] ?? {}, normalizedTheme.tokens),
  );
  const headersBand = buildHeaderBand(malla, normalizedTheme.tokens);
  const metricsBand = buildMetricsBand(malla, masters);
  const bands: SnapshotBands | undefined =
    headersBand || metricsBand
      ? {
        ...(headersBand ? { headers: headersBand } : {}),
        ...(metricsBand ? { metrics: metricsBand } : {}),
      }
      : undefined;

  return {
    payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
    formatVersion: MALLA_SNAPSHOT_FORMAT_VERSION,
    createdAt,
    projectName,
    ...(options.snapshotId ? { snapshotId: options.snapshotId } : {}),
    ...(options.appVersion ? { appVersion: options.appVersion } : {}),
    sourceSchemaVersion: options.sourceSchemaVersion ?? MALLA_SCHEMA_VERSION,
    grid: {
      rows: Math.max(1, malla.grid?.rows ?? 1),
      cols: Math.max(1, malla.grid?.cols ?? 1),
    },
    items: canonicalizeSnapshotItems(items),
    ...(bands ? { bands: canonicalizeBands(bands) } : {}),
    ...(options.appearance ? { appearance: normalizeViewerTheme(options.appearance) } : {}),
  };
};

const normalizeSnapshotCell = (value: unknown): MallaSnapshotCell | null => {
  if (!isRecord(value)) return null;
  const row = Number(value.row);
  const col = Number(value.col);
  const rowSpan = Number(value.rowSpan ?? 1);
  const colSpan = Number(value.colSpan ?? 1);
  const text = typeof value.text === 'string' ? value.text : '';
  if (!Number.isInteger(row) || row < 0) return null;
  if (!Number.isInteger(col) || col < 0) return null;
  if (!Number.isInteger(rowSpan) || rowSpan < 1) return null;
  if (!Number.isInteger(colSpan) || colSpan < 1) return null;

  const type = typeof value.type === 'string' ? value.type : 'empty';
  const styleRecord = isRecord(value.style) ? value.style : {};
  const style: SnapshotCellStyle = {
    backgroundColor:
      typeof styleRecord.backgroundColor === 'string'
        ? styleRecord.backgroundColor
        : DEFAULT_BG_COLOR,
    textColor: typeof styleRecord.textColor === 'string' ? styleRecord.textColor : DEFAULT_TEXT_COLOR,
    textAlign:
      styleRecord.textAlign === 'center' ||
      styleRecord.textAlign === 'right' ||
      styleRecord.textAlign === 'justify'
        ? styleRecord.textAlign
        : 'left',
    border:
      styleRecord.border === 'none' || styleRecord.border === 'strong'
        ? styleRecord.border
        : 'thin',
    fontSizePx: clampFontSize(styleRecord.fontSizePx, 14),
    paddingX: Math.max(0, Math.min(64, Number(styleRecord.paddingX ?? 8))),
    paddingY: Math.max(0, Math.min(64, Number(styleRecord.paddingY ?? 6))),
    bold: Boolean(styleRecord.bold),
    italic: Boolean(styleRecord.italic),
  };

  return {
    row,
    col,
    rowSpan,
    colSpan,
    type: type as MallaSnapshotCell['type'],
    text,
    ...(value.value !== undefined ? { value: value.value as string | number | boolean } : {}),
    ...(typeof value.placeholder === 'string' ? { placeholder: value.placeholder } : {}),
    ...(typeof value.checked === 'boolean' ? { checked: value.checked } : {}),
    style,
  };
};

const normalizeSnapshotMerge = (value: unknown): MallaSnapshotMerge | null => {
  if (!isRecord(value)) return null;
  const row = Number(value.row);
  const col = Number(value.col);
  const rowSpan = Number(value.rowSpan);
  const colSpan = Number(value.colSpan);
  if (!Number.isInteger(row) || row < 0) return null;
  if (!Number.isInteger(col) || col < 0) return null;
  if (!Number.isInteger(rowSpan) || rowSpan < 1) return null;
  if (!Number.isInteger(colSpan) || colSpan < 1) return null;
  return { row, col, rowSpan, colSpan };
};

const normalizeSnapshotItem = (value: unknown): MallaSnapshotItem | null => {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' && value.id.trim().length > 0
    ? value.id.trim()
    : '';
  const row = Number(value.row);
  const col = Number(value.col);
  const rows = Number(value.rows);
  const cols = Number(value.cols);
  const aspect = typeof value.aspect === 'string' && value.aspect.trim().length > 0
    ? value.aspect.trim()
    : '1/1';

  if (!id) return null;
  if (!Number.isInteger(row) || row < 0) return null;
  if (!Number.isInteger(col) || col < 0) return null;
  if (!Number.isInteger(rows) || rows < 1) return null;
  if (!Number.isInteger(cols) || cols < 1) return null;

  const rawCells = Array.isArray(value.cells) ? value.cells : [];
  const cells = rawCells
    .map(normalizeSnapshotCell)
    .filter((cell): cell is MallaSnapshotCell => cell !== null);
  const rawMerges = Array.isArray(value.merges) ? value.merges : [];
  const merges = rawMerges
    .map(normalizeSnapshotMerge)
    .filter((merge): merge is MallaSnapshotMerge => merge !== null);

  return {
    id,
    row,
    col,
    aspect,
    rows,
    cols,
    cells,
    merges,
  };
};

const normalizeSnapshotBandCell = (value: unknown): SnapshotBandCell | null => {
  if (!isRecord(value)) return null;
  const col = Number(value.col);
  if (!Number.isInteger(col) || col < 0) return null;
  const text = typeof value.text === 'string' ? value.text : '';
  const label = typeof value.label === 'string' ? value.label : undefined;
  const bold = typeof value.bold === 'boolean' ? value.bold : undefined;
  const styleRecord = isRecord(value.style) ? value.style : {};
  const style = createBandCellStyle({
    backgroundColor:
      typeof styleRecord.backgroundColor === 'string'
        ? styleRecord.backgroundColor
        : DEFAULT_BG_COLOR,
    textColor: typeof styleRecord.textColor === 'string' ? styleRecord.textColor : DEFAULT_TEXT_COLOR,
    textAlign:
      styleRecord.textAlign === 'center' ||
      styleRecord.textAlign === 'right' ||
      styleRecord.textAlign === 'justify'
        ? styleRecord.textAlign
        : 'left',
    border:
      styleRecord.border === 'none' || styleRecord.border === 'strong'
        ? styleRecord.border
        : 'thin',
    fontSizePx: clampFontSize(styleRecord.fontSizePx, BAND_FONT_SIZE_PX),
    paddingX: Math.max(0, Math.min(64, Number(styleRecord.paddingX ?? 6))),
    paddingY: Math.max(0, Math.min(64, Number(styleRecord.paddingY ?? 4))),
    bold: typeof styleRecord.bold === 'boolean' ? styleRecord.bold : Boolean(bold),
    italic: Boolean(styleRecord.italic),
  });

  return {
    col,
    text,
    ...(label !== undefined ? { label } : {}),
    ...(bold !== undefined ? { bold } : {}),
    style,
  };
};

const normalizeSnapshotHeaderRow = (value: unknown): SnapshotHeaderRow | null => {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id) return null;
  const rawCells = Array.isArray(value.cells) ? value.cells : [];
  const cells = rawCells
    .map(normalizeSnapshotBandCell)
    .filter((cell): cell is SnapshotBandCell => cell !== null);
  if (cells.length !== rawCells.length) return null;
  return { id, cells };
};

const normalizeSnapshotMetricRow = (value: unknown): SnapshotMetricRow | null => {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id) return null;
  const label = typeof value.label === 'string' ? value.label : undefined;
  const rawCells = Array.isArray(value.cells) ? value.cells : [];
  const cells = rawCells
    .map(normalizeSnapshotBandCell)
    .filter((cell): cell is SnapshotBandCell => cell !== null);
  if (cells.length !== rawCells.length) return null;
  return {
    id,
    ...(label !== undefined ? { label } : {}),
    cells,
  };
};

const normalizeSnapshotBands = (value: unknown): SnapshotBands | null => {
  if (!isRecord(value)) return null;
  let hasAny = false;
  let headers: SnapshotHeaderBand | undefined;
  let metrics: SnapshotMetricsBand | undefined;

  if (isRecord(value.headers)) {
    const rawRows = Array.isArray(value.headers.rows) ? value.headers.rows : [];
    const rows = rawRows
      .map(normalizeSnapshotHeaderRow)
      .filter((row): row is SnapshotHeaderRow => row !== null);
    if (rows.length !== rawRows.length) return null;
    headers = { rows };
    hasAny = true;
  }

  if (isRecord(value.metrics)) {
    const rawRows = Array.isArray(value.metrics.rows) ? value.metrics.rows : [];
    const rows = rawRows
      .map(normalizeSnapshotMetricRow)
      .filter((row): row is SnapshotMetricRow => row !== null);
    if (rows.length !== rawRows.length) return null;
    metrics = { rows };
    hasAny = true;
  }

  if (!hasAny) return null;
  return {
    ...(headers ? { headers } : {}),
    ...(metrics ? { metrics } : {}),
  };
};

export const migrateSnapshot = (snapshot: unknown): Record<string, unknown> | null => {
  if (!isRecord(snapshot)) {
    return null;
  }
  if (snapshot.formatVersion === undefined) {
    return null;
  }
  if (
    typeof snapshot.formatVersion !== 'number' ||
    !SUPPORTED_MALLA_SNAPSHOT_FORMAT_VERSIONS.includes(
      snapshot.formatVersion as (typeof SUPPORTED_MALLA_SNAPSHOT_FORMAT_VERSIONS)[number],
    )
  ) {
    return {
      __migrationError: `Version de snapshot no soportada: ${String(snapshot.formatVersion)}`,
    };
  }
  const payloadKind =
    snapshot.payloadKind === undefined
      ? MALLA_SNAPSHOT_PAYLOAD_KIND
      : typeof snapshot.payloadKind === 'string'
        ? snapshot.payloadKind.trim()
        : null;
  if (payloadKind !== MALLA_SNAPSHOT_PAYLOAD_KIND) {
    return {
      __migrationError: `Payload de snapshot no soportado: ${String(snapshot.payloadKind)}`,
    };
  }
  return {
    ...snapshot,
    payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
  };
};

export const validateAndNormalizeMallaSnapshot = (
  snapshot: unknown,
): MallaSnapshotValidationResult => {
  if (!isRecord(snapshot)) {
    return { ok: false, error: 'Snapshot invalido: se esperaba un objeto JSON.' };
  }

  const migrated = migrateSnapshot(snapshot);
  if (!migrated) {
    return { ok: false, error: 'Snapshot invalido: formatVersion es obligatorio.' };
  }
  if ('__migrationError' in migrated) {
    return { ok: false, error: String(migrated.__migrationError) };
  }

  const createdAt = typeof migrated.createdAt === 'string' ? migrated.createdAt.trim() : '';
  if (!createdAt || !isIsoDateString(createdAt)) {
    return { ok: false, error: 'Snapshot invalido: createdAt debe ser un ISO string valido.' };
  }

  const projectName = typeof migrated.projectName === 'string' ? migrated.projectName.trim() : '';
  if (!projectName) {
    return { ok: false, error: 'Snapshot invalido: projectName es obligatorio.' };
  }

  const gridRecord = isRecord(migrated.grid) ? migrated.grid : null;
  if (!gridRecord) {
    return { ok: false, error: 'Snapshot invalido: falta la definicion de grid.' };
  }
  const rows = Number(gridRecord.rows);
  const cols = Number(gridRecord.cols);
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
    return { ok: false, error: 'Snapshot invalido: grid.rows y grid.cols deben ser enteros positivos.' };
  }

  const rawItems = Array.isArray(migrated.items) ? migrated.items : null;
  if (!rawItems) {
    return { ok: false, error: 'Snapshot invalido: items debe ser un arreglo.' };
  }
  const items = rawItems
    .map(normalizeSnapshotItem)
    .filter((item): item is MallaSnapshotItem => item !== null);
  if (items.length !== rawItems.length) {
    return { ok: false, error: 'Snapshot invalido: hay items con formato incorrecto.' };
  }

  const hasBands = migrated.bands !== undefined;
  const bands = hasBands ? normalizeSnapshotBands(migrated.bands) : undefined;
  if (hasBands && !bands) {
    return { ok: false, error: 'Snapshot invalido: bandas con formato incorrecto.' };
  }

  const sourceSchemaVersion =
    typeof migrated.sourceSchemaVersion === 'number' &&
    Number.isInteger(migrated.sourceSchemaVersion) &&
    migrated.sourceSchemaVersion > 0
      ? migrated.sourceSchemaVersion
      : undefined;

  const normalizedSnapshot: MallaSnapshot = {
    payloadKind: MALLA_SNAPSHOT_PAYLOAD_KIND,
    formatVersion: MALLA_SNAPSHOT_FORMAT_VERSION,
    createdAt,
    projectName,
    ...(typeof migrated.snapshotId === 'string' && migrated.snapshotId.trim()
      ? { snapshotId: migrated.snapshotId.trim() }
      : {}),
    ...(typeof migrated.appVersion === 'string' && migrated.appVersion.trim()
      ? { appVersion: migrated.appVersion.trim() }
      : {}),
    ...(sourceSchemaVersion !== undefined
      ? { sourceSchemaVersion }
      : {}),
    grid: {
      rows,
      cols,
    },
    items: canonicalizeSnapshotItems(items),
    ...(bands ? { bands: canonicalizeBands(bands) } : {}),
    ...(migrated.appearance !== undefined
      ? { appearance: normalizeViewerTheme(migrated.appearance) }
      : {}),
  };

  return {
    ok: true,
    normalizedSnapshot,
  };
};
