import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './Button';
import { MetricExpressionEditor } from './MetricExpressionEditor';
import type { MetaCellConfig, MetricExprToken, TermConfig } from '../types/meta-panel.ts';
import { getTermAvailability, type MetaPanelCatalog } from '../utils/meta-panel-catalog.ts';
import {
  deriveExprFromTerms,
  validateExprTokens,
} from '../utils/metrics-expr.ts';
import { confirmAsync } from '../ui/alerts';
import { useToast } from '../ui/toast/ToastContext.tsx';
import styles from './MetaCalcCellEditor.module.css';

interface Props {
  isOpen: boolean;
  rowId: string;
  rowLabel?: string;
  rowPosition: number;
  colIndex: number;
  isOverrideActive: boolean;
  initialCellConfig: MetaCellConfig;
  catalog: MetaPanelCatalog;
  availabilityCatalog: MetaPanelCatalog;
  onToggleOverride: (rowId: string, active: boolean) => void | Promise<void>;
  onSave: (
    rowId: string,
    nextCellConfig: MetaCellConfig,
    nextRowLabel: string,
    nextOverrideLabel: string,
  ) => void;
  onCancel: () => void;
}

const MAX_TERMS = 5;
const OP_LABELS: Record<TermConfig['op'], string> = {
  sum: 'Suma',
  avg: 'Promedio',
  count: 'Conteo',
  countIf: 'Conteo si',
};

const isTermIncomplete = (term: TermConfig): boolean => {
  if (!term.templateId) return true;
  if ((term.op === 'sum' || term.op === 'avg' || term.op === 'countIf') && !term.controlKey) return true;
  if (term.op === 'countIf' && !term.condition?.controlKey) return true;
  return false;
};

const getTemplateLabel = (term: TermConfig, catalog: MetaPanelCatalog): string => {
  const templateLabel = catalog.controlsByTemplateId[term.templateId]?.label;
  if (templateLabel) return templateLabel;
  return term.templateId ? term.templateId : 'Tipo de bloque sin seleccionar';
};

const getFieldLabel = (term: TermConfig, catalog: MetaPanelCatalog): string => {
  if (!term.controlKey) return 'Termino incompleto';
  const templateCatalog = catalog.controlsByTemplateId[term.templateId];
  const fieldLabel = templateCatalog?.numericControls.find(
    (control) => control.controlKey === term.controlKey,
  )?.label;
  return fieldLabel ?? `Campo ${term.controlKey}`;
};

const getConditionFieldLabel = (term: TermConfig, catalog: MetaPanelCatalog): string => {
  const conditionKey = term.condition?.controlKey;
  if (!conditionKey) return 'Termino incompleto';
  const templateCatalog = catalog.controlsByTemplateId[term.templateId];
  const conditionLabel = templateCatalog?.conditionControls.find(
    (control) => control.controlKey === conditionKey,
  )?.label;
  return conditionLabel ?? `Campo ${conditionKey}`;
};

const formatConditionValue = (value: string | number | boolean | undefined): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return '...';
};

const cloneExprTokens = (tokens: MetricExprToken[] | undefined): MetricExprToken[] =>
  (tokens ?? []).map((token) => ({ ...token }));

const getInitialExprTokens = (cellConfig: MetaCellConfig): MetricExprToken[] => {
  if (Array.isArray(cellConfig.expr) && cellConfig.expr.length > 0) {
    return cloneExprTokens(cellConfig.expr);
  }
  return deriveExprFromTerms(cellConfig).map((token) => ({ ...token }));
};

const isOperandToken = (token: MetricExprToken | undefined): boolean =>
  !!token && (token.type === 'term' || token.type === 'const');

const getOpenParenBalance = (tokens: MetricExprToken[], untilIndex: number): number => {
  let balance = 0;
  for (let index = 0; index < untilIndex; index += 1) {
    const token = tokens[index];
    if (token?.type !== 'paren') continue;
    balance += token.paren === '(' ? 1 : -1;
  }
  return balance;
};

const expectsOperandAtCursor = (tokens: MetricExprToken[], cursorIndex: number): boolean => {
  let expectsOperand = true;
  for (let index = 0; index < cursorIndex; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    if (token.type === 'term' || token.type === 'const') {
      expectsOperand = false;
      continue;
    }
    if (token.type === 'op') {
      expectsOperand = true;
      continue;
    }
    expectsOperand = token.paren === '(';
  }
  return expectsOperand;
};

