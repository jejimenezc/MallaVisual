import { afterEach, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  applySequentialOverrides,
  cloneHeaderRow,
  createHeaderRow,
  ensureHeaderInvariants,
  getHeaderTextForColumn,
  isHeaderRowVisible,
  normalizeColumnHeadersConfig,
  rowHasAnyOverrides,
} from './column-headers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test('createHeaderRow creates empty row with id and empty columns', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValue('row-id-1'),
  });

  const row = createHeaderRow();
  assert.deepEqual(row, {
    id: 'row-id-1',
    defaultText: '',
    columns: {},
  });
  assert.equal(isHeaderRowVisible(row), true);
});

test('cloneHeaderRow deep clones row and regenerates ids', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValueOnce('new-row-id').mockReturnValueOnce('new-override-id'),
  });

  const cloned = cloneHeaderRow({
    id: 'old-row',
    defaultText: 'General',
    hidden: true,
    columns: {
      2: { id: 'old-override', text: 'Periodo 3' },
    },
  });

  assert.notEqual(cloned.id, 'old-row');
  assert.equal(cloned.defaultText, 'General');
  assert.notEqual(cloned.columns?.[2]?.id, 'old-override');
  assert.notEqual(cloned.columns?.[2]?.id, cloned.id);
  assert.equal(cloned.columns?.[2]?.text, 'Periodo 3');
  assert.equal(cloned.hidden, true);
});

test('ensureHeaderInvariants enforces min and max row constraints', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValue('generated-row-id'),
  });

  const emptyEnabled = ensureHeaderInvariants({
    enabled: true,
    rows: [],
  });
  assert.equal(emptyEnabled.rows.length, 1);
  assert.equal(emptyEnabled.rows[0]?.id, 'generated-row-id');

  const tooManyRows = ensureHeaderInvariants({
    enabled: false,
    rows: Array.from({ length: 7 }, (_, i) => ({
      id: `row-${i + 1}`,
      defaultText: '',
      columns: {},
    })),
  });
  assert.equal(tooManyRows.rows.length, 5);
});

test('getHeaderTextForColumn resolves overrides and falls back to default text', () => {
  const headers = normalizeColumnHeadersConfig({
    enabled: false,
    rows: [],
  });
  const row = {
    id: 'row-1',
    defaultText: 'General',
    columns: {
      1: { id: 'row-1-col-1', text: 'P2' },
    },
  };

  assert.equal(getHeaderTextForColumn(headers, row, 1), 'P2');
  assert.equal(getHeaderTextForColumn(headers, row, 3), 'General');
});

test('normalizeColumnHeadersConfig preserves hidden rows and defaults visibility', () => {
  const hiddenResult = normalizeColumnHeadersConfig({
    enabled: true,
    rows: [{ id: 'r1', defaultText: 'A', hidden: true }],
  });
  assert.equal(hiddenResult.rows[0]?.hidden, true);
  assert.equal(isHeaderRowVisible(hiddenResult.rows[0]!), false);

  const visibleResult = normalizeColumnHeadersConfig({
    enabled: true,
    rows: [{ id: 'r2', defaultText: 'B' }],
  });
  assert.equal(visibleResult.rows[0]?.hidden, undefined);
  assert.equal(isHeaderRowVisible(visibleResult.rows[0]!), true);
});

test('rowHasAnyOverrides detects only non-empty override texts', () => {
  assert.equal(
    rowHasAnyOverrides({
      id: 'r1',
      defaultText: 'General',
      columns: {
        0: { id: 'o1', text: '' },
        1: { id: 'o2', text: '  ' },
      },
    }),
    false,
  );

  assert.equal(
    rowHasAnyOverrides({
      id: 'r2',
      defaultText: 'General',
      columns: {
        0: { id: 'o1', text: '' },
        1: { id: 'o2', text: 'Periodo 2' },
      },
    }),
    true,
  );
});

test('applySequentialOverrides replaces row columns for every period and preserves existing ids', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValue('new-generated-id'),
  });

  const updated = applySequentialOverrides(
    {
      id: 'row-1',
      defaultText: 'General',
      columns: {
        1: { id: 'existing-col-1', text: 'Old P2' },
        9: { id: 'stale-col-9', text: 'Old P10' },
      },
    },
    3,
    (colIndex) => `Periodo ${colIndex + 1}`,
  );

  assert.deepEqual(updated.columns, {
    0: { id: 'new-generated-id', text: 'Periodo 1' },
    1: { id: 'existing-col-1', text: 'Periodo 2' },
    2: { id: 'new-generated-id', text: 'Periodo 3' },
  });
});
