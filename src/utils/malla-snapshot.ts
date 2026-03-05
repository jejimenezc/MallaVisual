import type { BlockTemplate, CurricularPiece, MasterBlockData } from '../types/curricular.ts';
import type { VisualTemplate } from '../types/visual.ts';
import {
  MALLA_SNAPSHOT_FORMAT_VERSION,
  type MallaSnapshot,
  type MallaSnapshotCell,
  type MallaSnapshotItem,
  type MallaSnapshotMerge,
  type MallaSnapshotValidationResult,
  type SnapshotCellStyle,
} from '../types/malla-snapshot.ts';
import type { MallaExport } from './malla-io.ts';
import { cropTemplate, cropVisualTemplate, expandBoundsToMerges } from './block-active.ts';
import { collectSelectControls } from './selectControls.ts';
import { evaluateExpression } from './calc.ts';
import { normalizeProjectTheme } from './project-theme.ts';

const DEFAULT_BG_COLOR = '#ffffff';
const DEFAULT_TEXT_COLOR = '#111827';
const DEFAULT_CHECKBOX_ACTIVE_COLOR = '#2dd4bf';

interface BuildSnapshotOptions {
  projectName: string;
  createdAt?: string;
  snapshotId?: string;
  appVersion?: string;
}

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

  return {
    formatVersion: MALLA_SNAPSHOT_FORMAT_VERSION,
    createdAt,
    projectName,
    ...(options.snapshotId ? { snapshotId: options.snapshotId } : {}),
    ...(options.appVersion ? { appVersion: options.appVersion } : {}),
    grid: {
      rows: Math.max(1, malla.grid?.rows ?? 1),
      cols: Math.max(1, malla.grid?.cols ?? 1),
    },
    items,
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

export const validateAndNormalizeMallaSnapshot = (
  snapshot: unknown,
): MallaSnapshotValidationResult => {
  if (!isRecord(snapshot)) {
    return { ok: false, error: 'Snapshot inválido: se esperaba un objeto JSON.' };
  }

  if (snapshot.formatVersion !== MALLA_SNAPSHOT_FORMAT_VERSION) {
    return {
      ok: false,
      error: `Versión de snapshot no soportada: ${String(snapshot.formatVersion)}`,
    };
  }

  const createdAt = typeof snapshot.createdAt === 'string' ? snapshot.createdAt.trim() : '';
  if (!createdAt || !isIsoDateString(createdAt)) {
    return { ok: false, error: 'Snapshot inválido: createdAt debe ser un ISO string válido.' };
  }

  const projectName = typeof snapshot.projectName === 'string' ? snapshot.projectName.trim() : '';
  if (!projectName) {
    return { ok: false, error: 'Snapshot inválido: projectName es obligatorio.' };
  }

  const gridRecord = isRecord(snapshot.grid) ? snapshot.grid : null;
  if (!gridRecord) {
    return { ok: false, error: 'Snapshot inválido: falta la definición de grid.' };
  }
  const rows = Number(gridRecord.rows);
  const cols = Number(gridRecord.cols);
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
    return { ok: false, error: 'Snapshot inválido: grid.rows y grid.cols deben ser enteros positivos.' };
  }

  const rawItems = Array.isArray(snapshot.items) ? snapshot.items : null;
  if (!rawItems) {
    return { ok: false, error: 'Snapshot inválido: items debe ser un arreglo.' };
  }
  const items = rawItems
    .map(normalizeSnapshotItem)
    .filter((item): item is MallaSnapshotItem => item !== null);
  if (items.length !== rawItems.length) {
    return { ok: false, error: 'Snapshot inválido: hay items con formato incorrecto.' };
  }

  const normalizedSnapshot: MallaSnapshot = {
    formatVersion: MALLA_SNAPSHOT_FORMAT_VERSION,
    createdAt,
    projectName,
    ...(typeof snapshot.snapshotId === 'string' && snapshot.snapshotId.trim()
      ? { snapshotId: snapshot.snapshotId.trim() }
      : {}),
    ...(typeof snapshot.appVersion === 'string' && snapshot.appVersion.trim()
      ? { appVersion: snapshot.appVersion.trim() }
      : {}),
    grid: {
      rows,
      cols,
    },
    items,
  };

  return {
    ok: true,
    normalizedSnapshot,
  };
};
