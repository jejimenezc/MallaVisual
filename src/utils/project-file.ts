// src/utils/project-file.ts
import type { BlockExport } from './block-io.ts';
import { importBlock } from './block-io.ts';
import type { MallaExport } from './malla-io.ts';
import { importMalla } from './malla-io.ts';
import { getFileNameWithoutExtension } from './file-name.ts';

interface ProjectFileHandlers {
  onBlock: (data: BlockExport, inferredName?: string) => void;
  onMalla: (data: MallaExport, inferredName?: string) => void;
}

export async function handleProjectFile(
  file: File,
  handlers: ProjectFileHandlers,
): Promise<void> {
  const inferredName = getFileNameWithoutExtension(file.name);
  const text = await file.text();
  try {
    const malla = importMalla(text);
    handlers.onMalla(malla, inferredName);
    return;
  } catch {
    // continue
  }
  try {
    const block = importBlock(text);
    handlers.onBlock(block, inferredName);
    return;
  } catch {
    // continue
  }
  throw new Error('invalid-project-file');
}