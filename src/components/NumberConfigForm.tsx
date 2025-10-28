// src/components/NumberConfigForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { EyeOff } from 'lucide-react';
import type { BlockTemplateCell } from '../types/curricular';
import '../styles/NumberConfigForm.css';
import { focusWithoutScroll } from '../utils/focusWithoutScroll';

interface Props {
  cell: BlockTemplateCell;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>) => void;
}

export const NumberConfigForm: React.FC<Props> = ({ cell, coord, onUpdate }) => {
  const [label, setLabel] = useState(cell.label ?? '');
  const [placeholder, setPlaceholder] = useState(cell.placeholder ?? '');
  const [decimalDigits, setDecimalDigits] = useState(cell.decimalDigits ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `number-label-${coord.row}-${coord.col}`;
  const placeholderId = `number-placeholder-${coord.row}-${coord.col}`;
  const decimalId = `number-decimals-${coord.row}-${coord.col}`;

  useEffect(() => {
    setLabel(cell.label ?? '');
    setPlaceholder(cell.placeholder ?? '');
    setDecimalDigits(cell.decimalDigits ?? 0);
  }, [coord, cell.decimalDigits, cell.label, cell.placeholder]);

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

  const handleDecimalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Number(e.target.value));
    setDecimalDigits(value);
    onUpdate({ decimalDigits: value });
  };

  return (
    <div className="control-config-form number-config-form format-section__list">
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
          placeholder="Ej: Cantidad"
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
          placeholder="Ej: 0"
        />
      </div>

      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={decimalId}>Dígitos decimales</label>
        </div>
        <input
          id={decimalId}
          type="number"
          min={0}
          value={decimalDigits}
          onChange={handleDecimalsChange}
        />
      </div>
    </div>
  );
};