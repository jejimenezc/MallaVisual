// src/components/SelectConfigForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { BlockTemplateCell } from '../types/curricular';
import '../styles/SelectConfigForm.css';
import { focusWithoutScroll } from '../utils/focusWithoutScroll';

interface SelectConfigFormProps {
  cell: BlockTemplateCell;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>, coord: { row: number; col: number }) => void;
}

export const SelectConfigForm: React.FC<SelectConfigFormProps> = ({ cell, coord, onUpdate }) => {
  const [label, setLabel] = useState(cell.label ?? '');
  const [rawOptions, setRawOptions] = useState(cell.dropdownOptions?.join(', ') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `select-label-${coord.row}-${coord.col}`;
  const optionsId = `select-options-${coord.row}-${coord.col}`;

  useEffect(() => {
    setLabel(cell.label ?? '');
    setRawOptions(cell.dropdownOptions?.join(', ') ?? '');
  }, [coord, cell.dropdownOptions, cell.label]);

  useEffect(() => {
    focusWithoutScroll(inputRef.current);
  }, [coord]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    onUpdate({ label: newLabel }, coord);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRawOptions(value);
    const options = value
      .split(',')
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
    onUpdate({ dropdownOptions: options }, coord);
  };

  return (
    <div className="control-config-form select-config-form format-section__list">
      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={labelId}>Nombre del control</label>
        </div>
        <input
          id={labelId}
          ref={inputRef}
          type="text"
          value={label}
          onChange={handleLabelChange}
          placeholder="Ej: Tipo de asignatura"
        />
      </div>

      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={optionsId}>Opciones (separadas por coma)</label>
        </div>
        <input
          id={optionsId}
          type="text"
          value={rawOptions}
          onChange={handleOptionsChange}
          placeholder="Ej: Obligatoria, Electiva, Optativa"
        />
      </div>
    </div>
  );
};