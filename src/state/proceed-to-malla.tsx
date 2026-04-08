import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { JSX } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfirm } from '../ui/confirm/ConfirmContext.tsx';
import { useToast } from '../ui/toast/ToastContext.tsx';

export type ProceedToMallaHandler = (targetPath?: string) => boolean;

interface ProceedToMallaContextValue {
  /** Handler disponible para los consumidores (pestañas) */
  handler: ProceedToMallaHandler;
  /** Permite superponer un handler temporal (por ejemplo, el editor) */
  setHandler: (fn?: ProceedToMallaHandler | null) => void;
  /** Restaura el handler por defecto del provider */
  resetHandler: () => void;
  /** Navegación por defecto hacia el destino solicitado */
  defaultProceedToMalla: ProceedToMallaHandler;
  /** Omite la verificación de bloque sucio en la próxima navegación */
  skipNextDirtyBlockCheck: () => void;
}

const ProceedToMallaContext = createContext<ProceedToMallaContextValue | undefined>(undefined);

const NO_PUBLISHED_BLOCK_ALERT_MESSAGE =
  'Para pasar al diseño de malla, publica al menos un bloque en el repositorio (desde el editor o importándolo).';
const PUBLISH_BLOCK_CONFIRM_MESSAGE =
  'Para pasar al diseño de malla, publica el bloque en el repositorio. ¿Deseas hacerlo ahora?';
const UPDATE_BLOCK_CONFIRM_MESSAGE =
  'Para pasar al diseño de malla, actualiza la publicación del bloque en el repositorio. ¿Deseas hacerlo ahora?';

interface ProceedToMallaProviderProps {
  children: React.ReactNode;
  hasDirtyBlock: boolean;
  hasPublishedBlock: boolean;
  hasPublishedRepositoryBlock: boolean;
}

export function getProceedToMallaCancelLabel(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/blocks')) {
    return 'Seguir en la pantalla actual';
  }
  if (pathname.startsWith('/block/')) {
    return 'Seguir editando';
  }
  return 'Seguir en la malla';
}

export function ProceedToMallaProvider({
  children,
  hasDirtyBlock,
  hasPublishedBlock,
  hasPublishedRepositoryBlock,
}: ProceedToMallaProviderProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const confirmAsync = useConfirm();
  const pushToast = useToast();
  const skipNextDirtyBlockCheckRef = React.useRef(false);
  const defaultProceedToMalla = useCallback<ProceedToMallaHandler>(
    (targetPath) => {
      void (async () => {
        const destination = targetPath ?? '/malla/design';
        if (destination === '/malla/design') {
          if (!hasPublishedRepositoryBlock) {
            pushToast(NO_PUBLISHED_BLOCK_ALERT_MESSAGE, 'info');
            return;
          }
          const shouldSkipDirtyCheck = skipNextDirtyBlockCheckRef.current;
          if (shouldSkipDirtyCheck) {
            skipNextDirtyBlockCheckRef.current = false;
          }
          if (hasDirtyBlock && !shouldSkipDirtyCheck) {
            const message = hasPublishedBlock
              ? UPDATE_BLOCK_CONFIRM_MESSAGE
              : PUBLISH_BLOCK_CONFIRM_MESSAGE;
            const confirmed = await confirmAsync({
              title: 'Publicar bloque antes de continuar',
              message,
              confirmLabel: 'Ir al editor de bloque',
              cancelLabel: getProceedToMallaCancelLabel(location.pathname),
              variant: 'info',
            });
            if (confirmed) {
              navigate('/block/design');
            }
            return;
          }
        }
        skipNextDirtyBlockCheckRef.current = false;
        navigate(destination);
      })();
      return true;
    },
    [confirmAsync, hasDirtyBlock, hasPublishedBlock, hasPublishedRepositoryBlock, location.pathname, navigate, pushToast],
  );

  const [overrideHandler, setOverrideHandler] =
    useState<ProceedToMallaHandler | null>(null);

  const handler = useCallback<ProceedToMallaHandler>(
    (targetPath) => {
      const fn = overrideHandler ?? defaultProceedToMalla;
      const result = fn(targetPath);
      return result !== false;
    },
    [overrideHandler, defaultProceedToMalla],
  );

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

  const skipNextDirtyBlockCheck = useCallback(() => {
    skipNextDirtyBlockCheckRef.current = true;
  }, []);

  const contextValue = useMemo<ProceedToMallaContextValue>(
    () => ({
      handler,
      setHandler,
      resetHandler,
      defaultProceedToMalla,
      skipNextDirtyBlockCheck,
    }),
    [handler, setHandler, resetHandler, defaultProceedToMalla, skipNextDirtyBlockCheck],
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
