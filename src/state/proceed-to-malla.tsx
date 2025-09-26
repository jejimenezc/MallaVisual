import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';

export type ProceedToMallaHandler = (targetPath?: string) => void;

interface ProceedToMallaContextValue {
  /** Handler disponible para los consumidores (pestañas) */
  handler: ProceedToMallaHandler;
  /** Permite superponer un handler temporal (por ejemplo, el editor) */
  setHandler: (fn?: ProceedToMallaHandler | null) => void;
  /** Restaura el handler por defecto del provider */
  resetHandler: () => void;
  /** Navegación por defecto hacia el destino solicitado */
  defaultProceedToMalla: ProceedToMallaHandler;
}

const ProceedToMallaContext = createContext<ProceedToMallaContextValue | undefined>(undefined);

const EMPTY_BLOCK_CONFIRM_MESSAGE =
  'Para pasar al diseño de malla, publica el borrador en el repositorio. ¿Deseas hacerlo ahora?';

interface ProceedToMallaProviderProps {
  children: React.ReactNode;
  hasCurrentProject: boolean;
  hasPublishedBlock: boolean;
}

export function ProceedToMallaProvider({
  children,
  hasCurrentProject,
  hasPublishedBlock,
}: ProceedToMallaProviderProps): JSX.Element {
  const navigate = useNavigate();
  const defaultProceedToMalla = useCallback<ProceedToMallaHandler>(
    (targetPath) => {
      const destination = targetPath ?? '/malla/design';
      if (destination === '/malla/design') {
        if (!hasCurrentProject && !hasPublishedBlock) {
          window.confirm(EMPTY_BLOCK_CONFIRM_MESSAGE);
          return;
        }
      }
      navigate(destination);
    },
    [hasCurrentProject, hasPublishedBlock, navigate],
  );

  const [overrideHandler, setOverrideHandler] = useState<ProceedToMallaHandler | null>(null);

  const handler = overrideHandler ?? defaultProceedToMalla;

  const setHandler = useCallback((fn?: ProceedToMallaHandler | null) => {
    if (!fn) {
      setOverrideHandler(null);
      return;
    }
    setOverrideHandler(() => fn);
  }, []);

  const resetHandler = useCallback(() => {
    setOverrideHandler(null);
  }, []);

  const contextValue = useMemo<ProceedToMallaContextValue>(
    () => ({
      handler,
      setHandler,
      resetHandler,
      defaultProceedToMalla,
    }),
    [handler, setHandler, resetHandler, defaultProceedToMalla],
  );

  return (
    <ProceedToMallaContext.Provider value={contextValue}>
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