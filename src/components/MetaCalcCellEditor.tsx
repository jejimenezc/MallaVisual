import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import type { MetaCellConfig, TermConfig } from '../types/meta-panel.ts';
import type { MetaPanelCatalog } from '../utils/meta-panel-catalog.ts';
import styles from './MetaCalcCellEditor.module.css';

interface Props {
  isOpen: boolean;
  colIndex: number;
  initialCellConfig: MetaCellConfig;
  catalog: MetaPanelCatalog;
  onSave: (nextCellConfig: MetaCellConfig) => void;
  onCancel: () => void;
}

const MAX_TERMS = 5;

const createTermId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const cloneTerm = (term: TermConfig): TermConfig => ({
  ...term,
  ...(term.condition ? { condition: { ...term.condition } } : {}),
});

const cloneCellConfig = (config: MetaCellConfig): MetaCellConfig => ({
  ...config,
  terms: (config.terms ?? []).map(cloneTerm),
});

const parseConditionEquals = (
  rawValue: string,
  controlType: string | undefined,
): string | number | boolean => {
  if (controlType === 'checkbox') {
    return rawValue === 'true';
  }
  if (controlType === 'number' || controlType === 'calculated') {
    const parsed = Number.parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return rawValue;
};

const serializeConditionEquals = (value: string | number | boolean | undefined): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  return value ?? '';
};

