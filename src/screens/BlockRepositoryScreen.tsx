// src/screens/BlockRepositoryScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { BlockSnapshot } from '../components/BlockSnapshot';
import { Button } from '../components/Button';
import { useBlocksRepo } from '../core/persistence/hooks.ts';
import type { StoredBlock } from '../utils/block-repo.ts';
import { buildBlockId, createBlockId, parseBlockId } from '../types/block.ts';
import './BlockRepositoryScreen.css';
import { getFileNameWithoutExtension } from '../utils/file-name.ts';

interface BlockRepositoryScreenProps {
  onBlockImported?: (block: StoredBlock) => void;
  onOpenBlock?: (block: StoredBlock) => void;
  activeProjectId?: string;
  blocksInUse?: ReadonlySet<string>;
}

export const BlockRepositoryScreen: React.FC<BlockRepositoryScreenProps> = ({
  onBlockImported,
  onOpenBlock,
  activeProjectId,
  blocksInUse,
}) => {
  const {
    listBlocks,
    saveBlock,
    removeBlock,
    importBlock,
    exportBlock,
    updateBlockMetadata,
  } = useBlocksRepo();
  const [blocks, setBlocks] = useState<StoredBlock[]>([]);
  const [selectedUuid, setSelectedUuid] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setBlocks(listBlocks());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('block-repo-updated', handler);
    return () => window.removeEventListener('block-repo-updated', handler);
  }, [listBlocks]);

  const handleImport = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inferredName = getFileNameWithoutExtension(file.name);
    file.text().then((text) => {
      try {
        const data = importBlock(text);
        const metadataFromFile = data.metadata;
        const existingUuids = new Set(blocks.map((b) => b.metadata.uuid));
        const fallbackName = inferredName || metadataFromFile?.name?.trim() || 'sin-nombre';
        const baseProject =
          (metadataFromFile?.projectId && metadataFromFile.projectId.trim().length > 0
            ? metadataFromFile.projectId.trim()
            : activeProjectId) ?? 'repository';
        const candidateUuid = metadataFromFile?.uuid?.trim();
        let targetId: string;
        let targetUuid: string;
        if (candidateUuid && !existingUuids.has(candidateUuid)) {
          targetUuid = candidateUuid;
          targetId = buildBlockId(baseProject, candidateUuid);
        } else {
          const generatedId = createBlockId(baseProject);
          const parsed = parseBlockId(generatedId);
          targetId = generatedId;
          targetUuid = parsed.uuid;
        }
        const now = new Date().toISOString();
        const metadata = {
          projectId: baseProject,
          uuid: targetUuid,
          name: fallbackName,
          updatedAt: metadataFromFile?.updatedAt ?? now,
        };
        const block: StoredBlock = {
          id: targetId,
          metadata,
          data: {
            ...data,
            metadata,
          },
        };
        saveBlock(block);
        refresh();
        onBlockImported?.(block);
        setSelectedUuid(block.metadata.uuid);
      } catch (err) {
        alert((err as Error).message);
      }
    });
    e.target.value = '';
  };

  const handleExport = () => {
    const rec = blocks.find((b) => b.metadata.uuid === selectedUuid);
    if (!rec) return;
    const json = exportBlock({ ...rec.data, metadata: rec.metadata });
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${rec.metadata.name || rec.metadata.uuid}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDelete = () => {
    if (!selectedUuid) return;
    const rec = blocks.find((b) => b.metadata.uuid === selectedUuid);
    if (!rec) return;
    const blockLabel = rec.metadata.name?.trim() || rec.metadata.uuid || 'el bloque';
    if (blocksInUse?.has(rec.metadata.uuid)) {
      alert(`No es posible eliminar "${blockLabel}" porque está en uso en la malla.`);
      return;
    }
    const confirmed = window.confirm(
      `Se eliminará "${blockLabel}" del repositorio. Esta acción no se puede deshacer. ¿Deseas continuar?`,
    );
    if (!confirmed) return;
    removeBlock(rec.id);
    refresh();
    setSelectedUuid('');
  };

  const handleOpen = () => {
    if (!selectedUuid) return;
    const block = blocks.find((b) => b.metadata.uuid === selectedUuid);
    if (!block) return;
    onOpenBlock?.(block);
  };

  const handleRename = () => {
    if (!selectedUuid) return;
    const block = blocks.find((b) => b.metadata.uuid === selectedUuid);
    if (!block) return;
    const input = prompt('Nuevo nombre del bloque', block.metadata.name);
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      alert('Debes ingresar un nombre para el bloque.');
      return;
    }
    updateBlockMetadata(block.id, {
      name: trimmed,
      updatedAt: new Date().toISOString(),
    });
    refresh();
  };

  const gallery = (
    <div className="block-gallery">
      {blocks
        .slice()
        .sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))
        .map(({ data, metadata }) => (
          <div
            key={metadata.uuid}
            className={`gallery-item ${selectedUuid === metadata.uuid ? 'selected' : ''}`}
            onClick={() => setSelectedUuid(metadata.uuid)}
          >
            <BlockSnapshot
              template={data.template}
              visualTemplate={data.visual}
              aspect={data.aspect}
            />
            <div className="block-name">{metadata.name}</div>
            {/*   <div className="block-id">UUID: {metadata.uuid}</div>*/}
          </div>
        ))}
    </div>
  );

  const actions = (
    <div className="repo-actions">
      <Button onClick={handleImport}>Importar</Button>
      <Button onClick={handleExport} disabled={!selectedUuid}>
        Exportar
      </Button>
      <Button onClick={handleDelete} disabled={!selectedUuid}>
        Eliminar
      </Button>
      <Button onClick={handleOpen} disabled={!selectedUuid}>
        Abrir en editor
      </Button>
      <Button onClick={handleRename} disabled={!selectedUuid}>
        Renombrar
      </Button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );

  return <TwoPaneLayout left={gallery} right={actions} />;
};