import {
  getConfirmFromContext,
  getPromptFromContext,
  type ConfirmOptions,
  type PromptOptions,
} from './confirm/ConfirmContext.tsx';

export type ConfirmAsyncOptions = ConfirmOptions;

export async function confirmAsync(options: ConfirmAsyncOptions): Promise<boolean> {
  const confirmFromContext = getConfirmFromContext();
  if (!confirmFromContext) {
    throw new Error('confirmAsync requiere un ConfirmProvider en el árbol de React.');
  }

  return confirmFromContext(options);
}

export type PromptAsyncOptions = PromptOptions;

export async function promptAsync(options: PromptAsyncOptions): Promise<string | null> {
  const promptFromContext = getPromptFromContext();
  if (!promptFromContext) {
    throw new Error('promptAsync requiere un ConfirmProvider en el árbol de React.');
  }

  return promptFromContext(options);
}