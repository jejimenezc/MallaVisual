import {
  createDefaultViewerTheme,
  normalizeViewerTheme,
  VIEWER_THEME_STORAGE_KEY,
} from './viewer-theme.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import {
  createDefaultViewerPrintSettings,
  normalizeViewerPrintSettings,
  type ViewerPanelMode,
  type ViewerPrintSettings,
} from './viewer-print.ts';
import { logAppError } from '../core/runtime/logger.ts';

export type PublicationMode = 'presentation' | 'document';
export type PublicationProduct =
  | 'snapshot-json'
  | 'print'
  | 'pdf'
  | 'html-web'
  | 'html-download'
  | 'html-paginated'
  | 'html-embed';

export interface PublicationExportFlags {
  includeEditorial: boolean;
  includeOverlay: boolean;
}

export interface PublicationOutputConfig {
  theme: ViewerTheme;
  printSettings: ViewerPrintSettings;
  flags: PublicationExportFlags;
}

export const resolvePublicationModeFromViewerPanelMode = (
  value: ViewerPanelMode,
): PublicationMode => (value === 'print-preview' ? 'document' : 'presentation');

export const resolvePublicationProductsForMode = (
  mode: PublicationMode,
): PublicationProduct[] =>
  mode === 'document'
    ? ['pdf', 'html-paginated', 'print']
    : ['html-web', 'html-download', 'html-embed', 'snapshot-json'];

export const PUBLICATION_PRINT_SETTINGS_STORAGE_KEY = 'viewerPrintSettingsLastUsed';
export const PUBLICATION_EXPORT_FLAGS_STORAGE_KEY = 'publicationExportFlagsLastUsed';

export const createDefaultPublicationExportFlags = (): PublicationExportFlags => ({
  includeEditorial: true,
  includeOverlay: false,
});

export const normalizePublicationExportFlags = (value: unknown): PublicationExportFlags => {
  const defaults = createDefaultPublicationExportFlags();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const source = value as Partial<PublicationExportFlags>;
  return {
    includeEditorial: source.includeEditorial !== false,
    includeOverlay: source.includeOverlay === true,
  };
};

export const createDefaultPublicationOutputConfig = (): PublicationOutputConfig => ({
  theme: createDefaultViewerTheme(),
  printSettings: createDefaultViewerPrintSettings(),
  flags: createDefaultPublicationExportFlags(),
});

export const normalizePublicationOutputConfig = (value: Partial<PublicationOutputConfig>): PublicationOutputConfig => ({
  theme: normalizeViewerTheme(value.theme),
  printSettings: normalizeViewerPrintSettings(value.printSettings),
  flags: normalizePublicationExportFlags(value.flags),
});

const readJsonFromStorage = (storage: Storage | null, key: string): unknown => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logAppError({
      scope: 'publication',
      severity: 'non-fatal',
      message: 'Fallo la lectura de configuracion de publicacion persistida.',
      error,
      context: {
        key,
      },
    });
    return null;
  }
};

const resolvePublicationStorageKey = (baseKey: string, scopeKey?: string | null): string =>
  scopeKey && scopeKey.trim().length > 0 ? `${baseKey}:${scopeKey}` : baseKey;

const persistJsonToStorage = (storage: Storage | null, key: string, value: unknown): void => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logAppError({
      scope: 'publication',
      severity: 'non-fatal',
      message: 'Fallo la persistencia de configuracion de publicacion.',
      error,
      context: {
        key,
      },
    });
  }
};

export const readStoredPublicationTheme = (
  storage: Storage | null,
  scopeKey?: string | null,
): ViewerTheme =>
  normalizeViewerTheme(readJsonFromStorage(storage, resolvePublicationStorageKey(VIEWER_THEME_STORAGE_KEY, scopeKey)));

export const persistPublicationTheme = (
  storage: Storage | null,
  theme: ViewerTheme,
  scopeKey?: string | null,
): void => {
  persistJsonToStorage(
    storage,
    resolvePublicationStorageKey(VIEWER_THEME_STORAGE_KEY, scopeKey),
    normalizeViewerTheme(theme),
  );
};

export const readStoredPublicationPrintSettings = (
  storage: Storage | null,
  scopeKey?: string | null,
): ViewerPrintSettings =>
  normalizeViewerPrintSettings(
    readJsonFromStorage(storage, resolvePublicationStorageKey(PUBLICATION_PRINT_SETTINGS_STORAGE_KEY, scopeKey)),
  );

export const persistPublicationPrintSettings = (
  storage: Storage | null,
  settings: ViewerPrintSettings,
  scopeKey?: string | null,
): void => {
  persistJsonToStorage(
    storage,
    resolvePublicationStorageKey(PUBLICATION_PRINT_SETTINGS_STORAGE_KEY, scopeKey),
    normalizeViewerPrintSettings(settings),
  );
};

export const readStoredPublicationExportFlags = (
  storage: Storage | null,
  scopeKey?: string | null,
): PublicationExportFlags =>
  normalizePublicationExportFlags(
    readJsonFromStorage(storage, resolvePublicationStorageKey(PUBLICATION_EXPORT_FLAGS_STORAGE_KEY, scopeKey)),
  );

export const persistPublicationExportFlags = (
  storage: Storage | null,
  flags: PublicationExportFlags,
  scopeKey?: string | null,
): void => {
  persistJsonToStorage(
    storage,
    resolvePublicationStorageKey(PUBLICATION_EXPORT_FLAGS_STORAGE_KEY, scopeKey),
    normalizePublicationExportFlags(flags),
  );
};
