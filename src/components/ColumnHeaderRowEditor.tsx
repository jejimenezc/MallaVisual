import React, { useEffect, useState } from 'react';
import type { ColumnHeaderRowConfig } from '../types/column-headers.ts';
import { formatSequenceCounter, type SequenceCounterStyle } from '../utils/sequence-format.ts';
import styles from './ColumnHeaderRowEditor.module.css';

type HeaderType = 'text' | 'standard' | 'counter';
type StandardPreset = 'periodo' | 'semestre' | 'trimestre' | 'bimestre';

const MAX_PREVIEW_COLUMNS = 6;
const MAX_COUNTER_TEMPLATE_LENGTH = 30;

interface Props {
  isOpen: boolean;
  row: ColumnHeaderRowConfig | null;
  rowPosition: number;
  colIndex: number;
  columnCount: number;
  onCancel: () => void;
  onSave: (rowId: string, text: string, useOverride: boolean, colIndex: number) => void;
  onApplySeries: (rowId: string, makeText: (colIndex: number) => string) => Promise<boolean>;
}

export const ColumnHeaderRowEditor: React.FC<Props> = ({
  isOpen,
  row,
  rowPosition,
  colIndex,
  columnCount,
  onCancel,
  onSave,
  onApplySeries,
}) => {
  const safeColumnCount = Number.isInteger(columnCount) ? Math.max(0, columnCount) : 0;

  const [headerType, setHeaderType] = useState<HeaderType>('text');
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [standardPreset, setStandardPreset] = useState<StandardPreset>('periodo');
  const [standardStart, setStandardStart] = useState(1);
  const [counterTemplate, setCounterTemplate] = useState('Modulo [n]');
  const [counterStart, setCounterStart] = useState(1);
  const [counterStyle, setCounterStyle] = useState<SequenceCounterStyle>('arabic');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextOverrideActive = !!row?.columns?.[colIndex];
    setHeaderType('text');
    setIsOverrideActive(nextOverrideActive);
    setDraftText(nextOverrideActive ? (row?.columns?.[colIndex]?.text ?? '') : (row?.defaultText ?? ''));
    setStandardPreset('periodo');
    setStandardStart(1);
    setCounterTemplate('Modulo [n]');
    setCounterStart(1);
    setCounterStyle('arabic');
  }, [colIndex, isOpen, row]);

  if (!isOpen || !row) {
    return null;
  }

  const standardBaseByPreset: Record<StandardPreset, string> = {
    periodo: 'Periodo',
    semestre: 'Semestre',
    trimestre: 'Trimestre',
    bimestre: 'Bimestre',
  };

  const makeStandardText = (index: number): string => {
    const counter = formatSequenceCounter(Math.max(1, standardStart) + index, counterStyle);
    return `${standardBaseByPreset[standardPreset]} ${counter}`.trim();
  };

  const makeCounterText = (index: number): string => {
    const counter = formatSequenceCounter(Math.max(1, counterStart) + index, counterStyle);
    const normalizedTemplate = counterTemplate.trim();
    if (normalizedTemplate.length === 0) {
      return counter;
    }
    if (/(\[n\]|\{n\})/i.test(normalizedTemplate)) {
      return normalizedTemplate.replace(/(\[n\]|\{n\})/gi, counter);
    }
    return `${normalizedTemplate} ${counter}`;
  };

  const previewValues = (() => {
    const base = Array.from(
      { length: safeColumnCount },
      (_, index) => row.columns?.[index]?.text ?? row.defaultText,
    );
    if (headerType === 'text') {
      if (isOverrideActive && colIndex >= 0 && colIndex < safeColumnCount) {
        base[colIndex] = draftText;
      } else {
        for (let index = 0; index < safeColumnCount; index += 1) {
          base[index] = draftText;
        }
      }
      return base;
    }
    if (headerType === 'standard') {
      return base.map((_, index) => makeStandardText(index));
    }
    return base.map((_, index) => makeCounterText(index));
  })();

  const existingOverrideCount = Object.values(row.columns ?? {}).filter(
    (override) => typeof override?.text === 'string' && override.text.trim().length > 0,
  ).length;

  const visiblePreviewColumns = previewValues.slice(0, MAX_PREVIEW_COLUMNS);
  const hasHiddenPreviewColumns = safeColumnCount > MAX_PREVIEW_COLUMNS;

  const handleApplyStandard = async (): Promise<void> => {
    await onApplySeries(row.id, makeStandardText);
  };

  const handleApplyCounter = async (): Promise<void> => {
    await onApplySeries(row.id, makeCounterText);
  };

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
          if (headerType !== 'text') {
            return;
          }
          onSave(row.id, draftText ?? '', isOverrideActive, colIndex);
        }}
      >
        <h3 id="column-header-row-editor-title" className={styles.title}>
          Editar fila {rowPosition} de encabezado - Periodo {colIndex + 1}
        </h3>
        <section className={styles.previewPanel}>
          <p className={styles.previewTitle}>Vista previa - Encabezado (fila {rowPosition})</p>
          <div className={styles.previewStrip}>
            {visiblePreviewColumns.map((text, index) => {
              const col = index;
              const isOverride = !!row.columns?.[col];
              return (
                <div key={`preview-col-${col}`} className={styles.previewChip}>
                  <span className={styles.previewChipPeriod}>P{col + 1}</span>
                  <span className={styles.previewChipText}>{text || '(vacio)'}</span>
                  {isOverride ? <span className={styles.previewOverrideDot} title="Override existente" /> : null}
                </div>
              );
            })}
            {hasHiddenPreviewColumns ? (
              <div className={styles.previewExtra}>+{safeColumnCount - MAX_PREVIEW_COLUMNS}</div>
            ) : null}
          </div>
          <p className={styles.previewMeta}>
            Encabezados personalizados existentes en la fila {rowPosition}: {existingOverrideCount}
          </p>
        </section>

        <section className={styles.headerTypeSection}>
          <p className={styles.sectionLabel}>Tipo de encabezado</p>
          <div className={styles.segmentedControl}>
            <label className={styles.segmentedItem} title="Texto abierto o notas extensas para la columna.">
              <input
                type="radio"
                name="header-type"
                checked={headerType === 'text'}
                onChange={() => setHeaderType('text')}
              />
              <span>Texto libre (Sin restricciones)</span>
            </label>
            <label
              className={styles.segmentedItem}
              title="Formatos academicos comunes con conteo automatico."
            >
              <input
                type="radio"
                name="header-type"
                checked={headerType === 'standard'}
                onChange={() => setHeaderType('standard')}
              />
              <span>Nomenclatura predefinida (Semestre, Ano, Ciclo...)</span>
            </label>
            <label
              className={styles.segmentedItem}
              title="Define un prefijo y un sufijo incremental (1, 2, A, B...)."
            >
              <input
                type="radio"
                name="header-type"
                checked={headerType === 'counter'}
                onChange={() => setHeaderType('counter')}
              />
              <span>Serie personalizada con contador (Ej: "Modulo [1]")</span>
            </label>
          </div>
        </section>

        {headerType === 'text' ? (
          <>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={isOverrideActive}
                onChange={(event) => {
                  const nextActive = event.target.checked;
                  setIsOverrideActive(nextActive);
                  setDraftText(nextActive ? (row.columns?.[colIndex]?.text ?? '') : (row.defaultText ?? ''));
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
          </>
        ) : null}

        {headerType === 'standard' ? (
          <section className={styles.controlsPanel}>
            <label className={styles.field}>
              <span className={styles.label}>Preset</span>
              <select
                className={styles.select}
                value={standardPreset}
                onChange={(event) => setStandardPreset(event.target.value as StandardPreset)}
              >
                <option value="periodo">Periodo 1..N</option>
                <option value="semestre">Semestre 1..N</option>
                <option value="trimestre">Trimestre 1..N</option>
                <option value="bimestre">Bimestre 1..N</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Iniciar en</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                step={1}
                value={standardStart}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value, 10);
                  setStandardStart(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1);
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Estilo contador</span>
              <select
                className={styles.select}
                value={counterStyle}
                onChange={(event) => setCounterStyle(event.target.value as SequenceCounterStyle)}
              >
                <option value="arabic">Arabigos (1, 2, 3)</option>
                <option value="roman">Romanos (I, II, III)</option>
                <option value="alpha-lower">Letras min (a, b, c)</option>
                <option value="alpha-upper">Letras may (A, B, C)</option>
              </select>
            </label>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleApplyStandard}>
              Aplicar a todos los periodos
            </button>
          </section>
        ) : null}

        {headerType === 'counter' ? (
          <section className={styles.controlsPanel}>
            <label className={styles.field}>
              <span className={styles.label}>Plantilla o prefijo</span>
              <input
                className={styles.input}
                value={counterTemplate}
                maxLength={MAX_COUNTER_TEMPLATE_LENGTH}
                onChange={(event) => setCounterTemplate((event.target.value ?? '').slice(0, MAX_COUNTER_TEMPLATE_LENGTH))}
                placeholder="Modulo [n]"
              />
              <span className={styles.hint}>Soporta [n] o {'{n}'} como placeholder.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Iniciar en</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                step={1}
                value={counterStart}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value, 10);
                  setCounterStart(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1);
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Estilo contador</span>
              <select
                className={styles.select}
                value={counterStyle}
                onChange={(event) => setCounterStyle(event.target.value as SequenceCounterStyle)}
              >
                <option value="arabic">Arabigos (1, 2, 3)</option>
                <option value="roman">Romanos (I, II, III)</option>
                <option value="alpha-lower">Letras min (a, b, c)</option>
                <option value="alpha-upper">Letras may (A, B, C)</option>
              </select>
            </label>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleApplyCounter}>
              Aplicar a todos los periodos
            </button>
          </section>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancelar
          </button>
          {headerType === 'text' ? (
            <button type="submit" className={`${styles.button} ${styles.primary}`}>
              Guardar
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
};
