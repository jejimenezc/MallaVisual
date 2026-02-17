import type { BlockTemplate, CurricularPiece, InputType } from '../types/curricular.ts';
import type { TermConfig } from '../types/meta-panel.ts';
import type { MallaQuerySource } from './malla-queries.ts';
import { getColumnCells } from './malla-queries.ts';

export interface MetaPanelCatalogControl {
  controlKey: string;
  label: string;
  type: InputType;
}

export interface MetaPanelCatalogTemplate {
  templateId: string;
  label: string;
  numericControls: MetaPanelCatalogControl[];
  conditionControls: MetaPanelCatalogControl[];
}

export interface MetaPanelCatalog {
  templates: MetaPanelCatalogTemplate[];
  controlsByTemplateId: Record<string, MetaPanelCatalogTemplate>;
}

export type TermAvailabilityReason = 'missing-template' | 'missing-control';

export interface TermAvailability {
  ok: boolean;
  reason?: TermAvailabilityReason;
}

interface BuildMetaPanelCatalogForColumnArgs {
  malla: MallaQuerySource;
  colIndex: number;
  resolveTemplateForPiece: (piece: CurricularPiece) => BlockTemplate | null;
  resolveTemplateLabel?: (templateId: string) => string;
}

interface BuildMetaPanelCatalogForMallaArgs {
  malla: MallaQuerySource;
  resolveTemplateForPiece: (piece: CurricularPiece) => BlockTemplate | null;
  resolveTemplateLabel?: (templateId: string) => string;
}

const isNumericType = (type: InputType | undefined): type is 'number' | 'calculated' =>
  type === 'number' || type === 'calculated';

const isConditionType = (
  type: InputType | undefined,
): type is 'number' | 'calculated' | 'checkbox' | 'select' | 'text' =>
  type === 'number'
  || type === 'calculated'
  || type === 'checkbox'
  || type === 'select'
  || type === 'text';

const getPieceTemplateId = (piece: CurricularPiece): string | null => {
  if (piece.kind === 'ref') {
    return piece.ref.sourceId;
  }
  return piece.origin?.sourceId ?? null;
};

const buildControlLabel = (controlKey: string, rawLabel: string | undefined): string => {
  const trimmed = rawLabel?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : controlKey;
};

const parseControlKey = (controlKey: string): { rowIndex: number; colIndex: number } => {
  const match = /^r(\d+)c(\d+)$/.exec(controlKey);
  if (!match) return { rowIndex: 0, colIndex: 0 };
  return {
    rowIndex: Number(match[1]),
    colIndex: Number(match[2]),
  };
};

const sortControls = (controls: MetaPanelCatalogControl[]): MetaPanelCatalogControl[] =>
  controls.slice().sort((a, b) => {
    const ak = parseControlKey(a.controlKey);
    const bk = parseControlKey(b.controlKey);
    if (ak.rowIndex !== bk.rowIndex) return ak.rowIndex - bk.rowIndex;
    return ak.colIndex - bk.colIndex;
  });

const enumerateControls = (template: BlockTemplate): {
  numericControls: MetaPanelCatalogControl[];
  conditionControls: MetaPanelCatalogControl[];
} => {
  const numericControls: MetaPanelCatalogControl[] = [];
  const conditionControls: MetaPanelCatalogControl[] = [];
  const seenNumeric = new Set<string>();
  const seenCondition = new Set<string>();

  for (let rowIndex = 0; rowIndex < template.length; rowIndex += 1) {
    const row = template[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = row[colIndex];
      if (!cell?.active) continue;
      const key = `r${rowIndex}c${colIndex}`;
      const type = cell.type;
      if (isNumericType(type) && !seenNumeric.has(key)) {
        seenNumeric.add(key);
        numericControls.push({
          controlKey: key,
          label: buildControlLabel(key, cell.label),
          type,
        });
      }
      if (isConditionType(type) && !seenCondition.has(key)) {
        seenCondition.add(key);
        conditionControls.push({
          controlKey: key,
          label: buildControlLabel(key, cell.label),
          type,
        });
      }
    }
  }

  return {
    numericControls: sortControls(numericControls),
    conditionControls: sortControls(conditionControls),
  };
};

export function buildMetaPanelCatalogForColumn({
  malla,
  colIndex,
  resolveTemplateForPiece,
  resolveTemplateLabel,
}: BuildMetaPanelCatalogForColumnArgs): MetaPanelCatalog {
  return buildCatalogFromPieces({
    pieces: getColumnCells(malla, colIndex).map((entry) => entry.content),
    resolveTemplateForPiece,
    resolveTemplateLabel,
  });
}

export function buildMetaPanelCatalogForMalla({
  malla,
  resolveTemplateForPiece,
  resolveTemplateLabel,
}: BuildMetaPanelCatalogForMallaArgs): MetaPanelCatalog {
  return buildCatalogFromPieces({
    pieces: malla.pieces ?? [],
    resolveTemplateForPiece,
    resolveTemplateLabel,
  });
}

function buildCatalogFromPieces({
  pieces,
  resolveTemplateForPiece,
  resolveTemplateLabel,
}: {
  pieces: CurricularPiece[];
  resolveTemplateForPiece: (piece: CurricularPiece) => BlockTemplate | null;
  resolveTemplateLabel?: (templateId: string) => string;
}): MetaPanelCatalog {
  const byTemplateId = new Map<string, MetaPanelCatalogTemplate>();

  for (const piece of pieces) {
    const templateId = getPieceTemplateId(piece);
    if (!templateId || byTemplateId.has(templateId)) {
      continue;
    }
    const template = resolveTemplateForPiece(piece);
    if (!template) continue;
    const controls = enumerateControls(template);
    byTemplateId.set(templateId, {
      templateId,
      label: resolveTemplateLabel?.(templateId) ?? templateId,
      numericControls: controls.numericControls,
      conditionControls: controls.conditionControls,
    });
  }

  const templates = Array.from(byTemplateId.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const controlsByTemplateId = Object.fromEntries(
    templates.map((template) => [template.templateId, template]),
  );

  return {
    templates,
    controlsByTemplateId,
  };
}

export function getTermAvailability(
  term: TermConfig,
  catalog: MetaPanelCatalog,
): TermAvailability {
  const template = catalog.controlsByTemplateId[term.templateId];
  if (!template) {
    return { ok: false, reason: 'missing-template' };
  }

  if (term.op === 'count') {
    return { ok: true };
  }

  const hasMainControl = template.numericControls.some((control) => control.controlKey === term.controlKey);
  if (!hasMainControl) {
    return { ok: false, reason: 'missing-control' };
  }

  if (term.op === 'countIf') {
    const conditionKey = term.condition?.controlKey;
    const hasConditionControl = !!conditionKey
      && template.conditionControls.some((control) => control.controlKey === conditionKey);
    if (!hasConditionControl) {
      return { ok: false, reason: 'missing-control' };
    }
  }

  return { ok: true };
}
