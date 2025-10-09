// src/utils/block-io.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { exportBlock, importBlock } from './block-io.ts';
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import type { BlockMetadata } from '../types/block.ts';

test('export followed by import yields same block', () => {
  const template: BlockTemplate = [
    [{ active: true, label: 'A' }, { active: false }],
    [{ active: true, type: 'text', label: 'B' }, { active: true }],
  ];
  const visual: VisualTemplate = { '0-0': { backgroundColor: '#fff' } };
  const aspect: BlockAspect = '1/2';

  const metadata: BlockMetadata = {
    projectId: 'project',
    uuid: 'uuid-1',
    name: 'Nombre',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const json = exportBlock(template, visual, aspect, metadata);
  const result = importBlock(json);

  assert.deepEqual(result.template, template);
  assert.deepEqual(result.visual, visual);
  assert.equal(result.aspect, aspect);
  assert.deepEqual(result.metadata, metadata);
});