import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnHeaderRowConfig } from '../types/column-headers.ts';
import styles from './ColumnHeaderRowEditor.module.css';

interface Props {
  isOpen: boolean;
  row: ColumnHeaderRowConfig | null;
  rowPosition: number;
  colIndex: number;
  onCancel: () => void;
  onSave: (rowId: string, text: string, useOverride: boolean, colIndex: number) => void;
}

export const ColumnHeaderRowEditor: React.FC<Props> = ({
  isOpen,
  row,
  rowPosition,
  colIndex,
  onCancel,
  onSave,
}) => {
  const initialOverrideText = useMemo(() => row?.columns?.[colIndex]?.text ?? '', [colIndex, row]);
  const initialDefaultText = row?.defaultText ?? '';
  const initialOverrideActive = !!row?.columns?.[colIndex];

  const [isOverrideActive, setIsOverrideActive] = useState(initialOverrideActive);
  const [draftText, setDraftText] = useState(initialOverrideActive ? initialOverrideText : initialDefaultText);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextOverrideActive = !!row?.columns?.[colIndex];
    setIsOverrideActive(nextOverrideActive);
    setDraftText(nextOverrideActive ? (row?.columns?.[colIndex]?.text ?? '') : (row?.defaultText ?? ''));
  }, [colIndex, isOpen, row]);

  if (!isOpen || !row) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-header-row-editor-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(row.id, draftText ?? '', isOverrideActive, colIndex);
        }}
      >
        <h3 id="column-header-row-editor-title" className={styles.title}>
          Editar encabezado
        </h3>
        <p className={styles.subtext}>Fila {rowPosition} - Periodo {colIndex + 1}</p>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={isOverrideActive}
            onChange={(event) => {
              const nextActive = event.target.checked;
              setIsOverrideActive(nextActive);
              setDraftText(nextActive ? initialOverrideText : initialDefaultText);
            }}
          />
          <span>Personalizar este periodo</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Texto breve</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value ?? '')}
          />
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};
