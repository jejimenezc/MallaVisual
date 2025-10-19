import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    commandsRef.current = commands;
  }, [commands]);

  const registerCommand = useCallback(
    (id: AppCommandId, descriptor: AppCommandDescriptor) => {
      setCommands((prev) => {
        const next = { ...prev, [id]: descriptor };
        commandsRef.current = next;
        return next;
      });
      return () => {
        setCommands((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          commandsRef.current = next;
          return next;
        });
      };
    },
    [],
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