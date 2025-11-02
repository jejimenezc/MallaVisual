// src/components/forms/TextConfigForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import type { BlockTemplateCell } from '../types/curricular';
import '../styles/TextConfigForm.css';
import { focusWithoutScroll } from '../utils/focusWithoutScroll';


interface Props {
  cell: BlockTemplateCell;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>) => void;
}

export const TextConfigForm: React.FC<Props> = ({ cell, coord, onUpdate }) => {
  const [label, setLabel] = useState(cell.label ?? '');
  const [placeholder, setPlaceholder] = useState(cell.placeholder ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `text-label-${coord.row}-${coord.col}`;
  const placeholderId = `text-placeholder-${coord.row}-${coord.col}`;

  useEffect(() => {
    setLabel(cell.label ?? '');
  }, [coord, cell.label]);

  useEffect(() => {
    setPlaceholder(cell.placeholder ?? '');
  }, [coord, cell.placeholder]);

  useEffect(() => {
    focusWithoutScroll(inputRef.current);
  }, [coord]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    onUpdate({ label: newLabel });
  };

  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPlaceholder(newValue);
    onUpdate({ placeholder: newValue });
  };

  return (
    <div className="control-config-form format-section__list">
      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={labelId}>Nombre del control</label>
          <span
            className="format-field__label-indicator"
            title="Esta propiedad no se muestra en la malla"
          >
            <EyeOff aria-hidden="true" size={16} />
            <span className="format-field__sr">Esta propiedad no se muestra en la malla</span>
          </span>
        </div>
        <input
          id={labelId}
          ref={inputRef}
          type="text"
          value={label}
          onChange={handleLabelChange}
          placeholder="Ej: Nombre del campo"
        />
      </div>

      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={placeholderId}>Texto de ayuda</label>
        </div>
        <input
          id={placeholderId}
          type="text"
          value={placeholder}
          onChange={handlePlaceholderChange}
          placeholder="Ej: Ingrese nombre completo"
        />
      </div>
    </div>
  );
};