
import { act } from 'react';
import { describe, expect, test, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import {
  AppCommandsProvider,
  useAppCommands,
  type AppCommandDescriptor,
} from './app-commands.tsx';

type AppCommandsContextValue = ReturnType<typeof useAppCommands>;

describe('AppCommandsProvider registerCommand', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let registerCommand: AppCommandsContextValue['registerCommand'];
  let renderCount: number;
  let lastCommands: AppCommandsContextValue['commands'];
  let snapshots: AppCommandsContextValue['commands'][];

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });

  function Consumer({ onUpdate }: { onUpdate: (context: AppCommandsContextValue) => void }): null {
    renderCount += 1;
    const context = useAppCommands();
    onUpdate(context);
    return null;
  }

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    renderCount = 0;
    lastCommands = {};
    snapshots = [];

    const handleUpdate = (context: AppCommandsContextValue) => {
      registerCommand = context.registerCommand;
      lastCommands = context.commands;
      snapshots.push(context.commands);
    };

    await act(async () => {
      root.render(
        <AppCommandsProvider>
          <Consumer onUpdate={handleUpdate} />
        </AppCommandsProvider>,
      );
      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
  });

  test('registering the same descriptor twice does not re-render or duplicate the command', async () => {
    const run = () => {};
    const firstDescriptor: AppCommandDescriptor = { run, isEnabled: true };
    const secondDescriptor: AppCommandDescriptor = { run, isEnabled: true };

    expect(typeof registerCommand).toBe('function');
    const initialRenderCount = renderCount;

    let cleanupFirst = () => {};
    await act(async () => {
      cleanupFirst = registerCommand('undo', firstDescriptor);
      await Promise.resolve();
    });
    await Promise.resolve();

    const afterFirstRegister = renderCount;
    expect(afterFirstRegister).toBeGreaterThan(initialRenderCount);
    const commandsAfterFirst = snapshots.at(-1) ?? {};
    expect(commandsAfterFirst.undo).toBe(firstDescriptor);
    const commandCountAfterFirst = Object.keys(commandsAfterFirst).length;

    let cleanupSecond = () => {};
    await act(async () => {
      cleanupSecond = registerCommand('undo', secondDescriptor);
      await Promise.resolve();
    });
    await Promise.resolve();

    const commandsAfterSecond = snapshots.at(-1) ?? {};
    expect(Object.keys(commandsAfterSecond).length).toBe(commandCountAfterFirst);
    expect(commandsAfterSecond.undo).toBe(firstDescriptor);
    expect(commandsAfterSecond).toBe(commandsAfterFirst);
    expect(renderCount).toBe(afterFirstRegister);

    await act(async () => {
      cleanupSecond();
      await Promise.resolve();
    });
    await Promise.resolve();

    const commandsAfterSecondCleanup = snapshots.at(-1) ?? {};
    expect(Object.keys(commandsAfterSecondCleanup).length).toBe(commandCountAfterFirst);
    expect(commandsAfterSecondCleanup.undo).toBe(firstDescriptor);
    expect(renderCount).toBe(afterFirstRegister);

    await act(async () => {
      cleanupFirst();
      await Promise.resolve();
    });
    await Promise.resolve();

    const commandsAfterFirstCleanup = snapshots.at(-1) ?? {};
    expect(Object.keys(commandsAfterFirstCleanup).length).toBe(commandCountAfterFirst - 1);
    expect(commandsAfterFirstCleanup.undo).toBeUndefined();
    expect(renderCount).toBe(afterFirstRegister + 1);
  });

  test('cleaning up a missing command is a no-op', async () => {
    const descriptor: AppCommandDescriptor = {
      run: () => {},
      isEnabled: true,
    };

    let cleanup = () => {};
    await act(async () => {
      cleanup = registerCommand('redo', descriptor);
      await Promise.resolve();
    });
    await Promise.resolve();

    const renderAfterRegister = renderCount;
    const commandCountAfterRegister = Object.keys(lastCommands).length;
    expect(commandCountAfterRegister).toBeGreaterThan(0);

    await act(async () => {
      cleanup();
      await Promise.resolve();
    });
    await Promise.resolve();

    const commandsAfterCleanup = snapshots.at(-1) ?? {};
    expect(Object.keys(commandsAfterCleanup).length).toBe(commandCountAfterRegister - 1);
    expect(commandsAfterCleanup.redo).toBeUndefined();
    expect(renderCount).toBe(renderAfterRegister + 1);

    await act(async () => {
      cleanup();
      await Promise.resolve();
    });
    await Promise.resolve();

    const commandsAfterSecondCleanup = snapshots.at(-1) ?? {};
    expect(Object.keys(commandsAfterSecondCleanup).length).toBe(commandCountAfterRegister - 1);
    expect(commandsAfterSecondCleanup.redo).toBeUndefined();
    expect(renderCount).toBe(renderAfterRegister + 1);
  });
});