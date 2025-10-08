import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listBlocks,
  saveBlock,
  clearBlocks,
  renameBlock,
  updateBlockMetadata,
  type StoredBlock,
} from './block-repo.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './block-io.ts';

const STORAGE_KEY = 'block-repo';

describe('block-repo storage', () => {
  let storageData: Record<string, string>;
  let dispatchEventMock: ReturnType<typeof vi.fn>;
  let randomUUIDMock: ReturnType<typeof vi.fn>;

  const sampleExport: BlockExport = {
    version: BLOCK_SCHEMA_VERSION,
    template: [],
    visual: {},
    aspect: '1/1',
  };

  beforeEach(() => {
    storageData = {};
    dispatchEventMock = vi.fn();
    randomUUIDMock = vi.fn();
    let counter = 0;
    randomUUIDMock.mockImplementation(() => `uuid-${++counter}`);
    const mockStorage = {
      getItem: vi.fn((key: string) => storageData[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageData[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storageData[key];
      }),
    };
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal(
      'window',
      {
        localStorage: mockStorage,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: dispatchEventMock,
      } as unknown as Window,
    );
    if (typeof Event === 'undefined') {
      class MockEvent {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      }
      vi.stubGlobal('Event', MockEvent as unknown as typeof Event);
    }
    vi.stubGlobal('crypto', { randomUUID: randomUUIDMock });
    clearBlocks();
    dispatchEventMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('migrates legacy schema data into structured blocks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    storageData[STORAGE_KEY] = JSON.stringify({
      Legacy: sampleExport,
    });

    const blocks = listBlocks();

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.metadata.name).toBe('Legacy');
    expect(block.metadata.projectId).toBe('legacy');
    expect(block.metadata.updatedAt).toBe('2023-01-01T00:00:00.000Z');
    expect(block.id).toBe('legacy:uuid-1');
    expect(block.data).toEqual(sampleExport);
    expect(dispatchEventMock).toHaveBeenCalledTimes(1);

    const persisted = JSON.parse(storageData[STORAGE_KEY]);
    expect(persisted[block.id]).toBeDefined();
    expect(persisted[block.id].metadata.name).toBe('Legacy');
  });

  it('preserves metadata when saving and updating blocks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-02-01T00:00:00.000Z'));
    const baseBlock: StoredBlock = {
      id: 'project:uuid-base',
      metadata: {
        projectId: 'project',
        name: 'Initial',
        updatedAt: new Date().toISOString(),
      },
      data: sampleExport,
    };

    saveBlock(baseBlock);
    let stored = listBlocks();
    expect(stored).toHaveLength(1);
    expect(stored[0].metadata).toEqual(baseBlock.metadata);

    vi.setSystemTime(new Date('2023-02-02T00:00:00.000Z'));
    renameBlock(baseBlock.id, 'Renamed');
    stored = listBlocks();
    expect(stored[0].metadata.name).toBe('Renamed');
    expect(stored[0].metadata.updatedAt).toBe('2023-02-02T00:00:00.000Z');

    vi.setSystemTime(new Date('2023-02-03T00:00:00.000Z'));
    updateBlockMetadata(baseBlock.id, { projectId: 'other-project' });
    stored = listBlocks();
    expect(stored[0].metadata.projectId).toBe('other-project');
    expect(stored[0].metadata.updatedAt).toBe('2023-02-02T00:00:00.000Z');
  });
});