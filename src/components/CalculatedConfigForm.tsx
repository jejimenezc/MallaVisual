// src/components/CalculatedConfigForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import { EyeOff } from 'lucide-react';
import type { BlockTemplateCell, BlockTemplate } from '../types/curricular.ts';
import '../styles/CalculatedConfigForm.css';
import { focusWithoutScroll } from '../utils/focusWithoutScroll';

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
    focusWithoutScroll(inputRef.current);
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

  const handleBackspace = () => {
    if (!expression) return;
    const next = expression.slice(0, -1);
    setExpression(next);
    onUpdate({ expression: next });
  };

  const handleClear = () => {
    setExpression('');
    onUpdate({ expression: '' });
  };

  const noNumberMsg =
    'Para definir un cálculo se requieren celdas numéricas. No hay celdas numéricas en el bloque';

  type KeypadItem =
    | {
        type: 'token';
        label: string;
        value: string;
        aria?: string;
        variant?: 'operator' | 'digit';
      }
    | {
        type: 'action';
        action: 'backspace' | 'clear';
        label: string;
        aria: string;
      }
    | null;

  const keypadLayout: KeypadItem[][] = [
    [
      { type: 'token', label: '7', value: '7', variant: 'digit' },
      { type: 'token', label: '8', value: '8', variant: 'digit' },
      { type: 'token', label: '9', value: '9', variant: 'digit' },
      { type: 'token', label: '/', value: '/', aria: 'Dividir', variant: 'operator' },
    ],
    [
      { type: 'token', label: '4', value: '4', variant: 'digit' },
      { type: 'token', label: '5', value: '5', variant: 'digit' },
      { type: 'token', label: '6', value: '6', variant: 'digit' },
      { type: 'token', label: 'x', value: '*', aria: 'Multiplicar', variant: 'operator' },
    ],
    [
      { type: 'token', label: '1', value: '1', variant: 'digit' },
      { type: 'token', label: '2', value: '2', variant: 'digit' },
      { type: 'token', label: '3', value: '3', variant: 'digit' },
      { type: 'token', label: '-', value: '-', variant: 'operator' },
    ],
    [
      null,
      { type: 'token', label: '0', value: '0', variant: 'digit' },
      { type: 'token', label: '.', value: '.', variant: 'digit' },
      { type: 'token', label: '+', value: '+', variant: 'operator' },
    ],
    [
      { type: 'action', action: 'clear', label: 'C', aria: 'Limpiar expresión' },
      { type: 'token', label: '(', value: '(', variant: 'operator' },
      { type: 'token', label: ')', value: ')', variant: 'operator' },
      { type: 'action', action: 'backspace', label: '⌫', aria: 'Borrar último carácter' },
    ],
  ];

  return (
    <div className="control-config-form calculated-config-form format-section__list">
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
            {keypadLayout.flatMap((row, rowIndex) =>
              row.map((item, colIndex) => {
                const key = `keypad-${rowIndex}-${colIndex}`;

                if (!item) {
                  return (
                    <span
                      key={key}
                      className="calculated-config-form__keypad-spacer"
                      aria-hidden="true"
                    />
                  );
                }

                if (item.type === 'token') {
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => insertToken(item.value)}
                      className={`calculated-config-form__button${
                        item.variant === 'operator'
                          ? ' calculated-config-form__button--operator'
                          : ''
                      }`}
                      aria-label={item.aria}
                    >
                      {item.label}
                    </button>
                  );
                }

                const actionHandler =
                  item.action === 'backspace' ? handleBackspace : handleClear;

                return (
                  <button
                    type="button"
                    key={key}
                    onClick={actionHandler}
                    className="calculated-config-form__button calculated-config-form__button--operator"
                    aria-label={item.aria}
                  >
                    {item.label}
                  </button>
                );
              })
            )}
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