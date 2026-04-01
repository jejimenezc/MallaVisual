import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { BlockTemplate } from '../types/curricular.ts';
import type { VisualTemplate, BlockAspect } from '../types/visual.ts';
import { cloneBlockContent, type BlockContent } from '../utils/block-content.ts';
import { computeSignature } from '../utils/comparators.ts';
import { pushHistoryEntry } from '../utils/history.ts';

export interface VisualUpdateMetadata {
  historyBatchId?: string;
}

interface UseBlockEditorHistoryArgs {
  draftContent: BlockContent;
  initialDataSignature: string | null;
  pendingVisualUpdateMetaRef: React.MutableRefObject<VisualUpdateMetadata | null>;
  setTemplate: React.Dispatch<React.SetStateAction<BlockTemplate>>;
  setVisual: (
    update: React.SetStateAction<VisualTemplate>,
    meta?: VisualUpdateMetadata,
  ) => void;
  setAspect: React.Dispatch<React.SetStateAction<BlockAspect>>;
  onDraftChange?: (draft: BlockContent) => void;
}

interface UseBlockEditorHistoryResult {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useBlockEditorHistory({
  draftContent,
  initialDataSignature,
  pendingVisualUpdateMetaRef,
  setTemplate,
  setVisual,
  setAspect,
  onDraftChange,
}: UseBlockEditorHistoryArgs): UseBlockEditorHistoryResult {
  const draftSerialized = computeSignature(draftContent);
  const historyRef = useRef<BlockContent[]>([]);
  const historySerializedRef = useRef<string[]>([]);
  const historyMetadataRef = useRef<(VisualUpdateMetadata | null)[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isHistoryInitialized, setIsHistoryInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const ignoreNextInitialDataRef = useRef(false);

  useEffect(() => {
    if (ignoreNextInitialDataRef.current) {
      ignoreNextInitialDataRef.current = false;
      return;
    }
    setIsHistoryInitialized(false);
  }, [initialDataSignature]);

  useEffect(() => {
    if (!isHistoryInitialized) {
      const initialEntry = cloneBlockContent(draftContent);
      historyRef.current = [initialEntry];
      historySerializedRef.current = [draftSerialized];
      historyMetadataRef.current = [null];
      pendingVisualUpdateMetaRef.current = null;
      setHistoryIndex(0);
      setIsHistoryInitialized(true);
      return;
    }
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      pendingVisualUpdateMetaRef.current = null;
      return;
    }
    const currentSerialized = historySerializedRef.current[historyIndex];
    if (currentSerialized === draftSerialized) {
      pendingVisualUpdateMetaRef.current = null;
      return;
    }
    const truncatedHistory = historyRef.current.slice(0, historyIndex + 1);
    const truncatedSerialized = historySerializedRef.current.slice(0, historyIndex + 1);
    const truncatedMetadata = historyMetadataRef.current.slice(0, historyIndex + 1);
    const nextEntry = cloneBlockContent(draftContent);
    const pendingMeta = pendingVisualUpdateMetaRef.current;
    pendingVisualUpdateMetaRef.current = null;
    if (
      pendingMeta?.historyBatchId &&
      truncatedHistory.length > 0 &&
      truncatedMetadata[truncatedMetadata.length - 1]?.historyBatchId === pendingMeta.historyBatchId
    ) {
      truncatedHistory[truncatedHistory.length - 1] = nextEntry;
      truncatedSerialized[truncatedSerialized.length - 1] = draftSerialized;
      truncatedMetadata[truncatedMetadata.length - 1] = pendingMeta;
      historyRef.current = truncatedHistory;
      historySerializedRef.current = truncatedSerialized;
      historyMetadataRef.current = truncatedMetadata;
      setHistoryIndex(truncatedHistory.length - 1);
      return;
    }
    const result = pushHistoryEntry({
      entries: historyRef.current,
      serialized: historySerializedRef.current,
      index: historyIndex,
      newEntry: nextEntry,
      newSerialized: draftSerialized,
      metadata: historyMetadataRef.current,
      newMetadata: pendingMeta ?? null,
    });
    historyRef.current = result.entries;
    historySerializedRef.current = result.serialized;
    historyMetadataRef.current = result.metadata ?? [];
    setHistoryIndex(result.index);
  }, [
    draftContent,
    draftSerialized,
    historyIndex,
    isHistoryInitialized,
    pendingVisualUpdateMetaRef,
  ]);

  const applyHistoryEntry = useCallback(
    (entry: BlockContent) => {
      const clone = cloneBlockContent(entry);
      setTemplate(clone.template);
      setVisual(clone.visual);
      setAspect(clone.aspect);
    },
    [setAspect, setTemplate, setVisual],
  );

  useEffect(() => {
    if (!onDraftChange) return;
    ignoreNextInitialDataRef.current = true;
    onDraftChange(cloneBlockContent(draftContent));
  }, [draftContent, onDraftChange]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistoryEntry(entry);
    setHistoryIndex(newIndex);
  }, [applyHistoryEntry, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = historyRef.current[newIndex];
    if (!entry) return;
    isRestoringRef.current = true;
    applyHistoryEntry(entry);
    setHistoryIndex(newIndex);
  }, [applyHistoryEntry, historyIndex]);

  return {
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyRef.current.length - 1,
    handleUndo,
    handleRedo,
  };
}
