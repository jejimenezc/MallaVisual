// src/utils/project-file.ts
import type { BlockExport } from './block-io.ts';
import { importBlock } from './block-io.ts';
import type { MallaExport } from './malla-io.ts';
import { importMalla } from './malla-io.ts';
import { getFileNameWithoutExtension } from './file-name.ts';
import { logAppError } from '../core/runtime/logger.ts';

interface ProjectFileHandlers {
  onBlock: (data: BlockExport, inferredName?: string) => void | Promise<void>;
  onMalla: (data: MallaExport, inferredName?: string) => void | Promise<void>;
}

export async function handleProjectFile(
  file: File,
  handlers: ProjectFileHandlers,
): Promise<void> {
  const inferredName = getFileNameWithoutExtension(file.name);
  const text = await file.text();
  let mallaError: unknown = null;
  try {
    const malla = importMalla(text);
    await handlers.onMalla(malla, inferredName);
    return;
  } catch (error) {
    mallaError = error;
  }
  let blockError: unknown = null;
  try {
    const block = importBlock(text);
    await handlers.onBlock(block, inferredName);
    return;
  } catch (error) {
    blockError = error;
  }
  logAppError({
    scope: 'import-export',
    severity: 'non-fatal',
    message: 'El archivo importado no coincide con un proyecto ni con un bloque valido.',
    error: new Error('invalid-project-file'),
    context: {
      fileName: file.name,
      mallaError,
      blockError,
    },
  });
  throw new Error('invalid-project-file');
}
