import { describe, expect, test } from 'vitest';
import { MAX_HISTORY, pushHistoryEntry } from './history.ts';

describe('pushHistoryEntry', () => {
  test('no truncation', () => {
    const result = pushHistoryEntry({
      entries: ['a'],
      serialized: ['a'],
      index: 0,
      newEntry: 'b',
      newSerialized: 'b',
    });

    expect(result.entries).toEqual(['a', 'b']);
    expect(result.serialized).toEqual(['a', 'b']);
    expect(result.index).toBe(1);
  });

  test('forward truncation', () => {
    const result = pushHistoryEntry({
      entries: ['a', 'b', 'c'],
      serialized: ['a', 'b', 'c'],
      index: 1,
      newEntry: 'd',
      newSerialized: 'd',
      metadata: [null, null, null],
      newMetadata: null,
    });

    expect(result.entries).toEqual(['a', 'b', 'd']);
    expect(result.serialized).toEqual(['a', 'b', 'd']);
    expect(result.metadata).toEqual([null, null, null]);
    expect(result.index).toBe(2);
  });

  test('excess truncation', () => {
    const entries = Array.from({ length: MAX_HISTORY }, (_, idx) => `e${idx}`);
    const serialized = [...entries];
    const metadata = entries.map(() => null);

    const result = pushHistoryEntry({
      entries,
      serialized,
      index: MAX_HISTORY - 1,
      newEntry: 'overflow',
      newSerialized: 'overflow',
      metadata,
      newMetadata: null,
    });

    expect(result.entries).toHaveLength(MAX_HISTORY);
    expect(result.entries[0]).toBe('e1');
    expect(result.entries.at(-1)).toBe('overflow');
    expect(result.serialized).toHaveLength(MAX_HISTORY);
    expect(result.metadata).toHaveLength(MAX_HISTORY);
    expect(result.index).toBe(MAX_HISTORY - 1);
  });

  test('forward + excess truncation', () => {
    const entries = Array.from({ length: MAX_HISTORY + 2 }, (_, idx) => `e${idx}`);
    const serialized = [...entries];
    const metadata = entries.map(() => null);

    const result = pushHistoryEntry({
      entries,
      serialized,
      index: MAX_HISTORY - 1,
      newEntry: 'newest',
      newSerialized: 'newest',
      metadata,
      newMetadata: null,
    });

    expect(result.entries).toHaveLength(MAX_HISTORY);
    expect(result.entries[0]).toBe('e1');
    expect(result.entries.at(-1)).toBe('newest');
    expect(result.metadata).toHaveLength(MAX_HISTORY);
    expect(result.index).toBe(MAX_HISTORY - 1);
  });

  test('adjusts index after overflow', () => {
    const entries = Array.from({ length: MAX_HISTORY + 1 }, (_, idx) => `e${idx}`);
    const serialized = [...entries];

    const result = pushHistoryEntry({
      entries,
      serialized,
      index: MAX_HISTORY,
      newEntry: 'latest',
      newSerialized: 'latest',
    });

    expect(result.entries).toHaveLength(MAX_HISTORY);
    expect(result.entries.at(-1)).toBe('latest');
    expect(result.index).toBe(MAX_HISTORY - 1);
  });
});