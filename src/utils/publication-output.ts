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

export type PublicationMode = 'presentation' | 'document';
export type PublicationProduct =
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
    : ['html-web', 'html-download', 'html-embed'];

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
  } catch {
    return null;
  }
};

const persistJsonToStorage = (storage: Storage | null, key: string, value: unknown): void => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const readStoredPublicationTheme = (storage: Storage | null): ViewerTheme =>
  normalizeViewerTheme(readJsonFromStorage(storage, VIEWER_THEME_STORAGE_KEY));

export const persistPublicationTheme = (storage: Storage | null, theme: ViewerTheme): void => {
  persistJsonToStorage(storage, VIEWER_THEME_STORAGE_KEY, normalizeViewerTheme(theme));
};

export const readStoredPublicationPrintSettings = (storage: Storage | null): ViewerPrintSettings =>
  normalizeViewerPrintSettings(readJsonFromStorage(storage, PUBLICATION_PRINT_SETTINGS_STORAGE_KEY));

export const persistPublicationPrintSettings = (
  storage: Storage | null,
  settings: ViewerPrintSettings,
): void => {
  persistJsonToStorage(
    storage,
    PUBLICATION_PRINT_SETTINGS_STORAGE_KEY,
    normalizeViewerPrintSettings(settings),
  );
};

export const readStoredPublicationExportFlags = (
  storage: Storage | null,
): PublicationExportFlags =>
  normalizePublicationExportFlags(readJsonFromStorage(storage, PUBLICATION_EXPORT_FLAGS_STORAGE_KEY));

export const persistPublicationExportFlags = (
  storage: Storage | null,
  flags: PublicationExportFlags,
): void => {
  persistJsonToStorage(
    storage,
    PUBLICATION_EXPORT_FLAGS_STORAGE_KEY,
    normalizePublicationExportFlags(flags),
  );
};
