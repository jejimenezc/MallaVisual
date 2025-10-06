// src/screens/BlockRepositoryScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { BlockSnapshot } from '../components/BlockSnapshot';
import { Button } from '../components/Button';
import { useBlocksRepo } from '../core/persistence/hooks.ts';
import { LEGACY_PROJECT_ID, type StoredBlock } from '../utils/block-repo.ts';
import './BlockRepositoryScreen.css';
import { getFileNameWithoutExtension } from '../utils/file-name.ts';

const generateRepoId = (): string => {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `block-${Math.random().toString(36).slice(2, 10)}`;
};

interface BlockRepositoryScreenProps {
  onBlockImported?: (block: StoredBlock) => void;
  onOpenBlock?: (block: StoredBlock) => void;
  projectId?: string | null;
  projectName?: string;
}

export const BlockRepositoryScreen: React.FC<BlockRepositoryScreenProps> = ({
  onBlockImported,
  onOpenBlock,
  projectId,
  projectName,
}) => {
  const { listBlocks, saveBlock, removeBlock, importBlock, exportBlock } =
    useBlocksRepo(projectId);
  const [blocks, setBlocks] = useState<StoredBlock[]>([]);
  const [selected, setSelected] = useState<string>('');
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
    const inferredName = getFileNameWithoutExtension(file.name)?.trim();
    file.text().then((text) => {
      try {
        const data = importBlock(text);
        const existingName = data.meta?.name?.trim();
        const friendlyName = existingName || inferredName || projectName || 'sin-nombre';
        const repoId = generateRepoId();
        const blockData = {
          ...data,
          meta: { ...(data.meta ?? {}), name: friendlyName },
        };
        saveBlock({ id: repoId, data: blockData });
        const updatedBlocks = listBlocks();
        setBlocks(updatedBlocks);
        const stored =
          updatedBlocks.find((b) => b.id === repoId) ?? ({
            id: repoId,
            projectId: projectId ?? LEGACY_PROJECT_ID,
            data: blockData,
          } as StoredBlock);
        onBlockImported?.(stored);
        setSelected(repoId);
      } catch (err) {
        alert((err as Error).message);
      }
    });
    e.target.value = '';
  };

  const handleExport = () => {
    const rec = blocks.find((b) => b.id === selected);
    if (!rec) return;
    const json = exportBlock(rec.data);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const downloadName = rec.data.meta?.name ?? rec.id;
    a.download = `${downloadName}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDelete = () => {
    if (!selected) return;
    removeBlock(selected);
    refresh();
    setSelected('');
  };

  const handleOpen = () => {
    if (!selected) return;
    const block = blocks.find((b) => b.id === selected);
    if (!block) return;
    onOpenBlock?.(block);
  };

  const gallery = (
    <div className="block-gallery">
      {blocks.map(({ id, data }) => {
        const displayName = data.meta?.name ?? id;
        return (
          <div
            key={id}
            className={`gallery-item ${selected === id ? 'selected' : ''}`}
            onClick={() => setSelected(id)}
            title={displayName !== id ? `${displayName} (${id})` : id}
          >
            <BlockSnapshot
              template={data.template}
              visualTemplate={data.visual}
              aspect={data.aspect}
            />
            <div className="block-name">{displayName}</div>
          </div>
        );
      })}
    </div>
  );

  const actions = (
    <div className="repo-actions">
      <Button onClick={handleImport}>Importar</Button>
      <Button onClick={handleExport} disabled={!selected}>
        Exportar
      </Button>
      <Button onClick={handleDelete} disabled={!selected}>
        Eliminar
      </Button>
      <Button onClick={handleOpen} disabled={!selected}>
        Abrir en editor
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