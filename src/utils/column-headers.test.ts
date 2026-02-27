import { afterEach, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  cloneHeaderRow,
  createHeaderRow,
  ensureHeaderInvariants,
  getHeaderTextForColumn,
  normalizeColumnHeadersConfig,
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
});

test('cloneHeaderRow deep clones row and regenerates ids', () => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValueOnce('new-row-id').mockReturnValueOnce('new-override-id'),
  });

  const cloned = cloneHeaderRow({
    id: 'old-row',
    defaultText: 'General',
    columns: {
      2: { id: 'old-override', text: 'Periodo 3' },
    },
  });

  assert.notEqual(cloned.id, 'old-row');
  assert.equal(cloned.defaultText, 'General');
  assert.notEqual(cloned.columns?.[2]?.id, 'old-override');
  assert.notEqual(cloned.columns?.[2]?.id, cloned.id);
  assert.equal(cloned.columns?.[2]?.text, 'Periodo 3');
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