export const MetaCalcCellEditor: React.FC<Props> = ({
  isOpen,
  colIndex,
  initialCellConfig,
  catalog,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState<MetaCellConfig>(() => cloneCellConfig(initialCellConfig));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(cloneCellConfig(initialCellConfig));
    setError(null);
  }, [initialCellConfig, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const canAddTerm = draft.terms.length < MAX_TERMS;

  const templates = catalog.templates;
  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template.templateId, label: template.label })),
    [templates],
  );

  const buildEmptyTerm = (): TermConfig => {
    const firstTemplate = templates[0];
    const firstControl = firstTemplate?.numericControls[0];
    return {
      id: createTermId(),
      sign: 1,
      templateId: firstTemplate?.templateId ?? '',
      controlKey: firstControl?.controlKey ?? '',
      op: 'count',
    };
  };

  const updateTerm = (index: number, updater: (term: TermConfig) => TermConfig) => {
    setDraft((prev) => {
      const nextTerms = prev.terms.slice();
      const current = nextTerms[index];
      if (!current) return prev;
      nextTerms[index] = updater(current);
      return { ...prev, terms: nextTerms };
    });
    setError(null);
  };

  const removeTerm = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, idx) => idx !== index),
    }));
    setError(null);
  };

  const handleSave = () => {
    for (const term of draft.terms) {
      if (!term.templateId) {
        setError('Cada término debe tener un template seleccionado.');
        return;
      }
      if ((term.op === 'sum' || term.op === 'avg' || term.op === 'countIf') && !term.controlKey) {
        setError('Los términos sum/avg/countIf requieren control.');
        return;
      }
      if (term.op === 'countIf') {
        if (!term.condition?.controlKey) {
          setError('countIf requiere control de condición.');
          return;
        }
      }
    }
    onSave(cloneCellConfig(draft));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meta-calc-cell-editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id="meta-calc-cell-editor-title">Meta-calculos (aplica a todas las columnas)</h3>
          <p>Columna seleccionada: {colIndex + 1} (solo preview de catalogo)</p>
        </div>

        <div className={styles.body}>
          {draft.terms.map((term, termIndex) => {
            const templateCatalog = catalog.controlsByTemplateId[term.templateId];
            const numericControls = templateCatalog?.numericControls ?? [];
            const conditionControls = templateCatalog?.conditionControls ?? [];
            const selectedConditionType = conditionControls.find(
              (control) => control.controlKey === term.condition?.controlKey,
            )?.type;

            return (
              <div key={term.id} className={styles.termCard}>
                <div className={styles.row}>
                  <label>Signo</label>
                  <select
                    value={String(term.sign)}
                    onChange={(event) =>
                      updateTerm(termIndex, (prev) => ({
                        ...prev,
                        sign: event.target.value === '-1' ? -1 : 1,
                      }))
                    }
                  >
                    <option value="1">+</option>
                    <option value="-1">-</option>
                  </select>
                </div>

                <div className={styles.row}>
                  <label>Operación</label>
                  <select
                    value={term.op}
                    onChange={(event) => {
                      const nextOp = event.target.value as TermConfig['op'];
                      updateTerm(termIndex, (prev) => ({
                        ...prev,
                        op: nextOp,
                        ...(nextOp === 'countIf'
                          ? {
                            condition: prev.condition ?? {
                              controlKey: conditionControls[0]?.controlKey ?? '',
                              equals: '',
                            },
                          }
                          : { condition: undefined }),
                      }));
                    }}
                  >
                    <option value="sum">sum</option>
                    <option value="avg">avg</option>
                    <option value="count">count</option>
                    <option value="countIf">countIf</option>
                  </select>
                </div>

                <div className={styles.row}>
                  <label>Template</label>
                  <select
                    value={term.templateId}
                    onChange={(event) => {
                      const nextTemplateId = event.target.value;
                      const nextTemplate = catalog.controlsByTemplateId[nextTemplateId];
                      updateTerm(termIndex, (prev) => ({
                        ...prev,
                        templateId: nextTemplateId,
                        controlKey: nextTemplate?.numericControls[0]?.controlKey ?? '',
                        ...(prev.condition
                          ? {
                            condition: {
                              ...prev.condition,
                              controlKey: nextTemplate?.conditionControls[0]?.controlKey ?? '',
                            },
                          }
                          : {}),
                      }));
                    }}
                  >
                    <option value="">Selecciona template...</option>
                    {templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.row}>
                  <label>Control</label>
                  <select
                    value={term.controlKey}
                    onChange={(event) =>
                      updateTerm(termIndex, (prev) => ({ ...prev, controlKey: event.target.value }))
                    }
                    disabled={term.op === 'count'}
                  >
                    <option value="">Selecciona control...</option>
                    {numericControls.map((control) => (
                      <option key={control.controlKey} value={control.controlKey}>
                        {control.label}
                      </option>
                    ))}
                  </select>
                </div>

                {term.op === 'countIf' ? (
                  <>
                    <div className={styles.row}>
                      <label>Condición: control</label>
                      <select
                        value={term.condition?.controlKey ?? ''}
                        onChange={(event) =>
                          updateTerm(termIndex, (prev) => ({
                            ...prev,
                            condition: {
                              controlKey: event.target.value,
                              equals: prev.condition?.equals ?? '',
                            },
                          }))
                        }
                      >
                        <option value="">Selecciona control...</option>
                        {conditionControls.map((control) => (
                          <option key={control.controlKey} value={control.controlKey}>
                            {control.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.row}>
                      <label>Condición: equals</label>
                      {selectedConditionType === 'checkbox' ? (
                        <select
                          value={serializeConditionEquals(term.condition?.equals)}
                          onChange={(event) =>
                            updateTerm(termIndex, (prev) => ({
                              ...prev,
                              condition: {
                                controlKey: prev.condition?.controlKey ?? '',
                                equals: event.target.value === 'true',
                              },
                            }))
                          }
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={selectedConditionType === 'number' || selectedConditionType === 'calculated' ? 'number' : 'text'}
                          value={serializeConditionEquals(term.condition?.equals)}
                          onChange={(event) =>
                            updateTerm(termIndex, (prev) => ({
                              ...prev,
                              condition: {
                                controlKey: prev.condition?.controlKey ?? '',
                                equals: parseConditionEquals(event.target.value, selectedConditionType),
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                  </>
                ) : null}

                <div className={styles.termActions}>
                  <Button type="button" onClick={() => removeTerm(termIndex)}>
                    Eliminar término
                  </Button>
                </div>
              </div>
            );
          })}

          <div className={styles.actionsInline}>
            <Button type="button" onClick={() => setDraft((prev) => ({ ...prev, terms: [...prev.terms, buildEmptyTerm()] }))} disabled={!canAddTerm}>
              Add term
            </Button>
            <span>{draft.terms.length}/{MAX_TERMS}</span>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
