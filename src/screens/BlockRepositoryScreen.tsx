// src/screens/BlockRepositoryScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { BlockSnapshot } from '../components/BlockSnapshot';
import { Button } from '../components/Button';
import {
  listBlocks,
  saveBlock,
  removeBlock,
  importBlock,
  exportBlock,
  type StoredBlock,
} from '../utils/block-repo.ts';
import './BlockRepositoryScreen.css';

export const BlockRepositoryScreen: React.FC = () => {
  const [blocks, setBlocks] = useState<StoredBlock[]>([]);
  const [selected, setSelected] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setBlocks(listBlocks());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('block-repo-updated', handler);
    return () => window.removeEventListener('block-repo-updated', handler);
  }, []);

  const handleImport = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = importBlock(text);
        const name = prompt('Nombre del bloque') || 'sin-nombre';
        saveBlock({ id: name, data });
        refresh();
        window.dispatchEvent(new Event('block-repo-updated'));
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
    a.download = `${rec.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDelete = () => {
    if (!selected) return;
    removeBlock(selected);
    refresh();
    window.dispatchEvent(new Event('block-repo-updated'));
    setSelected('');
  };

  const gallery = (
    <div className="block-gallery">
      {blocks.map(({ id, data }) => (
        <div
          key={id}
          className={`gallery-item ${selected === id ? 'selected' : ''}`}
          onClick={() => setSelected(id)}
        >
          <BlockSnapshot
            template={data.template}
            visualTemplate={data.visual}
            aspect={data.aspect}
          />
          <div className="block-name">{id}</div>
        </div>
      ))}
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