import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { MallaExport } from '../utils/malla-io.ts';
import type { MallaSnapshot } from '../types/malla-snapshot.ts';
import { buildMallaSnapshotFromState, validateAndNormalizeMallaSnapshot } from '../utils/malla-snapshot.ts';
import type { ViewerTheme } from '../types/viewer-theme.ts';
import { createDefaultViewerTheme, normalizeViewerTheme } from '../utils/viewer-theme.ts';
import type { ViewerPanelMode, ViewerPrintSettings } from '../utils/viewer-print.ts';
import { createDefaultViewerPrintSettings } from '../utils/viewer-print.ts';
import { downloadViewerStandaloneHtml, openViewerPdfExport, openViewerStandaloneHtml } from '../utils/viewer-export.ts';
import {
  createDefaultPublicationExportFlags,
  persistPublicationExportFlags,
  persistPublicationPrintSettings,
  persistPublicationTheme,
  readStoredPublicationExportFlags,
  readStoredPublicationPrintSettings,
  readStoredPublicationTheme,
  resolvePublicationModeFromViewerPanelMode,
  type PublicationExportFlags,
  type PublicationMode,
  type PublicationOutputConfig,
  type PublicationProduct,
} from '../utils/publication-output.ts';
import { PUBLICATION_ACTION_COPY, type OperationStatus, type PublicationOperationState } from '../utils/publication-feedback.ts';
import type { PublishActionKey, PublishOrigin } from '../components/PublishModal';
import { logAppError } from '../core/runtime/logger.ts';

type ViewerMode = 'preview' | 'publication' | null;
type ToastFn = (message: string, variant?: 'info' | 'success' | 'error') => void;

export function resolvePublishModalContext(input: {
  locationPathname: string;
  viewerMode: ViewerMode;
  viewerPanelModePreference: ViewerPanelMode;
}): { origin: PublishOrigin; mode: PublicationMode } {
  const { locationPathname, viewerMode, viewerPanelModePreference } = input;
  const origin =
    locationPathname === '/malla/viewer' && viewerMode === 'preview' ? 'viewer' : 'editor';
  const mode =
    origin === 'viewer'
      ? resolvePublicationModeFromViewerPanelMode(viewerPanelModePreference)
      : 'presentation';
  return { origin, mode };
}

export function resolvePublicationActionDetail(
  product: PublicationProduct,
): string | undefined {
  if (product === 'html-web') {
    return 'La publicacion se abrio en otra pestaÃ±a para revision inmediata.';
  }
  if (product === 'html-download') {
    return 'El archivo web autonomo ya fue descargado con la apariencia actual.';
  }
  if (product === 'html-paginated') {
    return 'La version descargada conserva la division por paginas del modo documento.';
  }
  if (product === 'html-embed') {
    return 'La variante para insercion ya fue descargada sin elementos editoriales extra.';
  }
  return undefined;
}

export function resolvePublicationOutputConfigForProduct(
  config: PublicationOutputConfig,
  product: PublicationProduct,
): PublicationOutputConfig {
  if (product !== 'html-embed') {
    return config;
  }
  return {
    ...config,
    flags: { ...config.flags, includeEditorial: false },
  };
}

const createPublicationOperation = (
  key: PublicationOperationState['key'],
  status: OperationStatus,
  message: string,
  detail?: string,
): PublicationOperationState => ({ key, status, message, detail });

interface UsePublicationWorkflowArgs {
  currentProject: MallaExport | null;
  projectId: string | null;
  projectName: string;
  viewerMode: ViewerMode;
  publicationSnapshot: MallaSnapshot | null;
  locationPathname: string;
  navigate: NavigateFunction;
  setPublicationSnapshot: React.Dispatch<React.SetStateAction<MallaSnapshot | null>>;
  setViewerMode: React.Dispatch<React.SetStateAction<ViewerMode>>;
  pushToast: ToastFn;
  getSafeLocalStorage: () => Storage | null;
}

