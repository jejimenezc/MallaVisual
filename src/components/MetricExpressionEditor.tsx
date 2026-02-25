import React from 'react';
import { Button } from './Button';
import type { MetricExprToken } from '../types/meta-panel.ts';
import styles from './MetricExpressionEditor.module.css';

interface Props {
  tokens: MetricExprToken[];
  cursorIndex: number;
  pendingDecimalTokenIndex: number | null;
  termExpressionLabelById: Map<string, string>;
  errorMessage?: string;
  errorClassName?: string;
  onSetCursor: (index: number) => void;
  onInsertOperator: (op: '+' | '-' | '*' | '/') => void;
  onInsertOpenParen: () => void;
  onInsertCloseParen: () => void;
  onInsertDigit: (digit: string) => void;
  onInsertDecimalPoint: () => void;
  onBackspace: () => void;
  onClear: () => void;
}

const getExprOperatorLabel = (op: '+' | '-' | '*' | '/'): string => {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op;
};

const getConstTokenLabel = (
  token: Extract<MetricExprToken, { type: 'const' }>,
  index: number,
  pendingDecimalTokenIndex: number | null,
): string => (pendingDecimalTokenIndex === index ? `${token.value}.` : String(token.value));

export const MetricExpressionEditor: React.FC<Props> = ({
  tokens,
  cursorIndex,
  pendingDecimalTokenIndex,
  termExpressionLabelById,
  errorMessage,
  errorClassName,
  onSetCursor,
  onInsertOperator,
  onInsertOpenParen,
  onInsertCloseParen,
  onInsertDigit,
  onInsertDecimalPoint,
  onBackspace,
  onClear,
}) => {
  const renderExprToken = (token: MetricExprToken, index: number): React.ReactNode => {
    if (token.type === 'term') {
      const label = termExpressionLabelById.get(token.termId) ?? `Termino ${token.termId}`;
      return <span className={styles.exprTokenChip}>{label}</span>;
    }
    if (token.type === 'const') {
      return (
        <span className={styles.exprTokenConst}>
          {getConstTokenLabel(token, index, pendingDecimalTokenIndex)}
        </span>
      );
    }
    if (token.type === 'op') {
      return <span className={styles.exprTokenOp}>{getExprOperatorLabel(token.op)}</span>;
    }
    return <span className={styles.exprTokenParen}>{token.paren}</span>;
  };

  return (
    <>
      <div className={styles.keypad}>
        <div className={styles.keypadGroup}>
          <Button type="button" onClick={() => onInsertOperator('+')}>+</Button>
          <Button type="button" onClick={() => onInsertOperator('-')}>-</Button>
          <Button type="button" onClick={() => onInsertOperator('*')}>×</Button>
          <Button type="button" onClick={() => onInsertOperator('/')}>÷</Button>
        </div>
        <div className={styles.keypadGroup}>
          <Button type="button" onClick={onInsertOpenParen}>(</Button>
          <Button type="button" onClick={onInsertCloseParen}>)</Button>
        </div>
        <div className={styles.keypadGroup}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((key) => (
            <Button
              key={key}
              type="button"
              onClick={() => (key === '.' ? onInsertDecimalPoint() : onInsertDigit(key))}
            >
              {key}
            </Button>
          ))}
        </div>
        <div className={styles.keypadGroup}>
          <Button type="button" onClick={onBackspace}>⌫</Button>
          <Button type="button" onClick={onClear}>Limpiar</Button>
        </div>
      </div>

      <div className={styles.expressionEditor} role="group" aria-label="Editor de expresion">
        {Array.from({ length: tokens.length + 1 }, (_, slotIndex) => (
          <React.Fragment key={`slot-${slotIndex}`}>
            <button
              type="button"
              className={`${styles.cursorSlot} ${cursorIndex === slotIndex ? styles.cursorSlotActive : ''}`}
              onClick={() => onSetCursor(slotIndex)}
              aria-label={`Mover cursor a la posicion ${slotIndex + 1}`}
            >
              {cursorIndex === slotIndex ? '|' : ' '}
            </button>
            {slotIndex < tokens.length ? (
              <span className={styles.exprToken}>{renderExprToken(tokens[slotIndex]!, slotIndex)}</span>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      {errorMessage ? <p className={errorClassName}>{errorMessage}</p> : null}
    </>
  );
};
