// src/components/CheckboxConfigForm.tsx

import React, { useEffect, useRef, useState } from 'react';
import type { BlockTemplateCell } from '../types/curricular';
import '../styles/CheckboxConfigForm.css';

export interface CheckboxConfigFormProps {
  cell: BlockTemplateCell;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>) => void;
}

export const CheckboxConfigForm: React.FC<CheckboxConfigFormProps> = ({ cell, coord, onUpdate }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(cell.label ?? '');
  const inputId = `checkbox-label-${coord.row}-${coord.col}`;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [coord]);

  useEffect(() => {
    setLabel(cell.label ?? '');
  }, [coord, cell.label]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    onUpdate({ label: newLabel });
  };

  return (
    <div className="control-config-form checkbox-config-form format-section__list">
      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={inputId}>Etiqueta</label>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={label}
          onChange={handleChange}
          placeholder="Ej: ¿Curso aprobado?"
        />
      </div>
    </div>
  );
};