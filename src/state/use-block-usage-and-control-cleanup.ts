import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BlockTemplate } from '../types/curricular.ts';
import type { BlockAspect, VisualTemplate } from '../types/visual.ts';
import { coordKey } from '../types/visual.ts';
import {
  blockContentEquals,
  cloneBlockContent,
  toBlockContent,
} from '../utils/block-content.ts';
import { clearControlValues } from '../utils/malla-sync.ts';
import { normalizeProjectTheme, type MallaExport, type ProjectTheme } from '../utils/malla-io.ts';
import type { RepositorySnapshot } from '../utils/repository-snapshot.ts';
import {
  diffPieceValues,
  summarizePieceValues,
  type BlockState,
  type ControlDataClearRequest,
  type TemplateControlSnapshot,
} from '../utils/app-helpers.ts';

interface UseBlockUsageAndControlCleanupArgs {
  block: BlockState | null;
  malla: MallaExport | null;
  repositorySnapshot: RepositorySnapshot;
  setBlock: Dispatch<SetStateAction<BlockState | null>>;
  setMalla: Dispatch<SetStateAction<MallaExport | null>>;
  setProjectThemeState: Dispatch<SetStateAction<ProjectTheme>>;
}

interface UseBlockUsageAndControlCleanupResult {
  blocksInUse: Set<string>;
  controlsInUse: Map<string, Set<string>>;
  blockInUse: boolean;
  handleRequestControlDataClear: (coordOrCoords: string | Iterable<string>) => void;
  handleUpdateMaster: Dispatch<
    SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  >;
}

const isPersistentControlCell = (
  cell: { type?: unknown; mergedWith?: string | undefined } | null | undefined,
): boolean => {
  return Boolean(cell?.type) && !cell?.mergedWith;
};

