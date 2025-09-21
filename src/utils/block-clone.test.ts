// src/utils/block-clone.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { duplicateBlock } from './block-clone.ts';
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate } from '../types/visual.ts';

test('duplicateBlock creates independent copy', () => {
  const template: BlockTemplate = [[{ active: true, label: 'A' }]];
  const visual: VisualTemplate = { '0-0': { backgroundColor: 'red' } };
  const original = { template, visual, aspect: '1/1' as const };
  const cloned = duplicateBlock(original);

  // mutate original
  template[0][0].label = 'B';
  visual['0-0']!.backgroundColor = 'blue';

  assert.equal(cloned.template[0][0].label, 'A');
  assert.equal(cloned.visual['0-0']!.backgroundColor, 'red');
  assert.equal(cloned.aspect, '1/1');
});