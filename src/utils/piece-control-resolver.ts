import type { BlockTemplate, CurricularPiece } from '../types/curricular.ts';
import { evaluateExpression } from './calc.ts';

export interface ResolveControlValueArgs {
  piece: CurricularPiece;
  template: BlockTemplate;
  valuesByPiece: Record<string, Record<string, string | number | boolean>>;
  controlKey: string;
}

export const CONTROL_KEY_PATTERN = /^r(\d+)c(\d+)$/;

export function parseControlKey(controlKey: string): { rowIndex: number; colIndex: number } | null {
  const match = CONTROL_KEY_PATTERN.exec(controlKey);
  if (!match) return null;
  return {
    rowIndex: Number(match[1]),
    colIndex: Number(match[2]),
  };
}

function toFiniteNumber(value: string | number | boolean | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveControlValue({
  piece,
  template,
  valuesByPiece,
  controlKey,
}: ResolveControlValueArgs): string | number | boolean | null {
  const coord = parseControlKey(controlKey);
  if (!coord) return null;
  const cell = template[coord.rowIndex]?.[coord.colIndex];
  if (!cell || !cell.active) return null;

  const pieceValues = valuesByPiece[piece.id] ?? {};
  if (cell.type !== 'calculated') {
    return pieceValues[controlKey] ?? null;
  }

  const expression = typeof cell.expression === 'string' ? cell.expression.trim() : '';
  if (!expression) return null;

  const numericContext: Record<string, number | string> = {};
  for (let rowIndex = 0; rowIndex < template.length; rowIndex += 1) {
    const row = template[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const sourceCell = row[colIndex];
      if (!sourceCell?.active) continue;
      const key = `r${rowIndex}c${colIndex}`;
      const numericValue = toFiniteNumber(pieceValues[key]);
      if (numericValue != null) {
        numericContext[key] = numericValue;
      }
    }
  }

  const referencedTokens = Array.from(new Set(expression.match(/r\d+c\d+/g) ?? []));
  const hasMissingNumericReference = referencedTokens.some((token) => !(token in numericContext));
  if (hasMissingNumericReference) {
    return null;
  }

  const result = evaluateExpression(expression, numericContext);
  return Number.isFinite(result) ? result : null;
}
