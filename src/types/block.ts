export type BlockId = string;

export interface BlockMetadata {
  projectId: string;
  uuid: string;
  name: string;
  updatedAt: string;
}

export function createBlockId(projectId: string): BlockId {
  const safeProjectId = projectId && projectId.trim().length > 0 ? projectId.trim() : 'unknown';
  return `${safeProjectId}:${crypto.randomUUID()}`;
}

export function parseBlockId(id: BlockId): { projectId: string; uuid: string } {
  const [projectId = 'unknown', uuid = id] = id.split(':');
  return { projectId, uuid };
}

export function buildBlockId(projectId: string, uuid: string): BlockId {
  const safeProjectId = projectId && projectId.trim().length > 0 ? projectId.trim() : 'unknown';
  return `${safeProjectId}:${uuid}`;
}