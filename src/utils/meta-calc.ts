import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import type { MetaCellConfig, MetaPanelRowConfig, TermConfig } from '../types/meta-panel.ts';
import type { MallaQuerySource } from './malla-queries.ts';
import { getColumnCells } from './malla-queries.ts';
import { resolveControlValue } from './piece-control-resolver.ts';
import { getCellConfigForColumn } from './malla-io.ts';
import { deriveExprFromTerms, evaluateMetricExpr } from './metrics-expr.ts';

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
  const hasExpr = Array.isArray(metaCellConfig.expr) && metaCellConfig.expr.length > 0;
  const exprTokens = hasExpr
    ? metaCellConfig.expr!
    : deriveExprFromTerms({ ...metaCellConfig, expr: undefined });
  if (exprTokens.length === 0) {
    return null;
  }

  const termsById = new Map<string, TermConfig>();
  for (const term of metaCellConfig.terms ?? []) {
    if (!termsById.has(term.id)) {
      termsById.set(term.id, term);
    }
  }
  const computedTermCache = new Map<string, number | null>();

  return evaluateMetricExpr(exprTokens, (termId) => {
    if (computedTermCache.has(termId)) {
      const cached = computedTermCache.get(termId);
      return cached == null ? Number.NaN : cached;
    }

    const term = termsById.get(termId);
    if (!term) {
      computedTermCache.set(termId, null);
      return Number.NaN;
    }

    const computed = computeTermForColumn(malla, colIndex, term, deps);
    computedTermCache.set(termId, computed);
    return computed == null ? Number.NaN : computed;
  });
}

export function computeMetaRowValueForColumn(
  malla: MallaQuerySource,
  colIndex: number,
  rowConfig: MetaPanelRowConfig,
  deps: MetaCalcDeps,
): number | null {
  const cellConfig = getCellConfigForColumn(rowConfig, colIndex);
  return computeMetaCellValueForColumn(malla, colIndex, cellConfig, deps);
}
