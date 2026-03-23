export type AppErrorScope =
  | 'app-shell'
  | 'editor'
  | 'viewer'
  | 'publication'
  | 'import-export'
  | 'persistence';

export type AppErrorSeverity = 'fatal' | 'non-fatal';

export interface UserFacingError {
  message: string;
}

export interface LogAppErrorInput {
  scope: AppErrorScope;
  severity: AppErrorSeverity;
  message: string;
  error: unknown;
  context?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getErrorMessage = (error: unknown, fallback = 'Error desconocido'): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export function logAppError(input: LogAppErrorInput): void {
  const payload = {
    scope: input.scope,
    severity: input.severity,
    message: input.message,
    errorMessage: getErrorMessage(input.error),
    error: input.error,
    context: input.context,
    timestamp: new Date().toISOString(),
  };

  if (input.severity === 'fatal') {
    console.error('[app-error:fatal]', payload);
    return;
  }

  console.warn('[app-error]', payload);
}