const getEditableConstText = (value: number, hasPendingDecimal: boolean): string =>
  hasPendingDecimal ? `${value}.` : String(value);

const getTermExpressionLabel = (term: TermConfig, catalog: MetaPanelCatalog): string => {
  if (isTermIncomplete(term)) {
    return 'Termino incompleto';
  }

  const operationLabel = OP_LABELS[term.op];
  const templateLabel = getTemplateLabel(term, catalog);
  const fieldLabel = getFieldLabel(term, catalog);

  if (term.op === 'count') {
    return `${templateLabel} (${operationLabel})`;
  }
  if (term.op === 'countIf') {
    const conditionField = getConditionFieldLabel(term, catalog);
    return `${fieldLabel} (${operationLabel}: ${conditionField}=${formatConditionValue(term.condition?.equals)})`;
  }
  return `${fieldLabel} (${operationLabel})`;
};

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
  ...(Array.isArray(config.expr) ? { expr: cloneExprTokens(config.expr) } : {}),
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
  rowId,
  rowLabel,
  rowPosition,
  colIndex,
  isOverrideActive,
  initialCellConfig,
  catalog,
  availabilityCatalog,
  onToggleOverride,
  onSave,
  onCancel,
}) => {
  const showToast = useToast();
  const expressionEditorRef = useRef<HTMLDivElement | null>(null);
  const termPrimaryControlRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const termCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draft, setDraft] = useState<MetaCellConfig>(() => cloneCellConfig(initialCellConfig));
  const [draftRowLabel, setDraftRowLabel] = useState<string>(rowLabel ?? '');
  const [draftOverrideLabel, setDraftOverrideLabel] = useState<string>(
    isOverrideActive ? (initialCellConfig.label ?? '') : '',
  );
  const [pendingFocusTermId, setPendingFocusTermId] = useState<string | null>(null);
  const [draftExprTokens, setDraftExprTokens] = useState<MetricExprToken[]>(
    () => getInitialExprTokens(initialCellConfig),
  );
  const [cursorIndex, setCursorIndex] = useState<number>(draftExprTokens.length);
  const [pendingDecimalTokenIndex, setPendingDecimalTokenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const nextExprTokens = getInitialExprTokens(initialCellConfig);
    setDraft(cloneCellConfig(initialCellConfig));
    setDraftRowLabel(rowLabel ?? '');
    setDraftOverrideLabel(isOverrideActive ? (initialCellConfig.label ?? '') : '');
    setDraftExprTokens(nextExprTokens);
    setCursorIndex(nextExprTokens.length);
    setPendingDecimalTokenIndex(null);
  }, [initialCellConfig, isOpen, isOverrideActive, rowLabel]);

  useEffect(() => {
    if (cursorIndex <= draftExprTokens.length) return;
    setCursorIndex(draftExprTokens.length);
  }, [cursorIndex, draftExprTokens.length]);

  useEffect(() => {
    if (!isOpen) return;
    const requestId = window.requestAnimationFrame(() => {
      expressionEditorRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(requestId);
  }, [isOpen]);

  const canAddTerm = draft.terms.length < MAX_TERMS;
  const exceedsTermLimit = draft.terms.length > MAX_TERMS;
  const termIdsInExpr = useMemo(() => {
    const ids = new Set<string>();
    draftExprTokens.forEach((token) => {
      if (token.type === 'term') {
        ids.add(token.termId);
      }
    });
    return ids;
  }, [draftExprTokens]);

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
    if (!canAddTerm) return;
    const nextTerms = duplicateTermAt(draft.terms, index);
    if (nextTerms === draft.terms) return;
    const duplicatedTerm = nextTerms[index + 1];
    setDraft((prev) => ({
      ...prev,
      terms: nextTerms,
    }));
    if (duplicatedTerm) {
      setPendingFocusTermId(duplicatedTerm.id);
    }
  };

  const removeTerm = async (index: number) => {
    const term = draft.terms[index];
    if (!term) return;
    if (termIdsInExpr.has(term.id)) {
      showToast('El término está en uso. Quítalo de la expresión para poder eliminar', 'error');
      return;
    }
    const confirmed = await confirmAsync({
      title: 'Eliminar término',
      message: 'Eliminar este término?\nEsta accion no se puede deshacer.',
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

  const insertExprTokenAtCursor = (token: MetricExprToken) => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    const nextTokens = draftExprTokens.slice();
    nextTokens.splice(safeCursor, 0, token);
    setDraftExprTokens(nextTokens);
    setCursorIndex(safeCursor + 1);
    setPendingDecimalTokenIndex((prev) => {
      if (prev === null) return null;
      return prev >= safeCursor ? prev + 1 : prev;
    });
  };

  const insertExprOperator = (op: '+' | '-' | '*' | '/') => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    const previousToken = draftExprTokens[safeCursor - 1];
    if (!previousToken) return;

    if (previousToken.type === 'op') {
      const nextTokens = draftExprTokens.slice();
      nextTokens[safeCursor - 1] = { type: 'op', op };
      setDraftExprTokens(nextTokens);
      setPendingDecimalTokenIndex(null);
      return;
    }

    if (!isOperandToken(previousToken) && !(previousToken.type === 'paren' && previousToken.paren === ')')) {
      return;
    }

    insertExprTokenAtCursor({ type: 'op', op });
    setPendingDecimalTokenIndex(null);
  };

  const insertOpenParen = () => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    if (!expectsOperandAtCursor(draftExprTokens, safeCursor)) {
      return;
    }
    insertExprTokenAtCursor({ type: 'paren', paren: '(' });
    setPendingDecimalTokenIndex(null);
  };

  const insertCloseParen = () => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    if (expectsOperandAtCursor(draftExprTokens, safeCursor)) {
      return;
    }
    if (getOpenParenBalance(draftExprTokens, safeCursor) <= 0) {
      return;
    }
    insertExprTokenAtCursor({ type: 'paren', paren: ')' });
    setPendingDecimalTokenIndex(null);
  };

  const insertDigit = (digit: string) => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    const previousIndex = safeCursor - 1;
    const previousToken = draftExprTokens[previousIndex];
    if (previousToken?.type === 'const') {
      const previousText = getEditableConstText(
        previousToken.value,
        pendingDecimalTokenIndex === previousIndex,
      );
      const nextText = previousText === '0' ? digit : `${previousText}${digit}`;
      const parsed = Number(nextText);
      if (!Number.isFinite(parsed)) {
        return;
      }
      const nextTokens = draftExprTokens.slice();
      nextTokens[previousIndex] = { type: 'const', value: parsed };
      setDraftExprTokens(nextTokens);
      setPendingDecimalTokenIndex(null);
      return;
    }

    insertExprTokenAtCursor({ type: 'const', value: Number(digit) });
    setPendingDecimalTokenIndex(null);
  };

  const insertDecimalPoint = () => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    const previousIndex = safeCursor - 1;
    const previousToken = draftExprTokens[previousIndex];

    if (previousToken?.type === 'const') {
      if (pendingDecimalTokenIndex === previousIndex) return;
      if (String(previousToken.value).includes('.')) return;
      setPendingDecimalTokenIndex(previousIndex);
      return;
    }

    insertExprTokenAtCursor({ type: 'const', value: 0 });
    setPendingDecimalTokenIndex(safeCursor);
  };

  const handleExprBackspace = () => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    if (safeCursor <= 0) {
      return;
    }

    const previousIndex = safeCursor - 1;
    const previousToken = draftExprTokens[previousIndex];
    if (!previousToken) return;

    if (previousToken.type === 'const') {
      if (pendingDecimalTokenIndex === previousIndex) {
        setPendingDecimalTokenIndex(null);
        return;
      }
      const previousText = String(previousToken.value);
      const nextText = previousText.slice(0, -1);
      if (!nextText) {
        const nextTokens = draftExprTokens.slice();
        nextTokens.splice(previousIndex, 1);
        setDraftExprTokens(nextTokens);
        setCursorIndex(previousIndex);
        setPendingDecimalTokenIndex((prev) => {
          if (prev === null || prev === previousIndex) return null;
          return prev > previousIndex ? prev - 1 : prev;
        });
        return;
      }

      const parsed = Number(nextText);
      if (!Number.isFinite(parsed)) {
        return;
      }
      const nextTokens = draftExprTokens.slice();
      nextTokens[previousIndex] = { type: 'const', value: parsed };
      setDraftExprTokens(nextTokens);
      return;
    }

    const nextTokens = draftExprTokens.slice();
    nextTokens.splice(previousIndex, 1);
    setDraftExprTokens(nextTokens);
    setCursorIndex(previousIndex);
    setPendingDecimalTokenIndex((prev) => {
      if (prev === null) return null;
      return prev > previousIndex ? prev - 1 : prev;
    });
  };

  const handleExprDelete = () => {
    const safeCursor = Math.max(0, Math.min(cursorIndex, draftExprTokens.length));
    if (safeCursor >= draftExprTokens.length) {
      return;
    }

    const token = draftExprTokens[safeCursor];
    if (!token) return;

    if (token.type === 'const') {
      if (pendingDecimalTokenIndex === safeCursor) {
        setPendingDecimalTokenIndex(null);
        return;
      }
      const nextText = String(token.value).slice(0, -1);
      if (!nextText) {
        const nextTokens = draftExprTokens.slice();
        nextTokens.splice(safeCursor, 1);
        setDraftExprTokens(nextTokens);
        setPendingDecimalTokenIndex((prev) => {
          if (prev === null || prev === safeCursor) return null;
          return prev > safeCursor ? prev - 1 : prev;
        });
        return;
      }
      const parsed = Number(nextText);
      if (!Number.isFinite(parsed)) return;
      const nextTokens = draftExprTokens.slice();
      nextTokens[safeCursor] = { type: 'const', value: parsed };
      setDraftExprTokens(nextTokens);
      return;
    }

    const nextTokens = draftExprTokens.slice();
    nextTokens.splice(safeCursor, 1);
    setDraftExprTokens(nextTokens);
    setPendingDecimalTokenIndex((prev) => {
      if (prev === null) return null;
      return prev > safeCursor ? prev - 1 : prev;
    });
  };

  const clearExpr = () => {
    setDraftExprTokens([]);
    setCursorIndex(0);
    setPendingDecimalTokenIndex(null);
  };

  const insertTermIntoExpr = (termId: string) => {
    insertExprTokenAtCursor({ type: 'term', termId });
    setPendingDecimalTokenIndex(null);
    expressionEditorRef.current?.focus();
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

  const exprValidation = useMemo(
    () => validateExprTokens(draftExprTokens),
    [draftExprTokens],
  );
  const showExprDesyncWarning = useMemo(
    () => draft.terms.some((term) => !termIdsInExpr.has(term.id)),
    [draft.terms, termIdsInExpr],
  );
  const isSaveDisabled = invalidTermIndexes.size > 0 || exceedsTermLimit || !exprValidation.isValid;

  const handleSave = () => {
    if (isSaveDisabled) return;
    const nextCellConfig = cloneCellConfig(draft);
    if (draftExprTokens.length > 0) {
      nextCellConfig.expr = cloneExprTokens(draftExprTokens);
    } else {
      delete nextCellConfig.expr;
    }
    onSave(
      rowId,
      nextCellConfig,
      draftRowLabel.trim(),
      draftOverrideLabel.trim(),
    );
  };

  const handleModalKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!isSaveDisabled) {
        handleSave();
      }
    }
  };

  const termExpressionLabelById = useMemo(
    () =>
      new Map(
        draft.terms.map((term) => [term.id, getTermExpressionLabel(term, catalog)]),
      ),
    [catalog, draft.terms],
  );
  const editingRowContext = useMemo(() => {
    const safeLabel = rowLabel?.trim();
    if (safeLabel) {
      return `Editando: ${safeLabel}`;
    }
    return `Editando: Métrica ${rowPosition}`;
  }, [rowLabel, rowPosition]);

  useEffect(() => {
    if (!pendingFocusTermId || !isOpen) return;
    const requestId = window.requestAnimationFrame(() => {
      const cardNode = termCardRefs.current[pendingFocusTermId];
      const focusNode = termPrimaryControlRefs.current[pendingFocusTermId];
      if (cardNode) {
        cardNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (focusNode) {
        focusNode.focus();
      }
    });
    setPendingFocusTermId(null);
    return () => window.cancelAnimationFrame(requestId);
  }, [draft.terms, isOpen, pendingFocusTermId]);

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
        onKeyDown={handleModalKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h3 id="meta-calc-cell-editor-title">Métricas por periodo</h3>
              <p className={styles.headerSubtext}>{editingRowContext}</p>
              <p className={styles.headerSubtext}>Periodo seleccionado: {colIndex + 1}</p>
              <p className={styles.modeChip}>
                {isOverrideActive
                  ? 'Personalizacion de este periodo'
                  : 'Métrica general (todos los periodos)'}
              </p>
            </div>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={isOverrideActive}
                onChange={(event) => onToggleOverride(rowId, event.target.checked)}
              />
              <span>Personalizar este periodo</span>
            </label>
          </div>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Nombre de la métrica</h4>
            {isOverrideActive ? (
              <>
                <div className={styles.formRow}>
                  <label>Nombre para este periodo</label>
                  <input
                    type="text"
                    value={draftOverrideLabel}
                    onChange={(event) => setDraftOverrideLabel(event.target.value)}
                    placeholder="Nombre para este periodo"
                  />
                </div>
                <p className={styles.sectionHint}>Si lo dejas vacio, se usara el nombre de la métrica general.</p>
              </>
            ) : (
              <div className={styles.formRow}>
                <label>Nombre de la métrica</label>
                <input
                  type="text"
                  value={draftRowLabel}
                  onChange={(event) => setDraftRowLabel(event.target.value)}
                  placeholder="Nombre de la métrica"
                />
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Expresion</h4>
            <MetricExpressionEditor
              tokens={draftExprTokens}
              cursorIndex={cursorIndex}
              pendingDecimalTokenIndex={pendingDecimalTokenIndex}
              termExpressionLabelById={termExpressionLabelById}
              editorRef={expressionEditorRef}
              errorMessage={!exprValidation.isValid ? (exprValidation.message ?? 'Expresion incompleta.') : undefined}
              errorClassName={styles.error}
              onSetCursor={setCursorIndex}
              onInsertOperator={insertExprOperator}
              onInsertOpenParen={insertOpenParen}
              onInsertCloseParen={insertCloseParen}
              onInsertDigit={insertDigit}
              onInsertDecimalPoint={insertDecimalPoint}
              onBackspace={handleExprBackspace}
              onDelete={handleExprDelete}
              onClear={clearExpr}
            />
            {showExprDesyncWarning ? (
              <p className={styles.sectionHint}>La expresión puede no reflejar los términos actuales.</p>
            ) : null}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Constructor de términos</h4>
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
                  ref={(node) => {
                    termCardRefs.current[term.id] = node;
                  }}
                >
                  <div className={styles.termMainRow}>
                    <div className={`${styles.termControl} ${styles.termSignControl}`}>
                      <label>Signo</label>
                      <div className={styles.signGroup} role="group" aria-label={`Signo del término ${termIndex + 1}`}>
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
                        ref={(node) => {
                          termPrimaryControlRefs.current[term.id] = node;
                        }}
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
                          aria-label={`Mover término ${termIndex + 1} arriba`}
                          title="Mover arriba"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => moveTermDown(termIndex)}
                          disabled={isLastTerm}
                          aria-label={`Mover término ${termIndex + 1} abajo`}
                          title="Mover abajo"
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => duplicateTerm(termIndex)}
                          disabled={!canAddTerm}
                          aria-label={`Duplicar término ${termIndex + 1}`}
                          title="Duplicar"
                        >
                          <DuplicateIcon />
                        </Button>
                        <Button
                          type="button"
                          className={styles.actionIconButton}
                          onClick={() => { void removeTerm(termIndex); }}
                          aria-label={`Eliminar término ${termIndex + 1}`}
                          title="Eliminar"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.termInsertRow}>
                    <Button
                      type="button"
                      className={styles.insertExprButton}
                      onClick={() => insertTermIntoExpr(term.id)}
                      title="Insertar en expresion"
                    >
                      Insertar en expresion
                    </Button>
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
                          ? 'Tipo de bloque no disponible en este periodo.'
                          : 'El tipo de bloque de la métrica general no esta disponible en este periodo.')
                        : 'Este término no se aplica en este periodo.'}
                    </p>
                  ) : null}

                  {isInvalid ? (
                    <p className={styles.termError}>Completa este término para poder guardar.</p>
                  ) : null}
                </div>
              );
            })}

            <div className={styles.builderFooter}>
              <Button
                type="button"
                onClick={() => {
                  if (!canAddTerm) return;
                  const newTerm = buildEmptyTerm();
                  setDraft((prev) => ({ ...prev, terms: [...prev.terms, newTerm] }));
                  setPendingFocusTermId(newTerm.id);
                }}
                disabled={!canAddTerm}
              >
                Agregar término
              </Button>
              <div className={styles.limitInfo}>
                <span className={styles.counterText}>{draft.terms.length}/{MAX_TERMS} términos</span>
                {!canAddTerm ? <span className={styles.limitReachedText}>Limite alcanzado.</span> : null}
              </div>
            </div>
          </section>

          {isSaveDisabled ? (
            <p className={styles.error}>
              {invalidTermIndexes.size > 0 || exceedsTermLimit
                ? 'Revisa los terminos incompletos antes de guardar.'
                : (exprValidation.message ?? 'Expresion incompleta.')}
            </p>
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
