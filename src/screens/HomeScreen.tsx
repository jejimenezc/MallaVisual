// src/screens/HomeScreen.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { IntroOverlay } from '../components/IntroOverlay';
import type { BlockExport } from '../utils/block-io.ts';
import { importBlock } from '../utils/block-io.ts';
import type { MallaExport } from '../utils/malla-io.ts';
import { importMalla } from '../utils/malla-io.ts';
import { createLocalStorageProjectRepository } from '../utils/master-repo.ts';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { Button } from '../components/Button';
import './HomeScreen.css';

interface Props {
  onNewBlock: () => void;
  onLoadBlock: (data: BlockExport) => void;
  onLoadMalla: (data: MallaExport) => void;
  onOpenProject: (
    id: string,
    data: BlockExport | MallaExport,
    name: string,
  ) => void;
  currentProjectId?: string;
}

export const HomeScreen: React.FC<Props> = ({
  onNewBlock,
  onLoadBlock,
  onLoadMalla,
  onOpenProject,
  currentProjectId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const repo = useMemo(
    () => createLocalStorageProjectRepository<BlockExport | MallaExport>(),
    []
  );
  const [projects, setProjects] = useState(
    () => repo.list()
  );
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    setProjects(repo.list());
  }, [repo]);

  useEffect(() => {
    const key = 'introOverlaySeen';
    if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
      setShowIntro(true);
      window.localStorage.setItem(key, 'true');
    }
  }, []);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const malla = importMalla(text);
        onLoadMalla(malla);
      } catch {
        try {
          const block = importBlock(text);
          onLoadBlock(block);
        } catch {
          alert('Archivo inválido');
        }
      }
    });
    e.target.value = '';
  };

  const handleDeleteProject = (id: string) => {
    repo.remove(id);
    setProjects(repo.list());
  };

  const handleOpenProject = (id: string) => {
    const proj = repo.load(id);
    if (!proj) return;
    onOpenProject(id, proj.data, proj.meta.name);
  };

  const left = (
    <table className="project-list">
      <tbody>
        {projects.map((p) => (
          <tr key={p.id}>
            <td>
              {p.id === currentProjectId ? (
                <span>
                  {p.name} (actual) - {new Date(p.date).toLocaleString()}
                </span>
              ) : (
                <>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenProject(p.id);
                    }}
                  >
                    {p.name}
                  </a>{' '}
                  - {new Date(p.date).toLocaleString()}
                </>
              )}
            </td>
            <td className="trash-cell">
              {p.id === currentProjectId ? null : (
                <button
                  className="trash-button"
                  title="Eliminar"
                  onClick={() => handleDeleteProject(p.id)}
                >
                  🗑️
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const right = (
    <div className="home-actions">
      <Button onClick={onNewBlock}>Crear nuevo proyecto</Button>
      <Button onClick={handleLoadClick}>Cargar proyecto guardado</Button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );

  return (
    <>
      <TwoPaneLayout left={left} right={right} />
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}
    </>
  );
};
