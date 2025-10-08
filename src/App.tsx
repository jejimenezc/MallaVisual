// src/App.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type {
  BlockTemplate,
  CurricularPiece,
  MasterBlockData,
} from './types/curricular.ts';
import type { VisualTemplate, BlockAspect } from './types/visual.ts';
import { BlockEditorScreen } from './screens/BlockEditorScreen';
import { MallaEditorScreen } from './screens/MallaEditorScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BlockRepositoryScreen } from './screens/BlockRepositoryScreen';
import { NavTabs } from './components/NavTabs';
import { StatusBar } from './components/StatusBar/StatusBar';
import { AppHeader } from './components/AppHeader';
import { type MallaExport, MALLA_SCHEMA_VERSION } from './utils/malla-io.ts';
import { BLOCK_SCHEMA_VERSION, type BlockExport } from './utils/block-io.ts';
import styles from './App.module.css';
import { useProject, useBlocksRepo } from './core/persistence/hooks.ts';
import { ProceedToMallaProvider } from './state/proceed-to-malla';
import type { StoredBlock } from './utils/block-repo.ts';
import {
  buildBlockId,
  createBlockId,
  parseBlockId,
  type BlockId,
  type BlockMetadata,
} from './types/block.ts';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
  type BlockContent,
} from './utils/block-content.ts';

const ACTIVE_PROJECT_ID_STORAGE_KEY = 'activeProjectId';
const ACTIVE_PROJECT_NAME_STORAGE_KEY = 'activeProjectName';

function getSafeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredActiveProject(): { id: string | null; name: string } {
  const ls = getSafeLocalStorage();
  if (!ls) return { id: null, name: '' };
  try {
    const id = ls.getItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    const name = ls.getItem(ACTIVE_PROJECT_NAME_STORAGE_KEY) ?? '';
    return { id, name };
  } catch {
    return { id: null, name: '' };
  }
}

function persistActiveProject(id: string, name: string): void {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(ACTIVE_PROJECT_ID_STORAGE_KEY, id);
    ls.setItem(ACTIVE_PROJECT_NAME_STORAGE_KEY, name);
  } catch {
    /* ignore */
  }
}

function clearStoredActiveProject(): void {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(ACTIVE_PROJECT_ID_STORAGE_KEY);
    ls.removeItem(ACTIVE_PROJECT_NAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function normalizeRepository(repo: Record<string, BlockExport>): Record<string, BlockExport> {
  return Object.fromEntries(
    Object.entries(repo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, data]) => [id, data]),
  );
}

interface RepositorySnapshot {
  repository: Record<string, BlockExport>;
  metadata: Record<string, BlockMetadata>;
}

function blocksToRepository(blocks: StoredBlock[]): RepositorySnapshot {
  const repositoryEntries: Record<string, BlockExport> = {};
  const metadataEntries: Record<string, BlockMetadata> = {};
  for (const block of blocks) {
    const key = block.metadata.uuid;
    repositoryEntries[key] = block.data;
    metadataEntries[key] = { ...block.metadata };
  }
  const repository = normalizeRepository(repositoryEntries);
  const metadata: Record<string, BlockMetadata> = {};
  for (const key of Object.keys(repository)) {
    const meta = metadataEntries[key];
    if (meta) {
      metadata[key] = { ...meta };
    }
  }
  return { repository, metadata };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLikelyBlockId(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 2) return false;
  return UUID_PATTERN.test(parts[1] ?? '');
}

interface BlockState {
  draft: BlockContent;
  repoId: string | null;
  repoName: string | null;
  repoMetadata: BlockMetadata | null;
  published: BlockContent | null;
}

function createEmptyMaster(): MasterBlockData {
  return {
    template: Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ active: false, label: '', type: undefined })),
    ),
    visual: {},
    aspect: '1/1',
  };
}

