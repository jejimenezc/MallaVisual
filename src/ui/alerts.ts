import { getConfirmFromContext, type ConfirmOptions } from './confirm/ConfirmContext.tsx';

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