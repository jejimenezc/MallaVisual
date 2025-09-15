// src/screens/HomeScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import { IntroOverlay } from '../components/IntroOverlay';
import type { BlockExport } from '../utils/block-io.ts';
import { importBlock } from '../utils/block-io.ts';
import type { MallaExport } from '../utils/malla-io.ts';
import { importMalla } from '../utils/malla-io.ts';
import { useProject } from '../core/persistence/hooks.ts';
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
  const { listProjects, loadProject, removeProject } = useProject();
  const [projects, setProjects] = useState(() => listProjects());
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    setProjects(listProjects());
  }, [listProjects]);

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
    removeProject(id);
    setProjects(listProjects());
  };

  const handleOpenProject = (id: string) => {
    const proj = loadProject(id);
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
      <Button onClick={onNewBlock}>Nuevo proyecto...</Button>
      <Button onClick={handleLoadClick}>Abrir proyecto...</Button>
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
