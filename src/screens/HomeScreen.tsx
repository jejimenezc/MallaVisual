// src/screens/HomeScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import type { BlockExport } from '../utils/block-io.ts';
import type { MallaExport } from '../utils/malla-io.ts';
import { useProject } from '../core/persistence/hooks.ts';
import { TwoPaneLayout } from '../layout/TwoPaneLayout';
import { Button } from '../components/Button';
import { handleProjectFile } from '../utils/project-file.ts';
import './HomeScreen.css';
import { useToast } from '../ui/toast/ToastContext.tsx';

interface Props {
  onNewBlock: () => void;
  onLoadBlock: (data: BlockExport, inferredName?: string) => void;
  onLoadMalla: (data: MallaExport, inferredName?: string) => void;
  onOpenProjectById: (id: string) => void;
  currentProjectId?: string;
  onProjectDeleted?: (id: string) => void;
  onProjectRenamed?: (id: string, name: string) => void;
  onShowIntro?: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  onNewBlock,
  onLoadBlock,
  onLoadMalla,
  onOpenProjectById,
  currentProjectId,
  onProjectDeleted,
  onProjectRenamed,
  onShowIntro,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { listProjects, removeProject, renameProject } = useProject();
  const [projects, setProjects] = useState(() => listProjects());
  const pushToast = useToast();

  useEffect(() => {
    setProjects(listProjects());
  }, [listProjects]);

  useEffect(() => {
    const key = 'introOverlaySeen';
    if (typeof window !== 'undefined' && !window.localStorage.getItem(key)) {
      onShowIntro?.();
      window.localStorage.setItem(key, 'true');
    }
  }, [onShowIntro]);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProjectFile(file, {
      onBlock: onLoadBlock,
      onMalla: onLoadMalla,
    })
      .catch(() => {
        pushToast('Archivo inválido', 'error');
      })
      .finally(() => {
        e.target.value = '';
      });
  };

  const handleDeleteProject = (id: string) => {
    removeProject(id);
    setProjects(listProjects());
    if (id === currentProjectId) {
      onProjectDeleted?.(id);
    }
  };

  const handleRenameProject = (id: string, currentName: string) => {
    const proposed = window.prompt('Nuevo nombre del proyecto', currentName);
    if (!proposed) return;
    const trimmed = proposed.trim();
    if (trimmed.length === 0 || trimmed === currentName) return;
    renameProject(id, trimmed);
    setProjects(listProjects());
    onProjectRenamed?.(id, trimmed);
  };

  const left = (
    <div className="project-list-section">
      <h3 className="project-list-heading">Proyectos recientes</h3>
      <div className="project-list-container">
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
                          onOpenProjectById(p.id);
                        }}
                      >
                        {p.name}
                      </a>{' '}
                      - {new Date(p.date).toLocaleString()}
                    </>
                  )}
                </td>
                <td className="actions-cell">
                  <button
                    className="icon-button"
                    title="Renombrar"
                    aria-label={`Renombrar ${p.name}`}
                    onClick={() => handleRenameProject(p.id, p.name)}
                  >
                    ✏️
                  </button>
                  {p.id === currentProjectId ? null : (
                    <button
                      className="icon-button"
                      title="Eliminar"
                      aria-label={`Eliminar ${p.name}`}
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
      </div>
    </div>
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

  return <TwoPaneLayout left={left} right={right} />;
};