export function useBlockUsageAndControlCleanup({
  block,
  malla,
  repositorySnapshot,
  setBlock,
  setMalla,
  setProjectThemeState,
}: UseBlockUsageAndControlCleanupArgs): UseBlockUsageAndControlCleanupResult {
  const pendingControlDataClearsRef = useRef<ControlDataClearRequest[]>([]);
  const previousTemplateControlsRef = useRef<Map<string, TemplateControlSnapshot>>(
    new Map<string, TemplateControlSnapshot>(),
  );
  const [pendingControlDataClearTick, bumpPendingControlDataClearTick] = useState(0);

  const { blocksInUse, controlsInUse } = useMemo(() => {
    const usedBlocks = new Set<string>();
    const usedControls = new Map<string, Set<string>>();

    if (malla) {
      const pieceValues = malla.values ?? {};
      for (const piece of malla.pieces ?? []) {
        if (piece.kind === 'ref') {
          const repoId = piece.ref.sourceId;
          if (!repoId) continue;

          const bounds = piece.ref.bounds;
          const offsetRow = bounds?.minRow ?? 0;
          const offsetCol = bounds?.minCol ?? 0;
          const repoEntry = repositorySnapshot.repository[repoId];
          const repoTemplate = repoEntry?.template;

          usedBlocks.add(repoId);

          const addControlCoord = (coord: string) => {
            let repoControls = usedControls.get(repoId);
            if (!repoControls) {
              repoControls = new Set<string>();
              usedControls.set(repoId, repoControls);
            }
            repoControls.add(coord);
          };

          const valuesForPiece = pieceValues[piece.id];
          if (valuesForPiece) {
            for (const key of Object.keys(valuesForPiece)) {
              const match = /^r(\d+)c(\d+)$/.exec(key);
              if (!match) continue;

              const row = Number.parseInt(match[1] ?? '', 10);
              const col = Number.parseInt(match[2] ?? '', 10);
              if (Number.isNaN(row) || Number.isNaN(col)) continue;

              addControlCoord(coordKey(row + offsetRow, col + offsetCol));
            }
          }

          if (repoTemplate && bounds) {
            for (let r = 0; r < bounds.rows; r++) {
              const templateRow = bounds.minRow + r;
              const rowCells = repoTemplate[templateRow];
              if (!rowCells) continue;
              for (let c = 0; c < bounds.cols; c++) {
                const templateCol = bounds.minCol + c;
                const cell = rowCells[templateCol];
                if (!isPersistentControlCell(cell)) continue;
                addControlCoord(coordKey(templateRow, templateCol));
              }
            }
          }
        } else if (piece.kind === 'snapshot' && piece.origin) {
          const repoId = piece.origin.sourceId;
          if (!repoId) continue;

          const bounds = piece.origin.bounds;
          const offsetRow = bounds?.minRow ?? 0;
          const offsetCol = bounds?.minCol ?? 0;
          const template = piece.template;

          usedBlocks.add(repoId);

          const addControlCoord = (coord: string) => {
            let repoControls = usedControls.get(repoId);
            if (!repoControls) {
              repoControls = new Set<string>();
              usedControls.set(repoId, repoControls);
            }
            repoControls.add(coord);
          };

          const valuesForPiece = pieceValues[piece.id];
          if (valuesForPiece) {
            for (const key of Object.keys(valuesForPiece)) {
              const match = /^r(\d+)c(\d+)$/.exec(key);
              if (!match) continue;

              const row = Number.parseInt(match[1] ?? '', 10);
              const col = Number.parseInt(match[2] ?? '', 10);
              if (Number.isNaN(row) || Number.isNaN(col)) continue;

              addControlCoord(coordKey(row + offsetRow, col + offsetCol));
            }
          }

          if (template) {
            for (let r = 0; r < template.length; r++) {
              const rowCells = template[r];
              if (!rowCells) continue;
              for (let c = 0; c < rowCells.length; c++) {
                const cell = rowCells[c];
                if (!isPersistentControlCell(cell)) continue;
                addControlCoord(coordKey(r + offsetRow, c + offsetCol));
              }
            }
          }
        }
      }
    }

    return { blocksInUse: usedBlocks, controlsInUse: usedControls };
  }, [malla, repositorySnapshot]);

  const blockInUse = useMemo(() => {
    if (!block?.repoId) return false;
    return blocksInUse.has(block.repoId);
  }, [block?.repoId, blocksInUse]);

  const activeRepoId = block?.repoId ?? null;

  const schedulePendingControlDataClearFlush = useCallback(() => {
    if (typeof React.startTransition === 'function') {
      React.startTransition(() => {
        bumpPendingControlDataClearTick((tick) => tick + 1);
      });
      return;
    }
    bumpPendingControlDataClearTick((tick) => tick + 1);
  }, []);

  const enqueueControlDataClearRequests = useCallback(
    (coords: Iterable<string>) => {
      if (!activeRepoId) return;

      let added = false;
      for (const coord of coords) {
        pendingControlDataClearsRef.current.push({
          coord,
          repoId: activeRepoId,
        });
        console.info('[ControlDeletion] Queueing diff cleanup request for control', {
          coord,
          repoId: activeRepoId,
          pendingQueueSize: pendingControlDataClearsRef.current.length,
        });
        added = true;
      }

      if (!added) return;
      schedulePendingControlDataClearFlush();
    },
    [activeRepoId, schedulePendingControlDataClearFlush],
  );

  const handleRequestControlDataClear = useCallback(
    (coordOrCoords: string | Iterable<string>) => {
      if (typeof coordOrCoords === 'string') {
        enqueueControlDataClearRequests([coordOrCoords]);
        return;
      }

      enqueueControlDataClearRequests(coordOrCoords);
    },
    [enqueueControlDataClearRequests],
  );

  useEffect(() => {
    if (pendingControlDataClearsRef.current.length === 0) {
      return;
    }

    const requests = pendingControlDataClearsRef.current;
    pendingControlDataClearsRef.current = [];

    const uniqueRequests = new Map<string, ControlDataClearRequest>();
    for (const request of requests) {
      const key = `${request.repoId}::${request.coord}`;
      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, request);
      }
    }

    if (uniqueRequests.size === 0) {
      return;
    }

    setMalla((prev) => {
      if (!prev) return prev;

      let workingValues = prev.values ?? {};
      let changed = false;

      for (const { repoId, coord } of uniqueRequests.values()) {
        const beforeSummary = summarizePieceValues(workingValues);

        console.info('[ControlDeletion] Processing diff cleanup request', {
          coord,
          repoId,
          queuedRequestCount: uniqueRequests.size,
        });
        console.info('[ControlDeletion] Snapshot before applying control value diff', {
          coord,
          repoId,
          hasValues: beforeSummary.hasValues,
          pieceCount: prev.pieces?.length ?? 0,
          trackedPieceCount: beforeSummary.pieceCount,
          nonEmptyPieceCount: beforeSummary.nonEmptyPieceCount,
          entryCount: beforeSummary.entryCount,
        });
        const updatedValues = clearControlValues({
          repoId,
          coordKey: coord,
          pieces: prev.pieces,
          pieceValues: workingValues,
        });
        if (updatedValues === workingValues) {
          console.info('[ControlDeletion] No control value diff generated for request', {
            coord,
            repoId,
            hasValues: beforeSummary.hasValues,
          });
          continue;
        }

        const diffSummary = diffPieceValues(workingValues, updatedValues);
        const afterSummary = summarizePieceValues(updatedValues);

        console.info('[ControlDeletion] Applied control value diff', {
          coord,
          repoId,
          diff: diffSummary,
          totals: {
            before: {
              trackedPieceCount: beforeSummary.pieceCount,
              nonEmptyPieceCount: beforeSummary.nonEmptyPieceCount,
              entryCount: beforeSummary.entryCount,
            },
            after: {
              trackedPieceCount: afterSummary.pieceCount,
              nonEmptyPieceCount: afterSummary.nonEmptyPieceCount,
              entryCount: afterSummary.entryCount,
            },
          },
        });
        workingValues = updatedValues;
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        values: workingValues,
      };
    });
  }, [pendingControlDataClearTick, setMalla]);

  useEffect(() => {
    const repoId = block?.repoId ?? null;
    if (!repoId) {
      previousTemplateControlsRef.current = new Map<string, TemplateControlSnapshot>();
      return;
    }

    const template = block?.draft.template;
    const currentControls = new Set<string>();

    if (template) {
      for (let r = 0; r < template.length; r += 1) {
        const row = template[r] ?? [];
        for (let c = 0; c < row.length; c += 1) {
          const cell = row[c];
          if (!isPersistentControlCell(cell)) continue;
          currentControls.add(coordKey(r, c));
        }
      }
    }

    const previousSnapshot = previousTemplateControlsRef.current.get(repoId);
    const previousControls = previousSnapshot?.active ?? new Set<string>();
    const previouslyCleaned = new Set(previousSnapshot?.cleaned ?? []);
    const coordsToClear = new Set<string>();

    for (const coord of currentControls) {
      previouslyCleaned.delete(coord);
    }

    for (const coord of previousControls) {
      if (currentControls.has(coord)) continue;
      if (previouslyCleaned.has(coord)) continue;
      coordsToClear.add(coord);
    }

    if (coordsToClear.size > 0) {
      for (const coord of coordsToClear) {
        handleRequestControlDataClear(coord);
      }
    }

    const nextCleaned = new Set(previouslyCleaned);
    for (const coord of coordsToClear) {
      nextCleaned.add(coord);
    }

    const updatedControls = new Map(previousTemplateControlsRef.current);
    updatedControls.set(repoId, { active: currentControls, cleaned: nextCleaned });
    previousTemplateControlsRef.current = updatedControls;
  }, [block?.draft.template, block?.repoId, handleRequestControlDataClear]);

  useEffect(() => {
    setBlock((prev) => {
      if (!prev?.repoId) return prev;
      const repoData = repositorySnapshot.repository[prev.repoId];
      if (!repoData) {
        const fallbackRepoId = Object.keys(repositorySnapshot.repository)[0] ?? null;
        if (!fallbackRepoId) {
          return null;
        }
        const fallbackData = repositorySnapshot.repository[fallbackRepoId];
        const fallbackMetadata = repositorySnapshot.metadata[fallbackRepoId] ?? null;
        if (fallbackData) {
          const fallbackTheme = normalizeProjectTheme(fallbackData.theme);
          setProjectThemeState(fallbackTheme);
          const content = toBlockContent(fallbackData);
          const draft = cloneBlockContent(content);
          return {
            draft,
            repoId: fallbackRepoId,
            repoName: fallbackMetadata?.name ?? fallbackRepoId,
            repoMetadata: fallbackMetadata,
            published: cloneBlockContent(content),
          };
        }
        return null;
      }
      const content = repoData ? toBlockContent(repoData) : null;
      if (blockContentEquals(prev.published, content)) return prev;
      return {
        ...prev,
        published: content ? cloneBlockContent(content) : null,
        repoMetadata: repositorySnapshot.metadata[prev.repoId] ?? prev.repoMetadata,
        repoName: repositorySnapshot.metadata[prev.repoId]?.name ?? prev.repoName,
      };
    });
  }, [repositorySnapshot, setBlock, setProjectThemeState]);

  const handleUpdateMaster: Dispatch<
    SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  > = useCallback(
    (update) => {
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
        const nextState = typeof update === 'function' ? update(prevState) : update;
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
    },
    [repositorySnapshot, setBlock],
  );

  return {
    blocksInUse,
    controlsInUse,
    blockInUse,
    handleRequestControlDataClear,
    handleUpdateMaster,
  };
}
