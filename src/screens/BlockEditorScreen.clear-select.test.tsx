import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultProjectTheme } from '../utils/malla-io.ts';
import type { BlockTemplate } from '../types/curricular.ts';
import { coordKey } from '../types/visual.ts';
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
const onRequestControlDataClear = vi.fn();

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
  Header: ({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) => (
    <header>
      <span>{title}</span>
      <div>{left}</div>
      <div>{right}</div>
    </header>
  ),
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

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const recordedDrafts: BlockContent[] = [];
const commandsHistory: Partial<Record<AppCommandId, AppCommandDescriptor>>[] = [];

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

  listBlocksMock.mockReturnValue([]);
  loadProjectMock.mockReturnValue(null);
  recordedDrafts.length = 0;
  commandsHistory.length = 0;
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

function CommandsObserver(): null {
  const { commands } = useAppCommands();
  useEffect(() => {
    commandsHistory.push({ ...commands });
  }, [commands]);
  return null;
}

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

test('limpiar el select elimina conditionalBg y mantiene undo/redo registrados una sola vez', async () => {
  const selectCoord = { row: 0, col: 0 } as const;
  const textCoord = { row: 0, col: 1 } as const;
  const template: BlockTemplate = [
    [
      { active: true, type: 'select', label: 'Origen', dropdownOptions: ['A', 'B'] },
      { active: true, type: 'text', label: 'Descripción', placeholder: '' },
    ],
    [
      { active: false },
      { active: false },
    ],
  ];

  const initialData: BlockExport = {
    version: BLOCK_SCHEMA_VERSION,
    template,
    aspect: '1/1',
    visual: {
      [coordKey(textCoord.row, textCoord.col)]: {
        conditionalBg: {
          selectSource: {
            controlName: 'Origen',
            coord: coordKey(selectCoord.row, selectCoord.col),
            colors: { A: '#ff0000', B: '#00ff00' },
          },
        },
      },
    },
    theme: createDefaultProjectTheme(),
  };

  const controlsInUse = new Map<string, ReadonlySet<string>>([
    ['repo-1', new Set([coordKey(selectCoord.row, selectCoord.col)])],
  ]);

  await act(async () => {
    root.render(
      <AppCommandsProvider>
        <CommandsObserver />
        <ToastProvider>
          <ConfirmProvider>
            <BlockEditorScreen
              initialData={initialData}
              initialRepoId="repo-1"
              controlsInUse={controlsInUse}
              onRequestControlDataClear={onRequestControlDataClear}
              onDraftChange={(draft: BlockContent) => {
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
  expect(recordedDrafts.length).toBeGreaterThan(0);

  const textKey = coordKey(textCoord.row, textCoord.col);
  const initialDraft = recordedDrafts.at(-1);
  expect(initialDraft?.visual[textKey]?.conditionalBg?.selectSource).toBeDefined();

  const selectCell = container.querySelector<HTMLDivElement>(`[data-label="Origen"]`);
  expect(selectCell).not.toBeNull();

  await act(async () => {
    selectCell?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 5 }),
    );
  });

  const clearOption = container.querySelector<HTMLDivElement>('[title="Borrar campo"]');
  expect(clearOption).not.toBeNull();

  await act(async () => {
    clearOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await flushEffects();

  // Verify modal appears
  const modalMessage = document.querySelector('.confirm-modal-message');
  expect(modalMessage).not.toBeNull();
  expect(modalMessage?.textContent).toBe(
    'Este control tiene datos ingresados en la malla. Si lo eliminas, se perderán. ¿Deseas continuar?'
  );

  // Click confirm
  const confirmBtn = document.querySelector<HTMLButtonElement>('.confirm-modal-confirm');
  expect(confirmBtn).not.toBeNull();

  await act(async () => {
    confirmBtn?.click();
  });

  await flushEffects();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await flushEffects();

  const finalDraft = recordedDrafts.at(-1);
  expect(finalDraft).toBeDefined();
  expect(finalDraft?.visual[textKey]?.conditionalBg?.selectSource).toBeUndefined();

  const latestCommands = commandsHistory.at(-1) ?? {};
  const commandKeys = Object.keys(latestCommands).sort();
  expect(commandKeys).toEqual(['redo', 'undo']);
  const hasDuplicateCommands = commandsHistory.some(
    (snapshot) => Object.keys(snapshot).length > 2,
  );
  expect(hasDuplicateCommands).toBe(false);
});

test('reemplazar el tipo de un control en uso limpia datos y estilos asociados tras confirmar', async () => {
  const selectCoord = { row: 0, col: 0 } as const;
  const textCoord = { row: 0, col: 1 } as const;
  const template: BlockTemplate = [
    [
      { active: true, type: 'select', label: 'Origen', dropdownOptions: ['A', 'B'] },
      { active: true, type: 'text', label: 'Descripción', placeholder: '' },
    ],
    [
      { active: false },
      { active: false },
    ],
  ];

  const initialData: BlockExport = {
    version: BLOCK_SCHEMA_VERSION,
    template,
    aspect: '1/1',
    visual: {
      [coordKey(textCoord.row, textCoord.col)]: {
        conditionalBg: {
          selectSource: {
            controlName: 'Origen',
            coord: coordKey(selectCoord.row, selectCoord.col),
            colors: { A: '#ff0000', B: '#00ff00' },
          },
        },
      },
    },
    theme: createDefaultProjectTheme(),
  };

  const controlsInUse = new Map<string, ReadonlySet<string>>([
    ['repo-1', new Set([coordKey(selectCoord.row, selectCoord.col)])],
  ]);

  await act(async () => {
    root.render(
      <AppCommandsProvider>
        <CommandsObserver />
        <ToastProvider>
          <ConfirmProvider>
            <BlockEditorScreen
              initialData={initialData}
              initialRepoId="repo-1"
              controlsInUse={controlsInUse}
              onRequestControlDataClear={onRequestControlDataClear}
              onDraftChange={(draft: BlockContent) => {
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
  expect(recordedDrafts.length).toBeGreaterThan(0);

  const selectCell = container.querySelector<HTMLDivElement>(`[data-label="Origen"]`);
  expect(selectCell).not.toBeNull();

  await act(async () => {
    selectCell?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 5 }),
    );
  });

  const replaceOption = container.querySelector<HTMLDivElement>('[title="Texto libre"]');
  expect(replaceOption).not.toBeNull();

  await act(async () => {
    replaceOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  await flushEffects();

  // Verify modal appears
  const modalMessage = document.querySelector('.confirm-modal-message');
  expect(modalMessage).not.toBeNull();
  expect(modalMessage?.textContent).toBe(
    'Este control tiene datos ingresados en la malla. Si lo reemplazas, se perderán. ¿Deseas continuar?'
  );

  // Click confirm
  const confirmBtn = document.querySelector<HTMLButtonElement>('.confirm-modal-confirm');
  expect(confirmBtn).not.toBeNull();

  await act(async () => {
    confirmBtn?.click();
  });

  await flushEffects();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await flushEffects();

  const textKey = coordKey(textCoord.row, textCoord.col);
  const finalDraft = recordedDrafts.at(-1);
  expect(finalDraft).toBeDefined();
  expect(finalDraft?.visual[textKey]).toBeUndefined();

  const controlKey = coordKey(selectCoord.row, selectCoord.col);
  expect(onRequestControlDataClear).toHaveBeenCalledWith(controlKey);

  const updatedCell = finalDraft?.template[selectCoord.row]?.[selectCoord.col];
  expect(updatedCell?.type).toBe('text');
});