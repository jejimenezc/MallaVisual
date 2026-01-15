import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import './Toast.css';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutsRef = useRef<Record<number, number>>({});

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      const nextTimeouts = { ...timeoutsRef.current };
      delete nextTimeouts[id];
      timeoutsRef.current = nextTimeouts;
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant, durationMs }]);
      const timeoutId = window.setTimeout(() => removeToast(id), durationMs);
      timeoutsRef.current = { ...timeoutsRef.current, [id]: timeoutId };
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.variant}`}>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Cerrar notificación"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue['showToast'] {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return ctx.showToast;
}