function synchronizeMastersWithRepository(
  masters: Record<string, MasterBlockData>,
  repository: Record<string, BlockExport>,
): { masters: Record<string, MasterBlockData>; mapping: Map<string, string> } {
  const repoContents = Object.entries(repository).map(([id, data]) => [
    id,
    toBlockContent(data),
  ]) as Array<[string, BlockContent]>;
  const assignedRepoIds = new Set<string>();
  const mapping = new Map<string, string>();
  const normalizedMasters: Record<string, MasterBlockData> = {};

  for (const [masterId, masterData] of Object.entries(masters)) {
    const content = toBlockContent(masterData);
    let targetId = masterId;
    if (repository[masterId]) {
      assignedRepoIds.add(masterId);
    } else {
      const match = repoContents.find(([repoId, repoContent]) => {
        if (assignedRepoIds.has(repoId)) return false;
        return blockContentEquals(content, repoContent);
      });
      if (match) {
        targetId = match[0];
        assignedRepoIds.add(targetId);
      }
    }
    mapping.set(masterId, targetId);
    normalizedMasters[targetId] = cloneBlockContent(content) as MasterBlockData;
  }

  for (const [repoId, repoContent] of repoContents) {
    if (!normalizedMasters[repoId]) {
      normalizedMasters[repoId] = cloneBlockContent(repoContent) as MasterBlockData;
      mapping.set(repoId, repoId);
    }
  }

  return { masters: normalizedMasters, mapping };
}

function remapPiecesWithMapping(
  pieces: CurricularPiece[] | undefined,
  mapping: Map<string, string>,
): CurricularPiece[] {
  if (!pieces || pieces.length === 0) return [];
  return pieces.map((piece) => {
    if (piece.kind === 'ref') {
      const mapped = mapping.get(piece.ref.sourceId);
      if (mapped && mapped !== piece.ref.sourceId) {
        return {
          ...piece,
          ref: { ...piece.ref, sourceId: mapped },
        };
      }
      return piece;
    }
    if (piece.kind === 'snapshot' && piece.origin) {
      const mapped = mapping.get(piece.origin.sourceId);
      if (mapped && mapped !== piece.origin.sourceId) {
        return {
          ...piece,
          origin: { ...piece.origin, sourceId: mapped },
        };
      }
    }
    return piece;
  });
}

function prepareMallaProjectState(
  data: MallaExport,
  repositorySnapshot: RepositorySnapshot,
): { block: BlockState; malla: MallaExport } {
  const repository = repositorySnapshot.repository;
  const repositoryMetadata = repositorySnapshot.metadata;
  const sourceMasters = data.masters ?? {};
  const { masters: normalizedMasters, mapping } = synchronizeMastersWithRepository(
    sourceMasters,
    repository,
  );
  const remappedPieces = remapPiecesWithMapping(data.pieces ?? [], mapping);
  const floatingPieces = (data.floatingPieces ?? []).slice();
  const values = { ...(data.values ?? {}) };

  let desiredActiveId = data.activeMasterId ?? '';
  if (desiredActiveId) {
    const mapped = mapping.get(desiredActiveId);
    if (mapped) {
      desiredActiveId = mapped;
    }
  }

  const repoIds = Object.keys(repository);
  const normalizedIds = Object.keys(normalizedMasters);
  const mappedRepoIds = new Set<string>(mapping.values());

  let activeId = desiredActiveId;
  if (activeId && !normalizedMasters[activeId]) {
    const mapped = mapping.get(activeId);
    if (mapped && normalizedMasters[mapped]) {
      activeId = mapped;
    }
  }

  if (!activeId || !normalizedMasters[activeId] || !repository[activeId]) {
    const candidate = repoIds.find((id) => mappedRepoIds.has(id) && normalizedMasters[id]);
    if (candidate) {
      activeId = candidate;
    }
  }

  if ((!activeId || !normalizedMasters[activeId]) && repoIds.length > 0) {
    const candidate = repoIds.find((id) => normalizedMasters[id]);
    activeId = candidate ?? repoIds[0];
  }

  if (!activeId || !normalizedMasters[activeId]) {
    activeId = normalizedIds[0] ?? '';
  }

  if (!activeId) {
    activeId = 'master';
  }

  if (!normalizedMasters[activeId]) {
    if (repository[activeId]) {
      normalizedMasters[activeId] = cloneBlockContent(
        toBlockContent(repository[activeId]),
      ) as MasterBlockData;
    } else {
      normalizedMasters[activeId] = createEmptyMaster();
    }
    mapping.set(activeId, activeId);
  }

  const activeMaster = normalizedMasters[activeId];
  const draft = cloneBlockContent(toBlockContent(activeMaster));
  const repoEntry = repository[activeId];
  const repoMeta = repositoryMetadata[activeId] ?? null;
  const published = repoEntry ? cloneBlockContent(toBlockContent(repoEntry)) : null;

  const block: BlockState = {
    draft,
    repoId: repoEntry ? activeId : null,
    repoName: repoMeta ? repoMeta.name : repoEntry ? activeId : null,
    repoMetadata: repoMeta,
    published,
  };

  const mallaState: MallaExport = {
    ...data,
    version: MALLA_SCHEMA_VERSION,
    masters: normalizedMasters,
    pieces: remappedPieces,
    values,
    floatingPieces,
    activeMasterId: activeId,
    repository,
    repositoryMetadata,
  };

  return { block, malla: mallaState };
}

