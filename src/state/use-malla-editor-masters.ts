import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { BlockTemplate, MasterBlockData } from '../types/curricular.ts';
import type { BlockAspect, VisualTemplate } from '../types/visual.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import { blocksToRepository } from '../utils/repository-snapshot.ts';
import { blockContentEquals } from '../utils/block-content.ts';
import { computeMetrics } from '../utils/malla-editor-helpers.ts';
import { cropTemplate, getActiveBounds } from '../utils/block-active.ts';

interface UseMallaEditorMastersArgs {
  initialMalla?: {
    masters?: Record<string, MasterBlockData>;
    activeMasterId?: string;
  };
  repoId?: string | null;
  template: BlockTemplate;
  visual: VisualTemplate;
  aspect: BlockAspect;
  listBlocks: () => StoredBlock[];
  runHistoryTransaction: <T>(task: () => T | Promise<T>) => T | Promise<T>;
  onUpdateMaster?: React.Dispatch<
    React.SetStateAction<{
      template: BlockTemplate;
      visual: VisualTemplate;
      aspect: BlockAspect;
      repoId?: string | null;
    } | null>
  >;
  repoMinOuterFallback: { outerW: number; outerH: number };
}

interface UseMallaEditorMastersResult {
  availableMasters: StoredBlock[];
  mastersById: Record<string, MasterBlockData>;
  setMastersById: React.Dispatch<React.SetStateAction<Record<string, MasterBlockData>>>;
  initialMasters: Record<string, MasterBlockData>;
  initialMasterId: string;
  selectedMasterId: string;
  setSelectedMasterId: React.Dispatch<React.SetStateAction<string>>;
  selectedMasterIdRef: React.MutableRefObject<string>;
  skipNextMasterSyncRef: React.MutableRefObject<boolean>;
  repositorySnapshot: ReturnType<typeof blocksToRepository>;
  repositoryEntries: ReturnType<typeof blocksToRepository>['entries'];
  repoMinOuterW: number;
  repoMinOuterH: number;
}

export function useMallaEditorMasters({
  initialMalla,
  repoId,
  template,
  visual,
  aspect,
  listBlocks,
  runHistoryTransaction,
  repoMinOuterFallback,
}: UseMallaEditorMastersArgs): UseMallaEditorMastersResult {
  const [availableMasters, setAvailableMasters] = useState<StoredBlock[]>([]);

  const initialMasters = useMemo<Record<string, MasterBlockData>>(() => {
    let masters: Record<string, MasterBlockData> = {};
    if (initialMalla?.masters) {
      masters = { ...initialMalla.masters };
    } else if (repoId) {
      masters = { [repoId]: { template, visual, aspect } };
    }

    if (repoId && !masters[repoId]) {
      masters = {
        ...masters,
        [repoId]: { template, visual, aspect },
      };
    }

    return masters;
  }, [initialMalla, repoId, template, visual, aspect]);

  const initialMasterId = useMemo(() => {
    if (repoId) {
      return repoId;
    }
    if (initialMalla?.activeMasterId) {
      return initialMalla.activeMasterId;
    }
    const keys = Object.keys(initialMasters);
    if (keys.length > 0) {
      return keys[0];
    }
    return '';
  }, [initialMalla, initialMasters, repoId]);

  const [mastersById, setMastersById] = useState<Record<string, MasterBlockData>>(initialMasters);
  const [selectedMasterId, setSelectedMasterId] = useState(initialMasterId);
  const selectedMasterIdRef = useRef(selectedMasterId);
  const skipNextMasterSyncRef = useRef(false);

  const { repoMinOuterW, repoMinOuterH } = useMemo(() => {
    const masters = Object.values(mastersById);
    if (masters.length === 0) {
      return {
        repoMinOuterW: repoMinOuterFallback.outerW,
        repoMinOuterH: repoMinOuterFallback.outerH,
      };
    }

    let minOuterW = Number.POSITIVE_INFINITY;
    let minOuterH = Number.POSITIVE_INFINITY;
    for (const master of masters) {
      const masterBounds = getActiveBounds(master.template);
      const masterSubTemplate = cropTemplate(master.template, masterBounds);
      const { outerW, outerH } = computeMetrics(masterSubTemplate, master.aspect);
      if (outerW < minOuterW) {
        minOuterW = outerW;
      }
      if (outerH < minOuterH) {
        minOuterH = outerH;
      }
    }

    return {
      repoMinOuterW: Number.isFinite(minOuterW) ? minOuterW : repoMinOuterFallback.outerW,
      repoMinOuterH: Number.isFinite(minOuterH) ? minOuterH : repoMinOuterFallback.outerH,
    };
  }, [mastersById, repoMinOuterFallback.outerH, repoMinOuterFallback.outerW]);

  useEffect(() => {
    selectedMasterIdRef.current = selectedMasterId;
  }, [selectedMasterId]);

  useEffect(() => {
    if (!repoId) return;
    setSelectedMasterId((prevId) => (prevId === repoId ? prevId : repoId));
  }, [repoId]);

  useEffect(() => {
    setAvailableMasters(listBlocks());
    const handler = () => setAvailableMasters(listBlocks());
    window.addEventListener('block-repo-updated', handler);
    return () => window.removeEventListener('block-repo-updated', handler);
  }, [listBlocks]);

  const repositorySnapshot = useMemo(
    () => blocksToRepository(availableMasters),
    [availableMasters],
  );
  const repositoryEntries = repositorySnapshot.entries;

  useEffect(() => {
    if (availableMasters.length === 0) return;
    setMastersById((prev) => {
      let updated = false;
      let next = prev;
      for (const { metadata, data } of availableMasters) {
        const key = metadata.uuid;
        const incoming: MasterBlockData = {
          template: data.template,
          visual: data.visual,
          aspect: data.aspect,
        };
        if (!blockContentEquals(prev[key], incoming)) {
          if (!updated) {
            next = { ...prev };
            updated = true;
          }
          next[key] = incoming;
        }
      }
      return updated ? next : prev;
    });
  }, [availableMasters]);

  useEffect(() => {
    if (!selectedMasterId) return;
    if (skipNextMasterSyncRef.current) {
      skipNextMasterSyncRef.current = false;
      return;
    }
    const data: MasterBlockData = { template, visual, aspect };
    runHistoryTransaction(() => {
      setMastersById((prev) => ({
        ...prev,
        [selectedMasterId]: data,
      }));
    });
  }, [selectedMasterId, template, visual, aspect, runHistoryTransaction]);

  return {
    availableMasters,
    mastersById,
    setMastersById,
    initialMasters,
    initialMasterId,
    selectedMasterId,
    setSelectedMasterId,
    selectedMasterIdRef,
    skipNextMasterSyncRef,
    repositorySnapshot,
    repositoryEntries,
    repoMinOuterW,
    repoMinOuterH,
  };
}
