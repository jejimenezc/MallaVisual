import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import type { MetaCellConfig, TermConfig } from '../types/meta-panel.ts';
import type { MallaQuerySource } from './malla-queries.ts';
import { getColumnCells } from './malla-queries.ts';
import { resolveControlValue } from './piece-control-resolver.ts';

export interface MetaCalcDeps {
  valuesByPiece: Record<string, Record<string, string | number | boolean>>;
  resolveTemplateForPiece: (piece: CurricularPiece) => BlockTemplate | null;
}

const getPieceTemplateId = (piece: CurricularPiece): string | null => {
  if (piece.kind === 'ref') {
    return piece.ref.sourceId;
  }
  return piece.origin?.sourceId ?? null;
};

const toFiniteNumber = (value: string | number | boolean | null): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function computeTermForColumn(
  malla: MallaQuerySource,
  colIndex: number,
  term: TermConfig,
  deps: MetaCalcDeps,
): number | null {
  const columnEntries = getColumnCells(malla, colIndex);
  let matchedCount = 0;
  let numericSum = 0;
  let numericCount = 0;
  let countIfMatches = 0;

  for (const entry of columnEntries) {
    const piece = entry.content;
    const pieceTemplateId = getPieceTemplateId(piece);
    if (!pieceTemplateId || pieceTemplateId !== term.templateId) {
      continue;
    }

    matchedCount += 1;
    if (term.op === 'count') {
      continue;
    }

    const pieceTemplate = deps.resolveTemplateForPiece(piece);
    if (!pieceTemplate) {
      continue;
    }

    if (term.op === 'countIf') {
      if (!term.condition) {
        return null;
      }
      const conditionValue = resolveControlValue({
        piece,
        template: pieceTemplate,
        valuesByPiece: deps.valuesByPiece,
        controlKey: term.condition.controlKey,
      });
      if (conditionValue === term.condition.equals) {
        countIfMatches += 1;
      }
      continue;
    }

    const resolvedValue = resolveControlValue({
      piece,
      template: pieceTemplate,
      valuesByPiece: deps.valuesByPiece,
      controlKey: term.controlKey,
    });
    const numericValue = toFiniteNumber(resolvedValue);
    if (numericValue == null) {
      continue;
    }

    numericSum += numericValue;
    numericCount += 1;
  }

  if (term.op === 'count') {
    return matchedCount;
  }
  if (term.op === 'countIf') {
    return countIfMatches;
  }
  if (term.op === 'sum') {
    return numericCount > 0 ? numericSum : null;
  }
  if (term.op === 'avg') {
    return numericCount > 0 ? numericSum / numericCount : null;
  }
  return null;
}

export function computeMetaCellValueForColumn(
  malla: MallaQuerySource,
  colIndex: number,
  metaCellConfig: MetaCellConfig,
  deps: MetaCalcDeps,
): number | null {
  const terms = metaCellConfig.terms ?? [];
  if (terms.length === 0) {
    return null;
  }

  let total = 0;
  let validTermCount = 0;
  for (const term of terms) {
    const termValue = computeTermForColumn(malla, colIndex, term, deps);
    if (termValue == null) {
      continue;
    }
    total += term.sign * termValue;
    validTermCount += 1;
  }

  return validTermCount > 0 ? total : null;
}
