import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import type { MetaCellConfig, MetaPanelRowConfig, TermConfig } from '../types/meta-panel.ts';
import { getTermAvailability, type MetaPanelCatalog } from '../utils/meta-panel-catalog.ts';
import { confirmAsync } from '../ui/alerts';
import styles from './MetaCalcCellEditor.module.css';

interface Props {
  isOpen: boolean;
  colIndex: number;
  rowConfig: MetaPanelRowConfig;
  isOverrideActive: boolean;
  initialCellConfig: MetaCellConfig;
  catalog: MetaPanelCatalog;
  availabilityCatalog: MetaPanelCatalog;
  onToggleOverride: (active: boolean) => void | Promise<void>;
  onSave: (nextCellConfig: MetaCellConfig, nextRowLabel: string, nextOverrideLabel: string) => void;
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

const moveItem = <T,>(arr: T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= arr.length
    || toIndex >= arr.length
    || fromIndex === toIndex
  ) {
    return arr;
  }

  const next = arr.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const duplicateTermAt = (terms: TermConfig[], index: number): TermConfig[] => {
  if (index < 0 || index >= terms.length || terms.length >= MAX_TERMS) {
    return terms;
  }

  const source = terms[index];
  const duplicated: TermConfig = {
    ...cloneTerm(source),
    id: createTermId(),
  };
  const nextTerms = terms.slice();
  nextTerms.splice(index + 1, 0, duplicated);
  return nextTerms;
};

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

const DuplicateIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <rect x="3" y="6" width="9" height="9" rx="1.5" />
    <rect x="7" y="2" width="9" height="9" rx="1.5" />
    <path d="M15.5 13v5M13 15.5h5" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M4 6h12" />
    <path d="M8 6V4h4v2" />
    <path d="M6.5 6l.7 10h5.6l.7-10" />
    <path d="M8.5 9v5M11.5 9v5" />
  </svg>
);

