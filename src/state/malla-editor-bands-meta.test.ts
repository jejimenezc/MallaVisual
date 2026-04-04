import assert from 'node:assert/strict';
import { test } from 'vitest';
import { cloneMetaRowWithNewIds } from './malla-editor-bands-meta.ts';

test('cloneMetaRowWithNewIds remaps expr term ids when duplicating a metric row', () => {
  const sourceRow = {
    id: 'row-a',
    label: 'Métrica original',
    defaultCell: {
      id: 'cell-a',
      terms: [
        {
          id: 'term-1',
          sign: 1 as const,
          templateId: 'master-a',
          controlKey: 'r0c0',
          op: 'sum' as const,
        },
      ],
      expr: [
        { type: 'term' as const, termId: 'term-1' },
        { type: 'op' as const, op: '*' as const },
        { type: 'const' as const, value: 2 },
      ],
    },
    columns: {},
  };

  const clonedRow = cloneMetaRowWithNewIds(sourceRow);
  const clonedTermId = clonedRow.defaultCell.terms[0]?.id;
  const exprTermToken = clonedRow.defaultCell.expr?.find((token) => token.type === 'term');

  assert.ok(clonedTermId);
  assert.notEqual(clonedTermId, 'term-1');
  assert.equal(exprTermToken?.type, 'term');
  if (exprTermToken?.type === 'term') {
    assert.equal(exprTermToken.termId, clonedTermId);
  }
});
