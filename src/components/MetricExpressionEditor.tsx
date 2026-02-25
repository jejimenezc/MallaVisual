import React from 'react';
import { Button } from './Button';
import type { MetricExprToken } from '../types/meta-panel.ts';
import styles from './MetricExpressionEditor.module.css';

interface Props {
  tokens: MetricExprToken[];
  cursorIndex: number;
  pendingDecimalTokenIndex: number | null;
  termExpressionLabelById: Map<string, string>;
  editorRef?: React.RefObject<HTMLDivElement | null>;
  errorMessage?: string;
  errorClassName?: string;
  onSetCursor: (index: number) => void;
  onInsertOperator: (op: '+' | '-' | '*' | '/') => void;
  onInsertOpenParen: () => void;
  onInsertCloseParen: () => void;
  onInsertDigit: (digit: string) => void;
  onInsertDecimalPoint: () => void;
  onBackspace: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const getExprOperatorLabel = (op: '+' | '-' | '*' | '/'): string => op;

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
  editorRef,
  errorMessage,
  errorClassName,
  onSetCursor,
  onInsertOperator,
  onInsertOpenParen,
  onInsertCloseParen,
  onInsertDigit,
  onInsertDecimalPoint,
  onBackspace,
  onDelete,
  onClear,
}) => {
  const focusEditor = () => {
    editorRef?.current?.focus();
  };

  const handleKeypadMouseDown: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
  };

  const handleEditorKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onSetCursor(Math.max(0, cursorIndex - 1));
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onSetCursor(Math.min(tokens.length, cursorIndex + 1));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      onSetCursor(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      onSetCursor(tokens.length);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      onBackspace();
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      onDelete();
    }
  };

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
          <Button
            type="button"
            aria-label="Insertar operador suma"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertOperator('+'); focusEditor(); }}
          >
            +
          </Button>
          <Button
            type="button"
            aria-label="Insertar operador resta"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertOperator('-'); focusEditor(); }}
          >
            -
          </Button>
          <Button
            type="button"
            aria-label="Insertar operador multiplicacion"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertOperator('*'); focusEditor(); }}
          >
            *
          </Button>
          <Button
            type="button"
            aria-label="Insertar operador division"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertOperator('/'); focusEditor(); }}
          >
            /
          </Button>
        </div>
        <div className={styles.keypadGroup}>
          <Button
            type="button"
            aria-label="Insertar parentesis de apertura"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertOpenParen(); focusEditor(); }}
          >
            (
          </Button>
          <Button
            type="button"
            aria-label="Insertar parentesis de cierre"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onInsertCloseParen(); focusEditor(); }}
          >
            )
          </Button>
        </div>
        <div className={styles.keypadGroup}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((key) => (
            <Button
              key={key}
              type="button"
              aria-label={key === '.' ? 'Insertar punto decimal' : `Insertar digito ${key}`}
              onMouseDown={handleKeypadMouseDown}
              onClick={() => {
                if (key === '.') {
                  onInsertDecimalPoint();
                } else {
                  onInsertDigit(key);
                }
                focusEditor();
              }}
            >
              {key}
            </Button>
          ))}
        </div>
        <div className={styles.keypadGroup}>
          <Button
            type="button"
            aria-label="Borrar hacia atras"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onBackspace(); focusEditor(); }}
          >
            ⌫
          </Button>
          <Button
            type="button"
            aria-label="Eliminar en cursor"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onDelete(); focusEditor(); }}
          >
            DEL
          </Button>
          <Button
            type="button"
            aria-label="Limpiar expresion"
            onMouseDown={handleKeypadMouseDown}
            onClick={() => { onClear(); focusEditor(); }}
          >
            Limpiar
          </Button>
        </div>
      </div>

      <div
        ref={editorRef}
        className={styles.expressionEditor}
        role="group"
        aria-label="Editor de expresion"
        tabIndex={0}
        onKeyDown={handleEditorKeyDown}
      >
        {Array.from({ length: tokens.length + 1 }, (_, slotIndex) => (
          <React.Fragment key={`slot-${slotIndex}`}>
            <button
              type="button"
              className={`${styles.cursorSlot} ${cursorIndex === slotIndex ? styles.cursorSlotActive : ''}`}
              onMouseDown={handleKeypadMouseDown}
              onClick={() => {
                onSetCursor(slotIndex);
                focusEditor();
              }}
              aria-label={`Mover cursor a la posicion ${slotIndex + 1}`}
            >
              {cursorIndex === slotIndex ? <span className={styles.cursorCaret} aria-hidden="true" /> : null}
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
