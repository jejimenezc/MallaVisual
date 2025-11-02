// src/components/SelectConfigForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import type { BlockTemplateCell } from '../types/curricular';
import '../styles/SelectConfigForm.css';
import { focusWithoutScroll } from '../utils/focusWithoutScroll';

interface SelectConfigFormProps {
  cell: BlockTemplateCell;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>, coord: { row: number; col: number }) => void;
  onOptionsEditingChange?: (isEditing: boolean) => void;
}

export const SelectConfigForm: React.FC<SelectConfigFormProps> = ({
  cell,
  coord,
  onUpdate,
  onOptionsEditingChange,
}) => {
  const [label, setLabel] = useState(cell.label ?? '');
  const [rawOptions, setRawOptions] = useState(cell.dropdownOptions?.join(', ') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `select-label-${coord.row}-${coord.col}`;
  const optionsId = `select-options-${coord.row}-${coord.col}`;

  useEffect(() => {
    setLabel(cell.label ?? '');
  }, [coord, cell.label]);

  useEffect(() => {
    const serialized = cell.dropdownOptions?.join(', ') ?? '';
    setRawOptions((prev) => (prev === serialized ? prev : serialized));
  }, [coord, cell.dropdownOptions]);

  useEffect(() => {
    focusWithoutScroll(inputRef.current);
  }, [coord]);

  useEffect(() => () => onOptionsEditingChange?.(false), [onOptionsEditingChange, coord.row, coord.col]);

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
    const existing = cell.dropdownOptions ?? [];
    const hasChanged =
      existing.length !== options.length || existing.some((opt, idx) => opt !== options[idx]);

    if (hasChanged) {
      onUpdate({ dropdownOptions: options }, coord);
    }
  };

  return (
    <div className="control-config-form select-config-form format-section__list">
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
          onFocus={() => onOptionsEditingChange?.(true)}
          onBlur={() => onOptionsEditingChange?.(false)}
          placeholder="Ej: Obligatoria, Electiva, Optativa"
        />
      </div>
    </div>
  );
};