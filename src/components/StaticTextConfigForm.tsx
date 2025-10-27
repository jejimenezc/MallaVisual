// StaticTextConfigForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import '../styles/StaticTextConfigForm.css';

interface Props {
  value: string;
  coord: { row: number; col: number };
  onChange: (newValue: string) => void;
}

const StaticTextConfigForm: React.FC<Props> = ({ value, coord, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  const inputId = `static-text-${coord.row}-${coord.col}`;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [coord]);

  useEffect(() => {
    setText(value);
  }, [coord, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    onChange(newValue);
  };

  return (
    <div className="static-text-config-form format-section__list">
      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={inputId}>Textbox</label>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          placeholder="Ej. 'Créditos Totales'"
        />
      </div>
    </div>
  );
};

export default StaticTextConfigForm;