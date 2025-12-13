import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import './ConfirmModal.css';

export type ConfirmVariant = 'default' | 'destructive' | 'info';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends Required<Pick<ConfirmOptions, 'message'>> {
  title?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmVariant;
}

export interface PromptOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  placeholder?: string;
  normalize?: (value: string) => string;
}

interface PromptState extends Required<Pick<PromptOptions, 'message'>> {
  title?: string;
  confirmLabel: string;
  cancelLabel: string;
  defaultValue?: string;
  placeholder?: string;
  normalize: (value: string) => string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type DialogState =
  | { type: 'confirm'; data: ConfirmState }
  | { type: 'prompt'; data: PromptState };

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);
let externalConfirm: ConfirmContextValue['confirm'] | null = null;
let externalPrompt: ConfirmContextValue['prompt'] | null = null;

export function getConfirmFromContext(): ConfirmContextValue['confirm'] | null {
  return externalConfirm;
}

export function getPromptFromContext(): ConfirmContextValue['prompt'] | null {
  return externalPrompt;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean | string | null) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    setDialog(null);
    resolverRef.current = null;
    setPromptValue('');
    setPromptError(null);
  }, []);

  const resolve = useCallback(
    (result: boolean | string | null) => {
      resolverRef.current?.(result);
      cleanup();
    },
    [cleanup],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolvePromise) => {
      resolverRef.current = (value) => resolvePromise(value as boolean);
      setDialog({
        type: 'confirm',
        data: {
          ...options,
          confirmLabel: options.confirmLabel ?? 'Confirmar',
          cancelLabel: options.cancelLabel ?? 'Cancelar',
        },
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolvePromise) => {
      resolverRef.current = (value) => resolvePromise(value as string | null);
      setPromptValue(options.defaultValue ?? '');
      setPromptError(null);
      setDialog({
        type: 'prompt',
        data: {
          ...options,
          confirmLabel: options.confirmLabel ?? 'Confirmar',
          cancelLabel: options.cancelLabel ?? 'Cancelar',
          normalize: options.normalize ?? ((value: string) => value.trim()),
        },
      });
    });
  }, []);

  useEffect(() => {
    externalConfirm = confirm;
    externalPrompt = prompt;
    return () => {
      externalConfirm = null;
      externalPrompt = null;
    };
  }, [confirm, prompt]);

  useEffect(() => {
    if (!dialog) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        resolve(dialog.type === 'confirm' ? false : null);
      }
      if (dialog.type === 'confirm' && event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        resolve(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, resolve]);

  useEffect(() => {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      confirmButtonRef.current?.focus();
    }
    if (dialog.type === 'prompt') {
      promptInputRef.current?.focus();
    }
  }, [dialog]);

  const handlePromptSubmit = useCallback(() => {
    if (dialog?.type !== 'prompt') return;
    const normalizedValue = dialog.data.normalize(promptValue);
    if (!normalizedValue) {
      setPromptError('El nombre no puede estar vacío.');
      return;
    }
    resolve(normalizedValue);
  }, [dialog, promptValue, resolve]);

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);
  const variant = dialog?.type === 'confirm' ? dialog.data.variant : undefined;
  const modalClassName = variant ? `confirm-modal confirm-modal-${variant}` : 'confirm-modal';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div
          className="confirm-backdrop"
          role="presentation"
          onClick={() => resolve(dialog.type === 'confirm' ? false : null)}
        >
          <div
            className={modalClassName}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            {dialog.data.title ? (
              <h2 className="confirm-title" id="confirm-title">
                {dialog.data.title}
              </h2>
            ) : null}
            <p className="confirm-message" id="confirm-message">
              {dialog.data.message}
            </p>
            {dialog.type === 'prompt' ? (
              <form
                className="confirm-prompt"
                onSubmit={(event) => {
                  event.preventDefault();
                  handlePromptSubmit();
                }}
              >
                <input
                  ref={promptInputRef}
                  type="text"
                  className="confirm-input"
                  value={promptValue}
                  placeholder={dialog.data.placeholder}
                  onChange={(event) => {
                    setPromptValue(event.target.value);
                    setPromptError(null);
                  }}
                />
                {promptError ? <p className="confirm-error">{promptError}</p> : null}
              </form>
            ) : null}
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-button ghost"
                onClick={() => resolve(dialog.type === 'confirm' ? false : null)}
              >
                {dialog.data.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="confirm-button"
                onClick={() => (dialog.type === 'confirm' ? resolve(true) : handlePromptSubmit())}
              >
                {dialog.data.confirmLabel}
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

export function usePrompt(): ConfirmContextValue['prompt'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('usePrompt debe usarse dentro de un ConfirmProvider');
  }
  return ctx.prompt;
}