// src/components/CalculatedConfigForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { BlockTemplateCell, BlockTemplate } from '../types/curricular.ts';
import '../styles/CalculatedConfigForm.css';

interface Props {
  cell: BlockTemplateCell;
  template: BlockTemplate;
  coord: { row: number; col: number };
  onUpdate: (updated: Partial<BlockTemplateCell>) => void;
}

export const CalculatedConfigForm: React.FC<Props> = ({
  cell,
  template,
  coord,
  onUpdate,
}) => {
  const numberCells = template
    .flatMap((row, rIdx) =>
      row.map((c, cIdx) =>
        c.type === 'number'
          ? {
              key: `r${rIdx}c${cIdx}`,
              label: c.label && c.label.trim().length > 0
                ? c.label
                : `(${rIdx + 1},${cIdx + 1})`,
            }
          : null
      )
    )
    .filter((v): v is { key: string; label: string } => v !== null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState(cell.label ?? '');
  const [expression, setExpression] = useState(cell.expression ?? '');
  const labelId = `calculated-label-${coord.row}-${coord.col}`;
  const selectId = `calculated-source-${coord.row}-${coord.col}`;
  const expressionId = `calculated-expression-${coord.row}-${coord.col}`;


  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    setExpression(cell.expression ?? '');

  }, [coord, cell.expression]);

  useEffect(() => {
    setLabel(cell.label ?? '');
  }, [coord, cell.label]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = e.target.value;
    setLabel(newLabel);
    onUpdate({ label: newLabel });
  };

  const insertToken = (token: string) => {
    const next = (expression ?? '') + token;
    setExpression(next);
    onUpdate({ expression: next });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      insertToken(val);
      e.target.selectedIndex = 0;
    }
  };

  const handleTokenClick = (tok: string) => () => insertToken(tok);

  const handleBackspace = () => {
    if (!expression) return;
    const next = expression.slice(0, -1);
    setExpression(next);
    onUpdate({ expression: next });
  };

  const noNumberMsg =
    'Para definir un cálculo se requieren celdas numéricas. No hay celdas numéricas en el bloque';

  const operatorTokens: { label: string; value: string; aria?: string }[] = [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '×', value: '*', aria: 'Multiplicar' },
    { label: '÷', value: '/', aria: 'Dividir' },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
  ];

  const digitTokens = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

  return (
    <div className="control-config-form calculated-config-form format-section__list">
      <div className="format-field">
        <div className="format-field__label">
          <label htmlFor={labelId}>Etiqueta</label>
        </div>
        <input
          id={labelId}
          ref={inputRef}
          type="text"
          value={label}
          onChange={handleLabelChange}
          placeholder="Ej: Total"
        />
      </div>
      <p className="format-field__hint">
        Info: se detectan {numberCells.length} campos numéricos en el bloque.
      </p>
      {numberCells.length === 0 ? (
        <p className="format-section__empty">{noNumberMsg}</p>
      ) : (
        <div
          className="calculated-config-form__builder"
          role="group"
          aria-label="Constructor de fórmulas"
        >
          <div className="format-field calculated-config-form__source">
            <div className="format-field__label">
              <label htmlFor={selectId}>Agregar celda numérica</label>
            </div>
            <select id={selectId} onChange={handleSelectChange} defaultValue="">
              <option value="" disabled>
                Seleccionar celda
              </option>
              {numberCells.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="calculated-config-form__keypad">
            <div className="calculated-config-form__digits">
              {digitTokens.map((token) => (
                <button
                  type="button"
                  key={token}
                  onClick={handleTokenClick(token)}
                  className="calculated-config-form__button"
                >
                  {token}
                </button>
              ))}
            </div>
            <div className="calculated-config-form__operators">
              {operatorTokens.map((token) => (
                <button
                  type="button"
                  key={token.value}
                  onClick={handleTokenClick(token.value)}
                  className="calculated-config-form__button calculated-config-form__button--operator"
                  aria-label={token.aria}
                >
                  {token.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                className="calculated-config-form__button calculated-config-form__button--operator"
                aria-label="Borrar"
              >
                ⌫
              </button>
            </div>
          </div>

          <div className="format-field calculated-config-form__expression">
            <div className="format-field__label">
              <label htmlFor={expressionId}>Expresión resultante</label>
            </div>
            <input
              id={expressionId}
              type="text"
              readOnly
              value={expression}
              className="calculated-config-form__expression-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};