// src/utils/calc.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { evaluateExpression } from './calc.ts';

test('evaluates basic arithmetic with parentheses', () => {
  const values = { r0c0: 2, r0c1: 3, r0c2: 4, r0c3: 1 };
  const result = evaluateExpression('r0c0 + r0c1 * (r0c2 - r0c3)', values);
  assert.equal(result, 11);
});

test('returns NaN on invalid expression', () => {
  const values = { r0c0: 2 };
  const result = evaluateExpression('r0c0 + unknown', values);
  assert.ok(Number.isNaN(result));
});

test('allows numeric literals in expressions', () => {
  const values = { r0c0: 4 };
  const result = evaluateExpression('r0c0 / 2 + 3.5', values);
  assert.equal(result, 5.5);
});