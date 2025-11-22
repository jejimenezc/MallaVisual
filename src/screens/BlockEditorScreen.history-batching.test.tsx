import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createDefaultProjectTheme } from '../utils/malla-io.ts';
import type { BlockTemplate } from '../types/curricular.ts';
import { coordKey, type VisualTemplate } from '../types/visual.ts';
import { BlockEditorScreen } from './BlockEditorScreen.tsx';
import type { BlockExport } from '../utils/block-io.ts';
import { BLOCK_SCHEMA_VERSION } from '../utils/block-io.ts';
import type { BlockContent } from '../utils/block-content.ts';
import type { AppCommandDescriptor, AppCommandId } from '../state/app-commands.tsx';
import { AppCommandsProvider, useAppCommands } from '../state/app-commands.tsx';
import { ToastProvider } from '../components/ui/ToastContext.tsx';
import { ConfirmProvider } from '../components/ui/ConfirmContext.tsx';

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

vi.mock('../components/Header', () => ({
  Header: ({ title }: { title: string }) => <header>{title}</header>,
}));

vi.mock('../components/Button', () => ({
  Button: ({ onClick, children }: { onClick?: () => void; children?: React.ReactNode }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../layout/TwoPaneLayout', () => ({
  TwoPaneLayout: ({ header, left, right }: { header: React.ReactNode; left: React.ReactNode; right: React.ReactNode }) => (
    <div>
      <div>{header}</div>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  ),
}));

const formatPanelUpdateRef: {
  current: ((
    next: React.SetStateAction<VisualTemplate>,
    meta?: { historyBatchId?: string },
  ) => void) | null
} = { current: null };

vi.mock('../components/FormatStylePanel', () => ({
  FormatStylePanel: ({ onUpdateVisual }: { onUpdateVisual: (next: any, meta?: any) => void }) => {
    useEffect(() => {
      formatPanelUpdateRef.current = onUpdateVisual;
      return () => {
        if (formatPanelUpdateRef.current === onUpdateVisual) {
          formatPanelUpdateRef.current = null;
        }
      };
    }, [onUpdateVisual]);
    return null;
  },
}));

const commandsHistory: Partial<Record<AppCommandId, AppCommandDescriptor>>[] = [];
let executeCommandRef: ((id: AppCommandId) => void) | null = null;

function CommandsObserver(): null {
  const { commands, executeCommand } = useAppCommands();
  useEffect(() => {
    commandsHistory.push({ ...commands });
  }, [commands]);
  useEffect(() => {
    executeCommandRef = executeCommand;
    return () => {
      if (executeCommandRef === executeCommand) {
        executeCommandRef = null;
      }
    };
  }, [executeCommand]);
  return null;
}

describe('BlockEditorScreen – batching de historial para color pickers', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const recordedDrafts: BlockContent[] = [];
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

    commandsHistory.length = 0;
    recordedDrafts.length = 0;
    executeCommandRef = null;
    formatPanelUpdateRef.current = null;

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

  const flushEffects = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  test('un solo undo revierte cambios agrupados por historyBatchId', async () => {
    const template: BlockTemplate = [[{ active: true, type: 'text', label: 'Campo', placeholder: '' }]];
    const cellKey = coordKey(0, 0);
    const initialVisualColor = '#336699';
    const initialData: BlockExport = {
      version: BLOCK_SCHEMA_VERSION,
      template,
      aspect: '1/1',
      visual: {
        [cellKey]: {
          backgroundColor: initialVisualColor,
        },
      },
    };

    await act(async () => {
      root.render(
        <AppCommandsProvider>
          <CommandsObserver />
          <ToastProvider>
            <ConfirmProvider>
              <BlockEditorScreen
                initialData={initialData}
                initialMode="view"
                onDraftChange={(draft) => {
                  recordedDrafts.push(draft);
                }}
              />
            </ConfirmProvider>
          </ToastProvider>
        </AppCommandsProvider>,
      );
      await Promise.resolve();
    });

    await flushEffects();

    expect(formatPanelUpdateRef.current).not.toBeNull();

    const nextColorA = '#123456';
    const nextColorB = '#abcdef';
    const batchId = 'batch-color';

    await act(async () => {
      formatPanelUpdateRef.current?.((prev: VisualTemplate) => ({
        ...(prev ?? {}),
        [cellKey]: {
          ...((prev ?? {})[cellKey] ?? {}),
          backgroundColor: nextColorA,
        },
      }),
        { historyBatchId: batchId },
      );
    });

    await flushEffects();

    await act(async () => {
      formatPanelUpdateRef.current?.((prev: VisualTemplate) => ({
        ...(prev ?? {}),
        [cellKey]: {
          ...((prev ?? {})[cellKey] ?? {}),
          backgroundColor: nextColorB,
        },
      }),
        { historyBatchId: batchId },
      );
    });

    await flushEffects();

    const latestDraft = recordedDrafts.at(-1);
    expect(latestDraft?.visual[cellKey]?.backgroundColor).toBe(nextColorB);

    expect(executeCommandRef).not.toBeNull();
    await act(async () => {
      executeCommandRef?.('undo');
    });

    await flushEffects();

    const draftAfterUndo = recordedDrafts.at(-1);
    expect(draftAfterUndo?.visual[cellKey]?.backgroundColor).toBe(initialVisualColor);
  });
});