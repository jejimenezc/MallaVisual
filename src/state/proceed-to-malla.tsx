import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/ToastContext';
import { useConfirm } from '../components/ui/ConfirmContext';

export type ProceedToMallaHandler = (targetPath?: string) => Promise<boolean>;

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

export function ProceedToMallaProvider({
  children,
  hasDirtyBlock,
  hasPublishedBlock,
  hasPublishedRepositoryBlock,
}: ProceedToMallaProviderProps): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const skipNextDirtyBlockCheckRef = React.useRef(false);

  const defaultProceedToMalla = useCallback<ProceedToMallaHandler>(
    async (targetPath) => {
      const destination = targetPath ?? '/malla/design';
      if (destination === '/malla/design') {
        if (!hasPublishedRepositoryBlock) {
          toast.info(NO_PUBLISHED_BLOCK_ALERT_MESSAGE);
          return true;
        }
        const shouldSkipDirtyCheck = skipNextDirtyBlockCheckRef.current;
        if (shouldSkipDirtyCheck) {
          skipNextDirtyBlockCheckRef.current = false;
        }
        if (hasDirtyBlock) {
          if (!shouldSkipDirtyCheck) {
            const message = hasPublishedBlock
              ? UPDATE_BLOCK_CONFIRM_MESSAGE
              : PUBLISH_BLOCK_CONFIRM_MESSAGE;

            const confirmed = await confirm({
              title: 'Publicar bloque',
              message,
              confirmText: 'Ir al editor',
              cancelText: 'Cancelar',
              isDanger: false
            });

            if (confirmed) {
              navigate('/block/design');
            }
            return true;
          }
        }
      }
      skipNextDirtyBlockCheckRef.current = false;
      navigate(destination);
      return true;
    },
    [hasDirtyBlock, hasPublishedBlock, hasPublishedRepositoryBlock, navigate, toast, confirm],
  );

  const [overrideHandler, setOverrideHandler] =
    useState<ProceedToMallaHandler | null>(null);

  const handler = useCallback<ProceedToMallaHandler>(
    async (targetPath) => {
      const fn = overrideHandler ?? defaultProceedToMalla;
      const result = await fn(targetPath);
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