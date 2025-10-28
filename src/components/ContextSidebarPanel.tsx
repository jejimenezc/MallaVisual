// src/components/ContextSidebarPanel.tsx

import React from 'react';
import './ContextSidebarPanel.css';
import type { BlockTemplateCell, BlockTemplate } from '../types/curricular';

import StaticTextConfigForm from './StaticTextConfigForm';
import { TextConfigForm } from './TextConfigForm';
import { CheckboxConfigForm } from './CheckboxConfigForm';
import { SelectConfigForm } from './SelectConfigForm';
import { NumberConfigForm } from './NumberConfigForm';
import { CalculatedConfigForm } from './CalculatedConfigForm';

interface Props {
  selectedCount: number;
  canCombine: boolean;
  canSeparate: boolean;
  onCombine: () => void;
  onSeparate: () => void;

  selectedCell?: BlockTemplateCell | null;
  selectedCoord?: { row: number; col: number };

  onUpdateCell?: (
    updatedCell: Partial<BlockTemplateCell>,
    coord?: { row: number; col: number }
  ) => void;

  combineDisabledReason?: string;
  template: BlockTemplate;

}

const CONTROL_TOOLTIPS: Record<
  NonNullable<BlockTemplateCell['type']>,
  { title: string; tooltip: string }
> = {
  staticText: {
    title: 'Texto fijo',
    tooltip: 'El control de texto fijo desplegará en la malla el contenido que ingresas aquí.',
  },
  text: {
    title: 'Texto libre',
    tooltip:
      'El control de texto libre permitirá ingresar contenido en el diseño de la malla.',
  },
  checkbox: {
    title: 'Checkbox',
    tooltip: 'El control de checkbox permitirá marcar o desmarcar una opción en la malla.',
  },
  select: {
    title: 'Lista desplegable',
    tooltip: 'La lista desplegable permitirá elegir una opción entre las que definas aquí.',
  },
  number: {
    title: 'Número',
    tooltip: 'El control numérico permitirá registrar valores cuantitativos en la malla.',
  },
  calculated: {
    title: 'Campo calculado',
    tooltip: 'El campo calculado mostrará resultados a partir de operaciones con otros números.',
  },
};

export const ContextSidebarPanel: React.FC<Props> = ({
  selectedCount,
  canCombine,
  canSeparate,
  onCombine,
  onSeparate,
  selectedCell,
  selectedCoord,
  onUpdateCell,
  combineDisabledReason,
  template,
}) => {
  const patchCell = (update: Partial<BlockTemplateCell>) => {
    if (!onUpdateCell || !selectedCoord) return;
    onUpdateCell(update, selectedCoord);
  };

  const renderConfigSection = () => {
    if (!selectedCell || !selectedCell.type || !selectedCoord) {
      return (
        <section className="format-section" aria-labelledby="configuracion-control">
          <header className="format-section__header">
            <div className="format-section__title">
              <span className="format-section__eyebrow">Configuración</span>
            <span
              className="format-section__tooltip"
              title="Selecciona un control para ajustar sus opciones."
              aria-hidden="true"
            >
              ?
            </span>
            </div>
          </header>
          <p className="format-section__empty">
            Aún no hay un control seleccionado. Selecciona una celda con un control definido para ver sus opciones.
          </p>
        </section>
      );
    }

    const meta = CONTROL_TOOLTIPS[selectedCell.type];

    return (
      <section
        key={selectedCell.type}
        className="format-section"
        aria-labelledby={`config-${selectedCell.type}`}
      >
        <header className="format-section__header">
          <div className="format-section__title">
            <span className="format-section__eyebrow">{meta.title}</span>
          <span className="format-section__tooltip" title={meta.tooltip} aria-hidden="true">
            ?
          </span>
          </div>
        </header>

        {selectedCell.type === 'staticText' && (
          <StaticTextConfigForm
            value={selectedCell.label ?? ''}
            coord={selectedCoord}
            onChange={(newValue) => patchCell({ label: newValue })}
          />
        )}

        {selectedCell.type === 'text' && (
          <TextConfigForm cell={selectedCell} coord={selectedCoord} onUpdate={(u) => patchCell(u)} />
        )}

        {selectedCell.type === 'checkbox' && (
          <CheckboxConfigForm
            cell={selectedCell}
            coord={selectedCoord}
            onUpdate={(u) => patchCell(u)}
          />
        )}

        {selectedCell.type === 'select' && (
          <SelectConfigForm
            cell={selectedCell}
            coord={selectedCoord}
            onUpdate={(u, coord) => {
              if (onUpdateCell) onUpdateCell(u, coord);
            }}
          />
        )}

        {selectedCell.type === 'number' && (
          <NumberConfigForm
            cell={selectedCell}
            coord={selectedCoord}
            onUpdate={(u) => patchCell(u)}
          />
        )}

        {selectedCell.type === 'calculated' && (
          <CalculatedConfigForm
            cell={selectedCell}
            template={template}
            coord={selectedCoord}
            onUpdate={(u) => patchCell(u)}
          />
        )}
      </section>
    );
  };

  return (
    <aside className="context-sidebar-panel format-style-panel" aria-label="Controles del bloque">
      <header className="format-panel-header">
        <div className="format-panel-title">
          <span aria-hidden="true">🕹️</span>
          <h3>Controles de bloque</h3>
        </div>
      </header>

      <section className="format-section" aria-labelledby="seccion-seleccion">
        <header className="format-section__header">
          <div className="format-section__title">
            <span className="format-section__eyebrow">Selección</span>
          <span
            className="format-section__tooltip"
            title="Gestiona la selección actual de celdas para combinar o separar."
            aria-hidden="true"
          >
            ?
          </span>
         </div>          
        </header>
        <div className="format-field" role="status" aria-live="polite">
          <div className="format-field__label">
            <span>Celdas seleccionadas</span>
          </div>
          <div className="format-field__inline">
            <strong className="context-sidebar-panel__count">{selectedCount}</strong>
          </div>
        </div>
        <div className="format-field">
          <div className="format-field__label">
            <span>Acciones</span>
          </div>
          <div className="format-field__stack">
            <button
              className="btn context-sidebar-panel__action"
              disabled={!canCombine}
              onClick={onCombine}
              title="Combinar celdas seleccionadas"
              type="button"
            >
              Combinar
            </button>
            <button
              className="btn context-sidebar-panel__action"
              disabled={!canSeparate}
              onClick={onSeparate}
              title="Separar celdas seleccionadas"
              type="button"
            >
              Separar
            </button>
          </div>
        </div>

        {!canCombine && combineDisabledReason && (
          <p className="sidebar-hint" role="status" aria-live="polite">
            {combineDisabledReason}
          </p>
        )}
      </section>

      {renderConfigSection()}
    </aside>
  );
};