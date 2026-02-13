import { describe, expect, test } from 'vitest';
import type { BlockTemplate, CurricularPieceRef } from '../types/curricular.ts';
import { resolveControlValue } from './piece-control-resolver.ts';

const piece: CurricularPieceRef = {
  kind: 'ref',
  id: 'piece-1',
  ref: {
    sourceId: 'master-1',
    bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, rows: 1, cols: 1 },
    aspect: '1/1',
  },
  x: 0,
  y: 0,
};

describe('resolveControlValue', () => {
  test('reads a simple number control value', () => {
    const template: BlockTemplate = [[{ active: true, type: 'number' }]];
    const result = resolveControlValue({
      piece,
      template,
      valuesByPiece: { [piece.id]: { r0c0: 42 } },
      controlKey: 'r0c0',
    });
    expect(result).toBe(42);
  });

  test('evaluates calculated controls with basic expression', () => {
    const template: BlockTemplate = [[
      { active: true, type: 'number' },
      { active: true, type: 'number' },
      { active: true, type: 'calculated', expression: 'r0c0 + r0c1' },
    ]];
    const result = resolveControlValue({
      piece,
      template,
      valuesByPiece: { [piece.id]: { r0c0: 10, r0c1: '5' } },
      controlKey: 'r0c2',
    });
    expect(result).toBe(15);
  });

  test('returns null when control key does not exist in template', () => {
    const template: BlockTemplate = [[{ active: true, type: 'text' }]];
    const result = resolveControlValue({
      piece,
      template,
      valuesByPiece: { [piece.id]: { r0c0: 'ok' } },
      controlKey: 'r1c0',
    });
    expect(result).toBeNull();
  });
});
