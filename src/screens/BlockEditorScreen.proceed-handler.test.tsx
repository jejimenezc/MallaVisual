
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';

const autoSaveMock = vi.fn();
const flushAutoSaveMock = vi.fn();
const loadProjectMock = vi.fn();
const saveBlockMock = vi.fn();
const listBlocksMock = vi.fn();
const updateBlockMetadataMock = vi.fn();
const setProceedHandlerMock = vi.fn();
const resetProceedHandlerMock = vi.fn();
const defaultProceedMock = vi.fn();
const skipNextDirtyCheckMock = vi.fn();

vi.mock('../core/persistence/hooks.ts', () => ({
  useProject: () => ({
    autoSave: autoSaveMock,
    flushAutoSave: flushAutoSaveMock,
    loadProject: loadProjectMock,
  }),
  useBlocksRepo: () => ({
    saveBlock: saveBlockMock,
    listBlocks: listBlocksMock,
    updateBlockMetadata: updateBlockMetadataMock,
  }),
}));

vi.mock('../state/proceed-to-malla', () => ({
  useProceedToMalla: () => ({
    setHandler: setProceedHandlerMock,
    resetHandler: resetProceedHandlerMock,
    defaultProceedToMalla: defaultProceedMock,
    skipNextDirtyBlockCheck: skipNextDirtyCheckMock,
  }),
}));

vi.mock('../components/ContextSidebarPanel', () => ({
  ContextSidebarPanel: () => null,
}));

vi.mock('../components/BlockTemplateViewer', () => ({
  BlockTemplateViewer: () => null,
}));

vi.mock('../components/FormatStylePanel', () => ({
  FormatStylePanel: () => null,
}));

vi.mock('../components/Header', () => ({
  Header: () => null,
}));

vi.mock('../components/Button', () => ({
  Button: () => null,
}));

vi.mock('../layout/TwoPaneLayout', () => ({
  TwoPaneLayout: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  ),
}));

const deleteControlSpy = vi.fn();

vi.mock('../components/BlockTemplateEditor', () => ({
  BlockTemplateEditor: ({
    onConfirmDeleteControl,
    onControlDeleted,
  }: {
    onConfirmDeleteControl: (coord: string) => boolean;
    onControlDeleted: (coord: string) => void;
  }) => {
    useEffect(() => {
      const coord = 'r0c0';
      deleteControlSpy();
      if (onConfirmDeleteControl(coord)) {
        onControlDeleted(coord);
      }
    }, [onConfirmDeleteControl, onControlDeleted]);
    return null;
  },
}));

import { BlockEditorScreen } from './BlockEditorScreen.tsx';
import type { BlockTemplate } from '../types/curricular.ts';
import type { BlockExport } from '../utils/block-io.ts';
import { BLOCK_SCHEMA_VERSION } from '../utils/block-io.ts';
import { coordKey } from '../types/visual.ts';
import { AppCommandsProvider } from '../state/app-commands.tsx';

describe('BlockEditorScreen – eliminación de control con datos', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const onRequestControlDataClear = vi.fn();
  let confirmSpy: MockInstance<typeof window.confirm>;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    autoSaveMock.mockReset();
    flushAutoSaveMock.mockReset();
    loadProjectMock.mockReset();
    saveBlockMock.mockReset();
    listBlocksMock.mockReset();
    updateBlockMetadataMock.mockReset();
    setProceedHandlerMock.mockReset();
    resetProceedHandlerMock.mockReset();
    defaultProceedMock.mockReset();
    skipNextDirtyCheckMock.mockReset();
    onRequestControlDataClear.mockReset();
    deleteControlSpy.mockReset();

    listBlocksMock.mockReturnValue([]);
    loadProjectMock.mockReturnValue(null);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(async () => {
    confirmSpy.mockRestore();
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test('no re-registra el handler al borrar un control en uso', async () => {
    const template: BlockTemplate = [
      [
        { active: true, type: 'text', label: 'Control', placeholder: '' },
      ],
    ];
    const initialData: BlockExport = {
      version: BLOCK_SCHEMA_VERSION,
      template,
      aspect: '1/1',
      visual: {},
    };

    const controlsInUse = new Map<string, ReadonlySet<string>>([
      ['repo-1', new Set([coordKey(0, 0)])],
    ]);

    await act(async () => {
      root.render(
        <AppCommandsProvider>
          <BlockEditorScreen
            initialData={initialData}
            initialRepoId="repo-1"
            onRequestControlDataClear={onRequestControlDataClear}
            controlsInUse={controlsInUse}
          />
        </AppCommandsProvider>,
      );
      await Promise.resolve();
    });

    const handlerRegistrations = setProceedHandlerMock.mock.calls.length;

    await act(async () => {
      await Promise.resolve();
    });

    expect(deleteControlSpy).toHaveBeenCalledTimes(1);
    expect(onRequestControlDataClear).toHaveBeenCalledWith('r0c0');
    expect(handlerRegistrations).toBeGreaterThan(0);
    expect(setProceedHandlerMock).toHaveBeenCalledTimes(handlerRegistrations);
    expect(resetProceedHandlerMock.mock.calls.length).toBeLessThanOrEqual(
      handlerRegistrations,
    );
  });
});