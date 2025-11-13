import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { JSX } from 'react';

export type AppCommandId = 'undo' | 'redo';

export interface AppCommandDescriptor {
  run: () => void;
  isEnabled: boolean;
}

interface AppCommandsContextValue {
  registerCommand: (id: AppCommandId, descriptor: AppCommandDescriptor) => () => void;
  executeCommand: (id: AppCommandId) => void;
  commands: Partial<Record<AppCommandId, AppCommandDescriptor>>;
}

const AppCommandsContext = createContext<AppCommandsContextValue | undefined>(undefined);

export function AppCommandsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [commands, setCommands] = useState<Partial<Record<AppCommandId, AppCommandDescriptor>>>({});
  const commandsRef = useRef(commands);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tag)) return true;
      if (target.isContentEditable) return true;
      return Boolean(target.closest('input,textarea,select,button,[contenteditable]'));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isInteractiveElement(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.shiftKey) {
          if (commandsRef.current.redo?.isEnabled) {
            commandsRef.current.redo?.run();
          }
        } else if (commandsRef.current.undo?.isEnabled) {
          commandsRef.current.undo?.run();
        }
      } else if (key === 'y') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (commandsRef.current.redo?.isEnabled) {
          commandsRef.current.redo?.run();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const removeCommand = useCallback((id: AppCommandId) => {
    if (!commandsRef.current[id]) return;
    setCommands((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      commandsRef.current = next;
      return next;
    });
  }, []);

  const registerCommand = useCallback(
    (id: AppCommandId, descriptor: AppCommandDescriptor) => {
      const current = commandsRef.current[id];
      if (
        current &&
        (current === descriptor ||
          (current.isEnabled === descriptor.isEnabled && current.run === descriptor.run))
      ) {
        return () => {};
      }

      let didRegister = false;
      setCommands((prev) => {
        const previous = prev[id];
        if (
          previous &&
          (previous === descriptor ||
            (previous.isEnabled === descriptor.isEnabled && previous.run === descriptor.run))
        ) {
          return prev;
        }

        didRegister = true;
        const next = { ...prev, [id]: descriptor };
        commandsRef.current = next;
        return next;
      });

      if (!didRegister) {
        return () => {};
      }

      return () => removeCommand(id);
    },
    [removeCommand],
  );

  const executeCommand = useCallback((id: AppCommandId) => {
    const command = commandsRef.current[id];
    if (command && command.isEnabled) {
      command.run();
    }
  }, []);

  const contextValue = useMemo<AppCommandsContextValue>(
    () => ({ registerCommand, executeCommand, commands }),
    [commands, executeCommand, registerCommand],
  );

  return <AppCommandsContext.Provider value={contextValue}>{children}</AppCommandsContext.Provider>;
}

export function useAppCommands(): AppCommandsContextValue {
  const context = useContext(AppCommandsContext);
  if (!context) {
    throw new Error('useAppCommands must be used within an AppCommandsProvider');
  }
  return context;
}

export function useAppCommand(
  id: AppCommandId,
  handler: (() => void) | null | undefined,
  isEnabled: boolean,
): void {
  const { registerCommand } = useAppCommands();
  useEffect(() => {
    if (!handler) return undefined;
    return registerCommand(id, { run: handler, isEnabled });
  }, [handler, id, isEnabled, registerCommand]);
}