export const MetaCalcCellEditor: React.FC<Props> = ({
  isOpen,
  colIndex,
  rowConfig,
  isOverrideActive,
  initialCellConfig,
  catalog,
  availabilityCatalog,
  onToggleOverride,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState<MetaCellConfig>(() => cloneCellConfig(initialCellConfig));
  const [draftRowLabel, setDraftRowLabel] = useState<string>(rowConfig.label ?? '');
  const [draftOverrideLabel, setDraftOverrideLabel] = useState<string>(
    isOverrideActive ? (initialCellConfig.label ?? '') : '',
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(cloneCellConfig(initialCellConfig));
    setDraftRowLabel(rowConfig.label ?? '');
    setDraftOverrideLabel(isOverrideActive ? (initialCellConfig.label ?? '') : '');
  }, [initialCellConfig, isOpen, isOverrideActive, rowConfig.label]);

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
  const exceedsTermLimit = draft.terms.length > MAX_TERMS;

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
  };

  const moveTermUp = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      terms: moveItem(prev.terms, index, index - 1),
    }));
  };

  const moveTermDown = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      terms: moveItem(prev.terms, index, index + 1),
    }));
  };

  const duplicateTerm = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      terms: duplicateTermAt(prev.terms, index),
    }));
  };

  const removeTerm = async (index: number) => {
    const confirmed = await confirmAsync({
      title: 'Eliminar termino',
      message: 'Eliminar este termino?\nEsta accion no se puede deshacer.',
      confirmLabel: 'Si, eliminar',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;
    setDraft((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, idx) => idx !== index),
    }));
  };

  const invalidTermIndexes = useMemo(() => {
    const indexes = new Set<number>();
    draft.terms.forEach((term, index) => {
      if (!term.templateId) {
        indexes.add(index);
        return;
      }
      if ((term.op === 'sum' || term.op === 'avg' || term.op === 'countIf') && !term.controlKey) {
        indexes.add(index);
        return;
      }
      if (term.op === 'countIf' && !term.condition?.controlKey) {
        indexes.add(index);
      }
    });
    return indexes;
  }, [draft.terms]);

  const isSaveDisabled = invalidTermIndexes.size > 0 || exceedsTermLimit;

  const handleSave = () => {
    if (isSaveDisabled) return;
    onSave(
      cloneCellConfig(draft),
      draftRowLabel.trim(),
      draftOverrideLabel.trim(),
    );
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
          <div className={styles.headerTop}>
            <div>
              <h3 id="meta-calc-cell-editor-title">Meta-calculos</h3>
              <p className={styles.headerSubtext}>Columna seleccionada: {colIndex + 1}</p>
            </div>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={isOverrideActive}
                onChange={(event) => onToggleOverride(event.target.checked)}
              />
              <span>Personalizar esta columna</span>
            </label>
          </div>
          <p className={styles.modeText}>
            {isOverrideActive
              ? 'Personalizacion de esta columna'
              : 'Calculo general (todas las columnas)'}
          </p>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Nombre del calculo</h4>
            {isOverrideActive ? (
              <>
                <div className={styles.formRow}>
                  <label>Nombre para esta columna</label>
                  <input
                    type="text"
                    value={draftOverrideLabel}
                    onChange={(event) => setDraftOverrideLabel(event.target.value)}
                    placeholder="Nombre para esta columna"
                  />
                </div>
                <p className={styles.sectionHint}>Si lo dejas vacio, se usara el nombre general.</p>
              </>
            ) : (
              <div className={styles.formRow}>
                <label>Nombre del calculo</label>
                <input
                  type="text"
                  value={draftRowLabel}
                  onChange={(event) => setDraftRowLabel(event.target.value)}
                  placeholder="Nombre del calculo"
                />
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Constructor de terminos</h4>
            </div>

            {draft.terms.map((term, termIndex) => {
              const availability = getTermAvailability(term, availabilityCatalog);
              const templateCatalog = catalog.controlsByTemplateId[term.templateId];
              const numericControls = templateCatalog?.numericControls ?? [];
              const conditionControls = templateCatalog?.conditionControls ?? [];
              const hasTemplateInCatalog = !!templateCatalog;
              const hasNumericControl = numericControls.some((control) => control.controlKey === term.controlKey);
              const hasConditionControl = conditionControls.some(
                (control) => control.controlKey === term.condition?.controlKey,
              );
              const shouldShowAvailabilityWarning = !availability.ok && (
                (availability.reason === 'missing-template' && !!term.templateId)
                || (
                  availability.reason === 'missing-control'
                  && (
                    (term.op !== 'countIf' && !!term.controlKey)
                    || (term.op === 'countIf' && !!term.controlKey && !hasNumericControl)
                    || (term.op === 'countIf' && !!term.condition?.controlKey && !hasConditionControl)
                  )
                )
              );
              const selectedConditionType = conditionControls.find(
                (control) => control.controlKey === term.condition?.controlKey,
              )?.type;
              const isInvalid = invalidTermIndexes.has(termIndex);
              const isFirstTerm = termIndex === 0;
              const isLastTerm = termIndex === draft.terms.length - 1;

              return (
                <div
                  key={term.id}
                  className={`${styles.termCard} ${isInvalid ? styles.termCardInvalid : ''}`}
                >
                  <div className={styles.termMainRow}>
                    <div className={`${styles.termControl} ${styles.termSignControl}`}>
                      <label>Signo</label>
                      <div className={styles.signGroup} role="group" aria-label={`Signo del termino ${termIndex + 1}`}>
                        <button
                          type="button"
                          className={`${styles.signButton} ${term.sign === 1 ? styles.signButtonActive : ''}`}
                          onClick={() => updateTerm(termIndex, (prev) => ({ ...prev, sign: 1 }))}
                          aria-pressed={term.sign === 1}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className={`${styles.signButton} ${term.sign === -1 ? styles.signButtonActive : ''}`}
                          onClick={() => updateTerm(termIndex, (prev) => ({ ...prev, sign: -1 }))}
                          aria-pressed={term.sign === -1}
                        >
                          -
                        </button>
                      </div>
                    </div>

                    <div className={`${styles.termControl} ${styles.termOperationControl}`}>
                      <label>Operacion</label>
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

                    <div className={`${styles.termControl} ${styles.termTemplateControl}`}>
                      <label>Tipo de bloque</label>
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
                        <option value="">Selecciona tipo de bloque...</option>
                        {!hasTemplateInCatalog && term.templateId ? (
                          <option value={term.templateId}>{term.templateId} (no disponible aqui)</option>
                        ) : null}
                        {templateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={`${styles.termControl} ${styles.termFieldControl}`}>
                      <label>Campo</label>
                      <select
                        value={term.controlKey}
                        onChange={(event) =>
                          updateTerm(termIndex, (prev) => ({ ...prev, controlKey: event.target.value }))
                        }
                        disabled={term.op === 'count'}
                      >
                        <option value="">Selecciona campo...</option>
                        {!hasNumericControl && term.controlKey ? (
                          <option value={term.controlKey}>{term.controlKey} (no disponible aqui)</option>
                        ) : null}
                        {numericControls.map((control) => (
                          <option key={control.controlKey} value={control.controlKey}>
                            {control.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={`${styles.termControl} ${styles.termDeleteControl}`}>
                      <label>Acciones</label>
                      <div className={styles.termActions}>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => moveTermUp(termIndex)}
                          disabled={isFirstTerm}
                          aria-label={`Mover termino ${termIndex + 1} arriba`}
                          title="Mover arriba"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => moveTermDown(termIndex)}
                          disabled={isLastTerm}
                          aria-label={`Mover termino ${termIndex + 1} abajo`}
                          title="Mover abajo"
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => duplicateTerm(termIndex)}
                          disabled={!canAddTerm}
                          aria-label={`Duplicar termino ${termIndex + 1}`}
                          title="Duplicar"
                        >
                          <DuplicateIcon />
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => { void removeTerm(termIndex); }}
                          aria-label={`Eliminar termino ${termIndex + 1}`}
                          title="Eliminar"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {term.op === 'countIf' ? (
                    <div className={styles.termConditionRow}>
                      <div className={styles.termControl}>
                        <label>Condicion: campo</label>
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
                          <option value="">Selecciona campo...</option>
                          {!hasConditionControl && term.condition?.controlKey ? (
                            <option value={term.condition.controlKey}>
                              {term.condition.controlKey} (no disponible aqui)
                            </option>
                          ) : null}
                          {conditionControls.map((control) => (
                            <option key={control.controlKey} value={control.controlKey}>
                              {control.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.termControl}>
                        <label>Condicion: valor</label>
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
                    </div>
                  ) : null}

                  {shouldShowAvailabilityWarning ? (
                    <p className={styles.warning}>
                      {availability.reason === 'missing-template'
                        ? (isOverrideActive
                          ? 'Tipo de bloque no disponible en esta columna.'
                          : 'El tipo de bloque del calculo general no esta disponible en esta columna.')
                        : 'Campo no disponible en esta columna.'}
                    </p>
                  ) : null}

                  {isInvalid ? (
                    <p className={styles.termError}>Completa este termino para poder guardar.</p>
                  ) : null}
                </div>
              );
            })}

            <div className={styles.builderFooter}>
              <Button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, terms: [...prev.terms, buildEmptyTerm()] }))}
                disabled={!canAddTerm}
              >
                Agregar termino
              </Button>
              <span className={styles.counterText}>{draft.terms.length}/{MAX_TERMS} terminos</span>
            </div>
            {!canAddTerm ? <p className={styles.maxTermsHint}>Maximo 5 terminos.</p> : null}
          </section>

          {isSaveDisabled ? (
            <p className={styles.error}>Revisa los terminos incompletos antes de guardar.</p>
          ) : null}
        </div>

        <div className={styles.footer}>
          <Button type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={isSaveDisabled}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};
