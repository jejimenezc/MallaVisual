export const MAX_HISTORY = 100;

type HistoryMetadata<TMetadata> = Array<TMetadata | null>;

interface PushHistoryParams<TEntry, TMetadata> {
  entries: TEntry[];
  serialized: string[];
  index: number;
  newEntry: TEntry;
  newSerialized: string;
  metadata?: HistoryMetadata<TMetadata>;
  newMetadata?: TMetadata | null;
}

interface PushHistoryResult<TEntry, TMetadata> {
  entries: TEntry[];
  serialized: string[];
  index: number;
  metadata?: HistoryMetadata<TMetadata>;
}

export const pushHistoryEntry = <TEntry, TMetadata = unknown>({
  entries,
  serialized,
  index,
  newEntry,
  newSerialized,
  metadata,
  newMetadata = null,
}: PushHistoryParams<TEntry, TMetadata>): PushHistoryResult<TEntry, TMetadata> => {
  const truncatedEntries = entries.slice(0, index + 1);
  const truncatedSerialized = serialized.slice(0, index + 1);
  const truncatedMetadata = metadata?.slice(0, index + 1);

  truncatedEntries.push(newEntry);
  truncatedSerialized.push(newSerialized);
  if (truncatedMetadata) {
    truncatedMetadata.push(newMetadata);
  }

  let nextEntries = truncatedEntries;
  let nextSerialized = truncatedSerialized;
  let nextMetadata = truncatedMetadata;
  let nextIndex = truncatedEntries.length - 1;

  if (truncatedEntries.length > MAX_HISTORY) {
    const overflow = truncatedEntries.length - MAX_HISTORY;
    nextEntries = truncatedEntries.slice(overflow);
    nextSerialized = truncatedSerialized.slice(overflow);
    nextMetadata = truncatedMetadata ? truncatedMetadata.slice(overflow) : undefined;
    nextIndex -= overflow;
  }

  return {
    entries: nextEntries,
    serialized: nextSerialized,
    index: nextIndex,
    metadata: nextMetadata,
  };
};