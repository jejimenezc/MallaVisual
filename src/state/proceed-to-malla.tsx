import React, { createContext, useContext, useState } from 'react';
import type { JSX } from 'react';

type ProceedToMallaHandler = (targetPath?: string) => void;

interface ProceedToMallaContextValue {
  handler: ProceedToMallaHandler | null;
  setHandler: (fn: ProceedToMallaHandler | null) => void;
}

const ProceedToMallaContext = createContext<ProceedToMallaContextValue | undefined>(undefined);

export function ProceedToMallaProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [handler, setHandler] = useState<ProceedToMallaHandler | null>(null);
  return (
    <ProceedToMallaContext.Provider value={{ handler, setHandler }}>
      {children}
    </ProceedToMallaContext.Provider>
  );
}

export function useProceedToMalla(): ProceedToMallaContextValue {
  const context = useContext(ProceedToMallaContext);
  if (!context) {
    throw new Error('useProceedToMalla must be used within a ProceedToMallaProvider');
  }
  return context;
}