interface UsePublicationWorkflowResult {
  viewerPanelModePreference: ViewerPanelMode;
  publicationTheme: ViewerTheme;
  publicationPrintSettings: ViewerPrintSettings;
  publishContext: { origin: PublishOrigin; mode: PublicationMode } | null;
  publicationOperation: PublicationOperationState | null;
  publicationOutputConfig: PublicationOutputConfig;
  previewSnapshot: MallaSnapshot | null;
  publishActionStates: Record<PublishActionKey, { availability: 'ready'; status: OperationStatus; detail?: string }>;
  handleOpenPreview: () => void;
  handleOpenPrintPreview: () => void;
  openPublishModal: (origin: PublishOrigin, mode?: PublicationMode) => void;
  closePublishModal: () => void;
  handleSelectPublicationProduct: (product: PublicationProduct) => Promise<void>;
  handleImportPublicationFile: (file: File) => Promise<void>;
  handleBackToEditorFromViewer: () => void;
  handleViewerThemeChange: (next: ViewerTheme) => void;
  handlePublicationPrintSettingsChange: (next: ViewerPrintSettings) => void;
  handleViewerPanelModeChange: (next: ViewerPanelMode) => void;
  handlePublishFromPreview: () => void;
  handleOpenPublishModalFromMenu: () => void;
  handleGoToPresentationFromPublishModal: () => void;
  handleGoToDocumentFromPublishModal: () => void;
}

