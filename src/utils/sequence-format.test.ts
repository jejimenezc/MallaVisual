import { test } from 'vitest';
import assert from 'node:assert/strict';
import { formatSequenceCounter } from './sequence-format.ts';

test('formatSequenceCounter supports arabic, roman and alpha formats', () => {
  assert.equal(formatSequenceCounter(12, 'arabic'), '12');
  assert.equal(formatSequenceCounter(14, 'roman'), 'XIV');
  assert.equal(formatSequenceCounter(1, 'alpha-lower'), 'a');
  assert.equal(formatSequenceCounter(27, 'alpha-lower'), 'aa');
  assert.equal(formatSequenceCounter(28, 'alpha-upper'), 'AB');
});

test('formatSequenceCounter falls back to numeric string for invalid roman/alpha input', () => {
  assert.equal(formatSequenceCounter(0, 'roman'), '0');
  assert.equal(formatSequenceCounter(-1, 'alpha-lower'), '-1');
});

