import { describe, expect, test } from 'vitest';
import type { MetaCellConfig, MetricExprToken } from '../types/meta-panel.ts';
import { deriveExprFromTerms, evaluateMetricExpr } from './metrics-expr.ts';

const buildCell = (overrides: Partial<MetaCellConfig> = {}): MetaCellConfig => ({
  id: 'cell-1',
  terms: [
    { id: 't1', sign: 1, templateId: 'm1', controlKey: 'r0c0', op: 'sum' },
    { id: 't2', sign: -1, templateId: 'm1', controlKey: 'r0c0', op: 'count' },
  ],
  ...overrides,
});

describe('deriveExprFromTerms', () => {
  test('uses expr as-is when present', () => {
    const expr: MetricExprToken[] = [
      { type: 'term', termId: 'x' },
      { type: 'op', op: '*' },
      { type: 'const', value: 2 },
    ];
    expect(deriveExprFromTerms(buildCell({ expr }))).toEqual(expr);
  });

  test('derives infix expression from signed terms', () => {
    expect(deriveExprFromTerms(buildCell())).toEqual([
      { type: 'term', termId: 't1' },
      { type: 'op', op: '-' },
      { type: 'term', termId: 't2' },
    ]);
  });

  test('derives leading negative term as 0 - term', () => {
    const cell = buildCell({
      terms: [{ id: 't-neg', sign: -1, templateId: 'm1', controlKey: 'r0c0', op: 'sum' }],
    });
    expect(deriveExprFromTerms(cell)).toEqual([
      { type: 'const', value: 0 },
      { type: 'op', op: '-' },
      { type: 'term', termId: 't-neg' },
    ]);
  });
});

describe('evaluateMetricExpr', () => {
  test('supports operator precedence and parentheses', () => {
    const tokens: MetricExprToken[] = [
      { type: 'paren', paren: '(' },
      { type: 'term', termId: 'a' },
      { type: 'op', op: '+' },
      { type: 'term', termId: 'b' },
      { type: 'paren', paren: ')' },
      { type: 'op', op: '*' },
      { type: 'const', value: 2 },
    ];
    const result = evaluateMetricExpr(tokens, (termId) => (termId === 'a' ? 3 : 4));
    expect(result).toBe(14);
  });

  test('returns null on division by zero', () => {
    const tokens: MetricExprToken[] = [
      { type: 'const', value: 10 },
      { type: 'op', op: '/' },
      { type: 'const', value: 0 },
    ];
    expect(evaluateMetricExpr(tokens, () => 0)).toBeNull();
  });

  test('returns null on invalid expression', () => {
    const tokens: MetricExprToken[] = [
      { type: 'term', termId: 'a' },
      { type: 'op', op: '+' },
    ];
    expect(evaluateMetricExpr(tokens, () => 1)).toBeNull();
  });
});
