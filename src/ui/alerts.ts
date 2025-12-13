import {
  getConfirmFromContext,
  getPromptFromContext,
  type ConfirmOptions,
  type PromptOptions,
} from './confirm/ConfirmContext.tsx';

export function showAlert(message: string): void {
  window.alert(message);
}

export function askConfirm(message: string): boolean {
  return window.confirm(message);
}

export type ConfirmAsyncOptions = ConfirmOptions;

export async function confirmAsync(options: ConfirmAsyncOptions): Promise<boolean> {
  const confirmFromContext = getConfirmFromContext();
  if (confirmFromContext) {
    return confirmFromContext(options);
  }

  const { title, message } = options;
  const legacyMessage = title ? `${title}\n\n${message}` : message;
  return Promise.resolve(askConfirm(legacyMessage));
}

export type PromptAsyncOptions = PromptOptions;

export async function promptAsync(options: PromptAsyncOptions): Promise<string | null> {
  const promptFromContext = getPromptFromContext();
  if (promptFromContext) {
    return promptFromContext(options);
  }

  const normalize = options.normalize ?? ((value: string) => value.trim());
  const { title, message, defaultValue } = options;
  const legacyMessage = title ? `${title}\n\n${message}` : message;
  const response = window.prompt(legacyMessage, defaultValue ?? '');
  if (response === null) return null;
  const normalized = normalize(response);
  if (!normalized) return null;
  return normalized;
}