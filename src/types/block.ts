export type BlockId = string;

export interface BlockMetadata {
  projectId: string;
  name: string;
  updatedAt: string;
}

export function createBlockId(projectId: string): BlockId {
  const safeProjectId = projectId && projectId.trim().length > 0 ? projectId.trim() : 'unknown';
  return `${safeProjectId}:${crypto.randomUUID()}`;
}