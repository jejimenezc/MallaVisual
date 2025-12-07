import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import './ConfirmModal.css';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState extends Required<Pick<ConfirmOptions, 'message'>> {
  title?: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [request, setRequest] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const cleanup = useCallback(() => {
    setRequest(null);
    resolverRef.current = null;
  }, []);

  const resolve = useCallback(
    (result: boolean) => {
      resolverRef.current?.(result);
      cleanup();
    },
    [cleanup],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolvePromise) => {
      resolverRef.current = resolvePromise;
      setRequest({
        ...options,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
      });
    });
  }, []);

  useEffect(() => {
    if (!request) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        resolve(false);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        resolve(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [request, resolve]);

  useEffect(() => {
    if (!request) return;
    confirmButtonRef.current?.focus();
  }, [request]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? (
        <div className="confirm-backdrop" role="presentation" onClick={() => resolve(false)}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            {request.title ? (
              <h2 className="confirm-title" id="confirm-title">
                {request.title}
              </h2>
            ) : null}
            <p className="confirm-message" id="confirm-message">
              {request.message}
            </p>
            <div className="confirm-actions">
              <button type="button" className="confirm-button ghost" onClick={() => resolve(false)}>
                {request.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="confirm-button"
                onClick={() => resolve(true)}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de un ConfirmProvider');
  }
  return ctx.confirm;
}