export default function App(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const storedActiveProjectRef = useRef(readStoredActiveProject());
  const [block, setBlock] = useState<BlockState | null>(null);
  const [malla, setMalla] = useState<MallaExport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(
    storedActiveProjectRef.current.id,
  );
  const [projectName, setProjectName] = useState(
    storedActiveProjectRef.current.name,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [shouldPersistProject, setShouldPersistProject] = useState(false);
  const { exportProject, loadProject } = useProject();
  const { listBlocks, replaceRepository, clearRepository } = useBlocksRepo();
  const [repositorySnapshot, setRepositorySnapshot] = useState<RepositorySnapshot>(() =>
    blocksToRepository(listBlocks()),
  );

  const clearPersistedProjectMetadata = useCallback(() => {
    clearStoredActiveProject();
    setShouldPersistProject(false);
  }, []);
  
  // TODO: reemplazar por helper central de “draft vacío” cuando esté disponible.
  const isDraftNonEmpty = useCallback((draft: BlockContent): boolean => {
    const hasActiveCell = draft.template.some((row) =>
      row.some((cell) => Boolean(cell?.active)),
    );
    const merges = (draft.visual as unknown as { merges?: Record<string, unknown> | null })?.merges;
    const hasMerges =
      !!merges &&
      typeof merges === 'object' &&
      Object.keys(merges as Record<string, unknown>).length > 0;
    const metaName = (draft as unknown as { meta?: { name?: string | null } }).meta?.name;
    const hasName = typeof metaName === 'string' && metaName.trim().length > 0;
    return hasActiveCell || hasMerges || hasName;
  }, []);

  const computeDirty = useCallback(
    (b: BlockState | null = block): boolean => {
      if (!b) return false;
      if (!b.published) {
        // Bloque nunca publicado => dirty si draft no vacío.
        return isDraftNonEmpty(b.draft);
      }
      // Bloque publicado => dirty si draft deep-distinto a published.
      return !blockContentEquals(b.draft, b.published);
    },
    [block, isDraftNonEmpty],
  );

  useEffect(() => {
    const sync = () => setRepositorySnapshot(blocksToRepository(listBlocks()));
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('block-repo-updated', sync);
    return () => window.removeEventListener('block-repo-updated', sync);
  }, [listBlocks]);

  const applyRepositoryChange = useCallback(
    (
      repo: Record<string, BlockExport>,
      options: { reason: string; targetDescription: string; skipConfirmation?: boolean },
      metadata: Record<string, BlockMetadata> = {},
    ): RepositorySnapshot | null => {
      const normalizedInput = normalizeRepository(repo);
      const convertRepository = () => {
        const now = new Date().toISOString();
        const existing = listBlocks();
        const existingById = new Map(existing.map((block) => [block.id, block]));
        const existingByUuid = new Map(existing.map((block) => [block.metadata.uuid, block]));
        const existingByName = new Map(existing.map((block) => [block.metadata.name, block]));
        const fallbackProjectId = projectId ?? 'repository';
        const metadataIndex = new Map<string, BlockMetadata>();
        for (const [metaKey, metaValue] of Object.entries(metadata)) {
          metadataIndex.set(metaKey, metaValue);
          metadataIndex.set(metaValue.uuid, metaValue);
        }
        const map = new Map<string, StoredBlock>();
        for (const [key, data] of Object.entries(normalizedInput)) {
          const trimmedKey = key.trim();
          const providedMeta = metadataIndex.get(trimmedKey) ?? metadataIndex.get(key);
          const normalizedMeta = providedMeta ? { ...providedMeta } : undefined;
          const parsedFromKey = isLikelyBlockId(trimmedKey)
            ? parseBlockId(trimmedKey as BlockId)
            : null;
          let uuid = normalizedMeta?.uuid?.trim() ?? '';
          if (!uuid && parsedFromKey) {
            uuid = parsedFromKey.uuid;
          }
          if (!uuid && UUID_PATTERN.test(trimmedKey)) {
            uuid = trimmedKey;
          }
          const projectFromMeta = normalizedMeta?.projectId?.trim();
          const candidateProjectId = projectFromMeta || parsedFromKey?.projectId || fallbackProjectId;

          let target: StoredBlock | undefined;
          if (uuid) {
            target = existingByUuid.get(uuid);
          }
          if (!target && parsedFromKey) {
            const candidateId = buildBlockId(parsedFromKey.projectId, parsedFromKey.uuid);
            target = existingById.get(candidateId);
          }
          if (!target && !uuid) {
            target = existingByName.get(trimmedKey);
          }

          if (target) {
            const updatedMetadata: BlockMetadata = {
              ...target.metadata,
              name:
                normalizedMeta?.name && normalizedMeta.name.trim().length > 0
                  ? normalizedMeta.name.trim()
                  : target.metadata.name,
              projectId: candidateProjectId || target.metadata.projectId,
              uuid: target.metadata.uuid,
              updatedAt: now,
            };
            const id = buildBlockId(updatedMetadata.projectId, updatedMetadata.uuid);
            map.set(updatedMetadata.uuid, {
              id,
              metadata: updatedMetadata,
              data,
            });
            continue;
          }

          const baseProject = candidateProjectId && candidateProjectId.trim().length > 0
            ? candidateProjectId.trim()
            : fallbackProjectId;
          if (uuid && existingByUuid.has(uuid)) {
            const fallbackBlock = existingByUuid.get(uuid)!;
            const id = buildBlockId(baseProject, uuid);
            map.set(uuid, {
              id,
              metadata: {
                projectId: baseProject,
                uuid,
                name:
                  normalizedMeta?.name && normalizedMeta.name.trim().length > 0
                    ? normalizedMeta.name.trim()
                    : fallbackBlock.metadata.name,
                updatedAt: now,
              },
              data,
            });
            continue;
          }

          if (!uuid) {
            const generatedId = createBlockId(baseProject);
            const parsed = parseBlockId(generatedId);
            uuid = parsed.uuid;
          }
          const id = buildBlockId(baseProject, uuid);
          const fallbackName =
            normalizedMeta?.name && normalizedMeta.name.trim().length > 0
              ? normalizedMeta.name.trim()
              : !UUID_PATTERN.test(trimmedKey) && trimmedKey
                ? trimmedKey
                : uuid;
          map.set(uuid, {
            id,
            metadata: {
              projectId: baseProject,
              uuid,
              name: fallbackName,
              updatedAt: now,
            },
            data,
          });
        }
        const storedBlocks = Array.from(map.values());
        const snapshot = blocksToRepository(storedBlocks);
        return { storedBlocks, snapshot };
      };

      const { storedBlocks, snapshot } = convertRepository();
      const sameAsCurrent = JSON.stringify(repositorySnapshot) === JSON.stringify(snapshot);
      if (!sameAsCurrent) {
        const hasCurrentData = Object.keys(repositorySnapshot.repository).length > 0;
        if (hasCurrentData && !options.skipConfirmation) {
          const message =
            Object.keys(snapshot.repository).length === 0
              ? `Se reiniciará el repositorio de bloques para ${options.reason}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`
              : `Se reemplazará el repositorio de bloques actual por el incluido en ${options.targetDescription}. Esto eliminará los bloques publicados actualmente. ¿Deseas continuar?`;
          if (!window.confirm(message)) {
            return null;
          }
        }
        if (storedBlocks.length === 0) {
          clearRepository();
        } else {
          replaceRepository(storedBlocks);
        }
      }
      setRepositorySnapshot(snapshot);
      return snapshot;
    },
    [
      clearRepository,
      replaceRepository,
      repositorySnapshot,
      listBlocks,
      projectId,
    ],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (shouldPersistProject && projectId) {
      persistActiveProject(projectId, projectName);
    } else {
      clearStoredActiveProject();
    }
  }, [isHydrated, shouldPersistProject, projectId, projectName]);

  useEffect(() => {
    if (isHydrated) return;
    if (typeof window === 'undefined') {
      setIsHydrated(true);
      return;
    }
    const stored = readStoredActiveProject();
    if (!stored.id) {
      setIsHydrated(true);
      return;
    }
    const record = loadProject(stored.id);
    if (!record) {
      clearStoredActiveProject();
      setProjectId(null);
      setProjectName('');
      setBlock(null);
      setMalla(null);
      setShouldPersistProject(false);
      setIsHydrated(true);
      return;
    }
    if ('masters' in record.data) {
      const normalizedRepo = applyRepositoryChange(
        record.data.repository ?? {},
        {
          reason: 'abrir el proyecto almacenado',
          targetDescription: 'el proyecto almacenado',
          skipConfirmation: true,
        },
        record.data.repositoryMetadata ?? {},
      );
      if (!normalizedRepo) {
        setIsHydrated(true);
        return;
      }
      const prepared = prepareMallaProjectState(record.data, normalizedRepo);
      setBlock(prepared.block);
      setMalla(prepared.malla);
    } else {
      applyRepositoryChange(
        {},
        {
          reason: 'abrir el proyecto almacenado',
          targetDescription: 'el proyecto almacenado',
          skipConfirmation: true,
        },
        {},
      );
      setBlock({
        draft: cloneBlockContent(toBlockContent(record.data)),
        repoId: null,
        repoName: null,
        repoMetadata: null,
        published: null,
      });
      setMalla(null);
    }
    setProjectId(stored.id);
    setProjectName(record.meta.name ?? stored.name ?? '');
    setShouldPersistProject(true);
    setIsHydrated(true);
  }, [applyRepositoryChange, isHydrated, loadProject]);

  const currentProject: MallaExport | null = useMemo(() => {
    if (malla) {
      return {
        ...malla,
        version: MALLA_SCHEMA_VERSION,
        repository: repositorySnapshot.repository,
        repositoryMetadata: repositorySnapshot.metadata,
      };
    }
    if (block) {
      return {
        version: MALLA_SCHEMA_VERSION,
        masters: {
          master: {
            template: block.draft.template,
            visual: block.draft.visual,
            aspect: block.draft.aspect,
          },
        },
        repository: repositorySnapshot.repository,
        repositoryMetadata: repositorySnapshot.metadata,
        grid: { cols: 5, rows: 5 },
        pieces: [],
        values: {},
        floatingPieces: [],
        activeMasterId: 'master',
      };
    }
    return null;
  }, [malla, block, repositorySnapshot]);

  const handleExportProject = () => {
    if (!currentProject) return;
    const json = exportProject({ ...currentProject });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'proyecto'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewProject = () => {
    const normalized = applyRepositoryChange(
      {},
      {
        reason: 'crear un proyecto nuevo',
        targetDescription: 'el nuevo proyecto',
      },
      {},
    );
    if (!normalized) return;
    const name = prompt('Nombre del proyecto') || 'Sin nombre';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock(null);
    setMalla(null);
    clearPersistedProjectMetadata();
    navigate('/block/design');
  };

  const handleLoadBlock = (data: BlockExport, inferredName?: string) => {
    const normalized = applyRepositoryChange(
      {},
      {
        reason: 'importar el bloque seleccionado',
        targetDescription: 'el bloque importado',
      },
      {},
    );
    if (!normalized) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    setProjectId(id);
    setProjectName(name);
    setBlock({
      draft: cloneBlockContent(toBlockContent(data)),
      repoId: null,
      repoName: null,
      repoMetadata: null,
      published: null,
    });
    setMalla(null);
    clearPersistedProjectMetadata();
    navigate('/block/design');
  };

  const handleLoadMalla = (data: MallaExport, inferredName?: string) => {
    const normalizedRepo = applyRepositoryChange(
      data.repository ?? {},
      {
        reason: 'importar el proyecto',
        targetDescription: 'el proyecto importado',
      },
      data.repositoryMetadata ?? {},
    );
    if (!normalizedRepo) return;
    const name = inferredName?.trim() || 'Importado';
    const id = crypto.randomUUID();
    const prepared = prepareMallaProjectState(data, normalizedRepo);
    setProjectId(id);
    setProjectName(name);
    setBlock(prepared.block);
    setMalla(prepared.malla);
    clearPersistedProjectMetadata();
    navigate('/malla/design');
  };

  const handleOpenProject = (id: string, data: BlockExport | MallaExport, name: string) => {
    if ('masters' in data) {
      const m = data as MallaExport;
      const normalizedRepo = applyRepositoryChange(
        m.repository ?? {},
        {
          reason: 'abrir el proyecto seleccionado',
          targetDescription: 'el proyecto seleccionado',
        },
        m.repositoryMetadata ?? {},
      );
      if (!normalizedRepo) return;
      const prepared = prepareMallaProjectState(m, normalizedRepo);
      setProjectId(id);
      setProjectName(name);
      setBlock(prepared.block);
      setMalla(prepared.malla);
      setShouldPersistProject(true);
      navigate('/malla/design');
    } else {
      const b = data as BlockExport;
      const normalizedRepo = applyRepositoryChange(
        {},
        {
          reason: 'abrir el proyecto seleccionado',
          targetDescription: 'el proyecto seleccionado',
        },
        {},
      );
      if (!normalizedRepo) return;
      setProjectId(id);
      setProjectName(name);
      setBlock({
        draft: cloneBlockContent(toBlockContent(b)),
        repoId: null,
        repoName: null,
        repoMetadata: null,
        published: null,
      });
      setMalla(null);
      setShouldPersistProject(true);
      navigate('/block/design');
    }
  };

  const handleProceedToMalla = (
    template: BlockTemplate,
    visual: VisualTemplate,
    aspect: BlockAspect,
    targetPath?: string,
    repoId?: string | null,
    published?: BlockContent | null,
  ) => {
    const destination = targetPath ?? '/malla/design';
    if (!malla && destination === '/malla/design') {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
    }
    const content: BlockContent = { template, visual, aspect };
    setBlock((prev) => {
      const nextRepoId =
        repoId !== undefined ? repoId ?? null : prev?.repoId ?? null;
      const draft = cloneBlockContent(content);
      const nextMetadata =
        nextRepoId && repositorySnapshot.metadata[nextRepoId]
          ? repositorySnapshot.metadata[nextRepoId]
          : nextRepoId
            ? prev?.repoMetadata ?? null
            : null;
      const nextPublished = !nextRepoId
        ? null
        : published === undefined
          ? prev?.published
            ? cloneBlockContent(prev.published)
            : null
          : published === null
            ? null
            : cloneBlockContent(published);
      return {
        draft,
        repoId: nextRepoId,
        repoName: nextMetadata?.name ?? (nextRepoId ? prev?.repoName ?? null : null),
        repoMetadata: nextMetadata,
        published: nextPublished,
      };
    });
  };

  const handleRepoIdChange = (repoId: string | null) => {
    setBlock((prev) => {
      if (!prev) return prev;
      const nextRepoId = repoId ?? null;
      if (prev.repoId === nextRepoId) return prev;
      const nextMetadata = nextRepoId ? repositorySnapshot.metadata[nextRepoId] ?? null : null;
      return {
        ...prev,
        repoId: nextRepoId,
        repoName: nextMetadata?.name ?? null,
        repoMetadata: nextMetadata,
        published:
          nextRepoId && prev.published
            ? cloneBlockContent(prev.published)
            : null,
      };
    });
  };

  const handleRepoMetadataChange = (metadata: BlockMetadata | null) => {
    setBlock((prev) => {
      if (!prev) return prev;
      const nextMetadata = metadata ? { ...metadata } : null;
      return {
        ...prev,
        repoMetadata: nextMetadata,
        repoName: nextMetadata?.name ?? prev.repoName ?? null,
      };
    });
  };

  const handleBlockPublish = (
    payload: {
      repoId: string;
      metadata: BlockMetadata;
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
    },
  ) => {
    const content: BlockContent = {
      template: payload.template,
      visual: payload.visual,
      aspect: payload.aspect,
    };
    const metadata = { ...payload.metadata };
    setBlock((prev) => {
      const nextDraft = cloneBlockContent(content);
      if (!prev) {
        return {
          draft: nextDraft,
          repoId: payload.repoId,
          repoName: metadata.name,
          repoMetadata: metadata,
          published: cloneBlockContent(nextDraft),
        };
      }
      return {
        ...prev,
        draft: nextDraft,
        repoId: payload.repoId ?? prev.repoId,
        repoName: metadata.name,
        repoMetadata: metadata,
        published: cloneBlockContent(nextDraft),
      };
    });
  };

  const loadRepositoryBlock = (stored: StoredBlock) => {
    const content = toBlockContent(stored.data);
    const draft = cloneBlockContent(content);
    const published = cloneBlockContent(content);
    setBlock({
      draft,
      repoId: stored.metadata.uuid,
      repoName: stored.metadata.name,
      repoMetadata: { ...stored.metadata },
      published,
    });
    clearPersistedProjectMetadata();
    if (malla && !projectId) {
      try {
        window.localStorage.removeItem('malla-editor-state');
      } catch {
        /* ignore */
      }
      setMalla(null);
    }
    navigate('/block/design');
  };

  const handleBlockDraftChange = useCallback((draft: BlockContent) => {
    const nextDraft = cloneBlockContent(draft);
    setBlock((prev) => {
      if (!prev) {
        return {
          draft: nextDraft,
          repoId: null,
          repoName: null,
          repoMetadata: null,
          published: null,
        };
      }
      if (blockContentEquals(prev.draft, nextDraft)) {
        return prev;
      }
      return {
        ...prev,
        draft: nextDraft,
      };
    });
  }, []);

  const handleOpenRepositoryBlock = (stored: StoredBlock) => {
    const hasUnsavedChanges = computeDirty();
    if (hasUnsavedChanges) {
      const message =
        'Se descartarán los cambios no guardados del bloque actual. ¿Deseas continuar?';
      if (!window.confirm(message)) {
        return;
      }
    }
    loadRepositoryBlock(stored);
  };

  const handleProjectRemoved = useCallback(
    (id: string) => {
      if (!projectId || projectId !== id) return;
      clearPersistedProjectMetadata();
      setProjectId(null);
      setProjectName('');
    },
    [clearPersistedProjectMetadata, projectId],
  );

  const handleBlockImported = (stored: StoredBlock) => {
    let shouldLoadImmediately = false;
    setBlock((prev) => {
      if (prev) return prev;
      shouldLoadImmediately = true;
      const content = toBlockContent(stored.data);
      return {
        draft: cloneBlockContent(content),
        repoId: stored.metadata.uuid,
        repoName: stored.metadata.name,
        repoMetadata: { ...stored.metadata },
        published: cloneBlockContent(content),
      };
    });
    if (!shouldLoadImmediately) {
      return;
    }
    loadRepositoryBlock(stored);
  };

  const blockInUse = useMemo(() => {
    if (!block?.repoId) return false;
    if (!malla) return false;
    return malla.pieces?.some(
      (piece) => piece.kind === 'ref' && piece.ref.sourceId === block.repoId,
    );
  }, [block?.repoId, malla]);

  useEffect(() => {
    setBlock((prev) => {
      if (!prev?.repoId) return prev;
      const repoData = repositorySnapshot.repository[prev.repoId];
      const content = repoData ? toBlockContent(repoData) : null;
      if (blockContentEquals(prev.published, content)) return prev;
      return {
        ...prev,
        published: content ? cloneBlockContent(content) : null,
        repoMetadata: repositorySnapshot.metadata[prev.repoId] ?? prev.repoMetadata,
        repoName: repositorySnapshot.metadata[prev.repoId]?.name ?? prev.repoName
      };
    });
  }, [repositorySnapshot]);

  const handleUpdateMaster: React.Dispatch<
    React.SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  > = (update) => {
    setBlock((prev) => {
      const prevState = prev
        ? (() => {
            const prevContent = cloneBlockContent(prev.draft);
            return {
              template: prevContent.template,
              visual: prevContent.visual,
              aspect: prevContent.aspect,
              repoId: prev.repoId,
            };
          })()
        : null;
      const nextState =
        typeof update === 'function' ? update(prevState) : update;
      if (!nextState) return null;
      const nextRepoId = nextState.repoId ?? prev?.repoId ?? null;
      const draft = cloneBlockContent(toBlockContent(nextState));
      const repoData =
        nextRepoId && repositorySnapshot.repository[nextRepoId]
          ? cloneBlockContent(toBlockContent(repositorySnapshot.repository[nextRepoId]))
          : nextRepoId
            ? prev?.published
              ? cloneBlockContent(prev.published)
              : null
            : null;
      return {
        draft,
        repoId: nextRepoId,
        repoName: nextRepoId
          ? repositorySnapshot.metadata[nextRepoId]?.name ?? prev?.repoName ?? null
          : null,
        repoMetadata: nextRepoId
          ? repositorySnapshot.metadata[nextRepoId] ?? prev?.repoMetadata ?? null
          : null,
        published: repoData,
      };
    });
  };

  const screenTitle = useMemo(() => {
    switch (location.pathname) {
      case '/block/design':
        return 'Diseño de bloque';
      case '/block/style':
        return 'Estilo de bloque';
      case '/blocks':
        return 'Repositorio de bloques';
      case '/malla/design':
        return 'Diseño de malla';
      default:
        return 'Escritorio';
    }
  }, [location.pathname]);

  const hasActiveBlock = useMemo(() => {
    if (!block) return false;
    return isDraftNonEmpty(block.draft);
  }, [block, isDraftNonEmpty]);

  const hasDirtyBlock = computeDirty();
  const hasPublishedBlock = Boolean(block?.published);

  if (!isHydrated) {
    return null;
  }

  return (
    <ProceedToMallaProvider
      hasActiveBlock={hasActiveBlock}
      hasDirtyBlock={hasDirtyBlock}
      hasPublishedBlock={hasPublishedBlock}
    >
      <div className={styles.appContainer}>
        <AppHeader />
        <NavTabs />
        <StatusBar
          projectName={projectName}
          screenTitle={screenTitle}
          schemaVersion={BLOCK_SCHEMA_VERSION}
          onExportProject={handleExportProject}
          hasProject={!!currentProject}
        />
        <main className={styles.appMain}>
        <Routes>
          <Route
            path="/"
            element={
              <HomeScreen
                onNewBlock={handleNewProject}
                onLoadBlock={handleLoadBlock}
                onLoadMalla={handleLoadMalla}
                onOpenProject={handleOpenProject}
                currentProjectId={projectId ?? undefined}
                onProjectDeleted={handleProjectRemoved}
              />
            }
          />
          <Route
            path="/block/design"
            element={
              <BlockEditorScreen
                onProceedToMalla={handleProceedToMalla}
                onDraftChange={handleBlockDraftChange}
                initialData={
                  block
                    ? {
                        version: BLOCK_SCHEMA_VERSION,
                        template: block.draft.template,
                        visual: block.draft.visual,
                        aspect: block.draft.aspect,
                      }
                    : undefined
                }
                projectId={projectId ?? undefined}
                projectName={projectName}
                initialMode="edit"
                initialRepoId={block?.repoId ?? null}
                initialRepoName={block?.repoName ?? null}
                initialRepoMetadata={block?.repoMetadata ?? null}
                onRepoIdChange={handleRepoIdChange}
                onRepoMetadataChange={handleRepoMetadataChange}
                onPublishBlock={handleBlockPublish}
                isBlockInUse={blockInUse}
              />
            }
          />
          <Route
            path="/block/style"
            element={
              block ? (
                <BlockEditorScreen
                  onDraftChange={handleBlockDraftChange}
                  initialData={{
                    version: BLOCK_SCHEMA_VERSION,
                    template: block.draft.template,
                    visual: block.draft.visual,
                    aspect: block.draft.aspect,
                  }}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                  initialMode="view"
                  initialRepoId={block.repoId ?? null}
                  initialRepoName={block.repoName ?? null}
                  initialRepoMetadata={block.repoMetadata ?? null}
                  onRepoIdChange={handleRepoIdChange}
                  onRepoMetadataChange={handleRepoMetadataChange}
                  onPublishBlock={handleBlockPublish}
                  isBlockInUse={blockInUse}
                />
              ) : (
                <Navigate to="/block/design" />
              )
            }
          />
          <Route
            path="/blocks"
            element={
              <BlockRepositoryScreen
                onBlockImported={handleBlockImported}
                onOpenBlock={handleOpenRepositoryBlock}
                activeProjectId={projectId ?? undefined}
              />
            }          />
          <Route
            path="/malla/design"
            element={
              block ? (
                <MallaEditorScreen
                  template={block.published?.template ?? block.draft.template}
                  visual={block.published?.visual ?? block.draft.visual}
                  aspect={block.published?.aspect ?? block.draft.aspect}
                  repoId={block.repoId ?? null}
                  onBack={() => navigate('/block/design')}
                  onUpdateMaster={handleUpdateMaster}
                  initialMalla={malla ?? undefined}
                  onMallaChange={setMalla}
                  projectId={projectId ?? undefined}
                  projectName={projectName}
                />
              ) : (
                <Navigate to="/block/design" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  </ProceedToMallaProvider>
  );
}