export function usePublicationWorkflow({
  currentProject,
  projectId,
  projectName,
  viewerMode,
  publicationSnapshot,
  locationPathname,
  navigate,
  setPublicationSnapshot,
  setViewerMode,
  pushToast,
  getSafeLocalStorage,
}: UsePublicationWorkflowArgs): UsePublicationWorkflowResult {
  const publicationStorageScope = viewerMode === 'publication' ? null : projectId ?? null;
  const readThemeState = useCallback(
    () =>
      publicationStorageScope
        ? readStoredPublicationTheme(getSafeLocalStorage(), publicationStorageScope)
        : createDefaultViewerTheme(),
    [getSafeLocalStorage, publicationStorageScope],
  );
  const readPrintSettingsState = useCallback(
    () =>
      publicationStorageScope
        ? readStoredPublicationPrintSettings(getSafeLocalStorage(), publicationStorageScope)
        : createDefaultViewerPrintSettings(),
    [getSafeLocalStorage, publicationStorageScope],
  );
  const readExportFlagsState = useCallback(
    () =>
      publicationStorageScope
        ? readStoredPublicationExportFlags(getSafeLocalStorage(), publicationStorageScope)
        : createDefaultPublicationExportFlags(),
    [getSafeLocalStorage, publicationStorageScope],
  );
  const [viewerPanelModePreference, setViewerPanelModePreference] = useState<ViewerPanelMode>('preview');
  const [publicationTheme, setPublicationTheme] = useState<ViewerTheme>(readThemeState);
  const [publicationPrintSettings, setPublicationPrintSettings] = useState(readPrintSettingsState);
  const [publicationExportFlags, setPublicationExportFlags] = useState<PublicationExportFlags>(readExportFlagsState);
  const [publishContext, setPublishContext] = useState<{ origin: PublishOrigin; mode: PublicationMode } | null>(null);
  const [publicationOperation, setPublicationOperation] = useState<PublicationOperationState | null>(null);

  useEffect(() => {
    setPublicationTheme(readThemeState());
    setPublicationPrintSettings(readPrintSettingsState());
    setPublicationExportFlags(readExportFlagsState());
  }, [readExportFlagsState, readPrintSettingsState, readThemeState]);

  useEffect(() => {
    if (!publicationStorageScope) return;
    persistPublicationTheme(getSafeLocalStorage(), publicationTheme, publicationStorageScope);
  }, [getSafeLocalStorage, publicationStorageScope, publicationTheme]);

  useEffect(() => {
    if (!publicationStorageScope) return;
    persistPublicationPrintSettings(getSafeLocalStorage(), publicationPrintSettings, publicationStorageScope);
  }, [getSafeLocalStorage, publicationPrintSettings, publicationStorageScope]);

  useEffect(() => {
    if (!publicationStorageScope) return;
    persistPublicationExportFlags(getSafeLocalStorage(), publicationExportFlags, publicationStorageScope);
  }, [getSafeLocalStorage, publicationExportFlags, publicationStorageScope]);

  const publicationOutputConfig = useMemo<PublicationOutputConfig>(
    () => ({
      theme: normalizeViewerTheme(publicationTheme),
      printSettings: publicationPrintSettings,
      flags: publicationExportFlags,
    }),
    [publicationExportFlags, publicationPrintSettings, publicationTheme],
  );

  const previewSnapshot = useMemo<MallaSnapshot | null>(() => {
    if (!currentProject) return null;
    try {
      return buildMallaSnapshotFromState(currentProject, {
        projectName: projectName || 'Proyecto',
      });
    } catch (error) {
      logAppError({
        scope: 'viewer',
        severity: 'non-fatal',
        message: 'Fallo la generacion del snapshot de vista previa.',
        error,
        context: { projectId, projectName },
      });
      return null;
    }
  }, [currentProject, projectId, projectName]);

  const activePublicationSource = useMemo<MallaSnapshot | null>(() => {
    if (viewerMode === 'publication') {
      return publicationSnapshot;
    }
    return previewSnapshot;
  }, [previewSnapshot, publicationSnapshot, viewerMode]);

  const createPublicationSnapshot = useCallback(
    (appearance: ViewerTheme): MallaSnapshot | null => {
      if (!currentProject) return null;
      try {
        return buildMallaSnapshotFromState(currentProject, {
          projectName: projectName || 'Proyecto',
          appearance,
        });
      } catch (error) {
        logAppError({
          scope: 'publication',
          severity: 'non-fatal',
          message: 'Fallo la generacion del snapshot publicable.',
          error,
          context: { projectId, projectName },
        });
        return null;
      }
    },
    [currentProject, projectId, projectName],
  );

  const downloadPublication = useCallback((snapshot: MallaSnapshot) => {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.projectName || 'proyecto'}-publicacion-v1.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleOpenPreview = useCallback(() => {
    if (!currentProject) return;
    if (!previewSnapshot) {
      pushToast('No se pudo abrir la vista previa', 'error');
      return;
    }
    setViewerPanelModePreference('preview');
    setViewerMode('preview');
    if (locationPathname !== '/malla/viewer') {
      navigate('/malla/viewer');
    }
  }, [currentProject, locationPathname, navigate, previewSnapshot, pushToast, setViewerMode]);

  const handleOpenPrintPreview = useCallback(() => {
    if (!currentProject) return;
    if (!previewSnapshot) {
      pushToast('No se pudo abrir la vista de impresion', 'error');
      return;
    }
    setViewerPanelModePreference('print-preview');
    setViewerMode('preview');
    if (locationPathname !== '/malla/viewer') {
      navigate('/malla/viewer');
    }
  }, [currentProject, locationPathname, navigate, previewSnapshot, pushToast, setViewerMode]);

  const openPublishModal = useCallback(
    (origin: PublishOrigin, mode?: PublicationMode) => {
      setPublishContext({
        origin,
        mode: mode ?? resolvePublicationModeFromViewerPanelMode(viewerPanelModePreference),
      });
    },
    [viewerPanelModePreference],
  );

  const closePublishModal = useCallback(() => {
    setPublishContext(null);
  }, []);

  useEffect(() => {
    if (!publicationOperation || publicationOperation.status === 'running') return undefined;
    const timeoutId = window.setTimeout(() => {
      setPublicationOperation((current) => (current === publicationOperation ? null : current));
    }, publicationOperation.status === 'error' ? 8000 : 5000);
    return () => window.clearTimeout(timeoutId);
  }, [publicationOperation]);

  const handleSelectPublicationProduct = useCallback(
    async (product: PublicationProduct) => {
      const copy = PUBLICATION_ACTION_COPY[product];
      setPublicationOperation(createPublicationOperation(product, 'running', copy.runningLabel, copy.statusDetail));
      try {
        const snapshot =
          viewerMode === 'publication'
            ? activePublicationSource
            : createPublicationSnapshot(publicationOutputConfig.theme);
        if (!snapshot) {
          const failureMessage = 'No se pudo generar la salida publicada.';
          setPublicationOperation(createPublicationOperation(product, 'error', failureMessage, 'Revisa la configuracion visible y vuelve a intentarlo.'));
          pushToast(failureMessage, 'error');
          return;
        }
        setPublicationSnapshot(snapshot);

        if (product === 'snapshot-json') {
          downloadPublication(snapshot);
        } else if (product === 'pdf') {
          openViewerPdfExport({ snapshot, config: publicationOutputConfig, product: 'pdf' });
        } else if (product === 'print') {
          openViewerPdfExport({ snapshot, config: publicationOutputConfig, product: 'print' });
        } else if (product === 'html-web') {
          openViewerStandaloneHtml({ snapshot, config: publicationOutputConfig, product: 'html-web' });
        } else if (product === 'html-download') {
          downloadViewerStandaloneHtml({ snapshot, config: publicationOutputConfig, product: 'html-download' });
        } else if (product === 'html-paginated') {
          downloadViewerStandaloneHtml({ snapshot, config: publicationOutputConfig, product: 'html-paginated' });
        } else if (product === 'html-embed') {
          downloadViewerStandaloneHtml({
            snapshot,
            config: resolvePublicationOutputConfigForProduct(publicationOutputConfig, product),
            product: 'html-embed',
          });
        }

        const detail =
          product === 'html-web'
            ? 'La publicacion se abrio en otra pestaña para revision inmediata.'
            : product === 'html-download'
              ? 'El archivo web autonomo ya fue descargado con la apariencia actual.'
              : product === 'html-paginated'
                ? 'La version descargada conserva la division por paginas del modo documento.'
                : product === 'html-embed'
                  ? 'La variante para insercion ya fue descargada sin elementos editoriales extra.'
                  : undefined;
        setPublicationOperation(createPublicationOperation(product, 'success', 'Completado', detail));
      } catch (error) {
        const failureMessage = `No se pudo completar ${copy.idleLabel.toLowerCase()}.`;
        logAppError({
          scope: 'publication',
          severity: 'non-fatal',
          message: 'Fallo una accion de publicacion.',
          error,
          context: { product, projectId, projectName },
        });
        setPublicationOperation(createPublicationOperation(product, 'error', failureMessage, 'El navegador o la generacion local no pudo completar la salida solicitada.'));
        pushToast(failureMessage, 'error');
      }
    },
    [
      activePublicationSource,
      createPublicationSnapshot,
      downloadPublication,
      projectId,
      projectName,
      publicationOutputConfig,
      pushToast,
      setPublicationSnapshot,
      viewerMode,
    ],
  );

  const handleImportPublicationFile = useCallback(
    async (file: File) => {
      try {
        setPublicationOperation(createPublicationOperation('import-publication', 'running', 'Abriendo version publicada...', 'Se esta validando el archivo seleccionado antes de cargarlo en el visor.'));
        const text = await file.text();
        const parsed: unknown = JSON.parse(text);
        const validation = validateAndNormalizeMallaSnapshot(parsed);
        if (!validation.ok) {
          setPublicationOperation(createPublicationOperation('import-publication', 'error', 'Archivo de publicacion invalido.', validation.error));
          pushToast(validation.error, 'error');
          return;
        }
        setPublicationSnapshot(validation.normalizedSnapshot);
        setViewerPanelModePreference('preview');
        setViewerMode('publication');
        navigate('/malla/viewer');
        setPublicationOperation(createPublicationOperation('import-publication', 'success', 'Version publicada abierta.', 'El snapshot se valido y ya esta disponible en el visor de publicacion.'));
        pushToast('Versión publicada abierta', 'success');
      } catch (error) {
        logAppError({
          scope: 'publication',
          severity: 'non-fatal',
          message: 'Fallo la apertura de un snapshot publicado.',
          error,
          context: { fileName: file.name },
        });
        pushToast('No se pudo abrir la versión publicada', 'error');
      }
    },
    [navigate, pushToast, setPublicationSnapshot, setViewerMode],
  );

  const handleBackToEditorFromViewer = useCallback(() => {
    setViewerPanelModePreference('preview');
    setViewerMode(null);
    navigate('/malla/design');
  }, [navigate, setViewerMode]);

  const handleViewerThemeChange = useCallback(
    (next: ViewerTheme) => {
      if (viewerMode !== 'preview') return;
      setPublicationTheme(normalizeViewerTheme(next));
    },
    [viewerMode],
  );

  const handlePublicationPrintSettingsChange = useCallback((next: ViewerPrintSettings) => {
    setPublicationPrintSettings(next);
  }, []);

  const handleViewerPanelModeChange = useCallback((next: ViewerPanelMode) => {
    setViewerPanelModePreference(next);
  }, []);

  const handlePublishFromPreview = useCallback(() => {
    openPublishModal('viewer', resolvePublicationModeFromViewerPanelMode(viewerPanelModePreference));
  }, [openPublishModal, viewerPanelModePreference]);

  const handleOpenPublishModalFromMenu = useCallback(() => {
    const nextContext = resolvePublishModalContext({
      locationPathname,
      viewerMode,
      viewerPanelModePreference,
    });
    openPublishModal(nextContext.origin, nextContext.mode);
  }, [locationPathname, openPublishModal, viewerMode, viewerPanelModePreference]);

  const handleGoToPresentationFromPublishModal = useCallback(() => {
    closePublishModal();
    handleOpenPreview();
  }, [closePublishModal, handleOpenPreview]);

  const handleGoToDocumentFromPublishModal = useCallback(() => {
    closePublishModal();
    handleOpenPrintPreview();
  }, [closePublishModal, handleOpenPrintPreview]);

  const publishActionStates = useMemo<Record<PublishActionKey, { availability: 'ready'; status: OperationStatus; detail?: string }>>(
    () => ({
      'snapshot-json': { availability: 'ready', status: publicationOperation?.key === 'snapshot-json' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'snapshot-json' ? publicationOperation.detail : undefined },
      pdf: { availability: 'ready', status: publicationOperation?.key === 'pdf' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'pdf' ? publicationOperation.detail : undefined },
      print: { availability: 'ready', status: publicationOperation?.key === 'print' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'print' ? publicationOperation.detail : undefined },
      'html-web': { availability: 'ready', status: publicationOperation?.key === 'html-web' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'html-web' ? publicationOperation.detail : undefined },
      'html-download': { availability: 'ready', status: publicationOperation?.key === 'html-download' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'html-download' ? publicationOperation.detail : undefined },
      'html-paginated': { availability: 'ready', status: publicationOperation?.key === 'html-paginated' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'html-paginated' ? publicationOperation.detail : undefined },
      'html-embed': { availability: 'ready', status: publicationOperation?.key === 'html-embed' ? publicationOperation.status : 'idle', detail: publicationOperation?.key === 'html-embed' ? publicationOperation.detail : undefined },
    }),
    [publicationOperation],
  );

  return {
    viewerPanelModePreference,
    publicationTheme,
    publicationPrintSettings,
    publishContext,
    publicationOperation,
    publicationOutputConfig,
    previewSnapshot,
    publishActionStates,
    handleOpenPreview,
    handleOpenPrintPreview,
    openPublishModal,
    closePublishModal,
    handleSelectPublicationProduct,
    handleImportPublicationFile,
    handleBackToEditorFromViewer,
    handleViewerThemeChange,
    handlePublicationPrintSettingsChange,
    handleViewerPanelModeChange,
    handlePublishFromPreview,
    handleOpenPublishModalFromMenu,
    handleGoToPresentationFromPublishModal,
    handleGoToDocumentFromPublishModal,
  };
}
