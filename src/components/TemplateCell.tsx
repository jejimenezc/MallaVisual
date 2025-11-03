// src/components/TemplateCell.tsx

import React from 'react';
import { BlockTemplate, BlockTemplateCell } from '../types/curricular.ts';
import { VisualTemplate } from '../types/visual.ts';
import { evaluateExpression } from '../utils/calc.ts';

interface Props {
  cell: BlockTemplateCell;
  row: number;
  col: number;
  template: BlockTemplate;
  isSelected: boolean;
  onClick: (e: React.MouseEvent, row: number, col: number) => void;
  onContextMenu: (e: React.MouseEvent, row: number, col: number) => void;
  onMouseDown: (row: number, col: number) => void;
  onMouseEnter: (row: number, col: number) => void;
  /** aplicar estilos de vista (solo en Viewer) */
  applyVisual?: boolean;
  /** mapa visual (solo para Viewer) */
  visualTemplate?: VisualTemplate;
  /** valores ingresados en modo vista */
  values?: Record<string, string | number | boolean>;
  onValueChange?: (key: string, value: string | number | boolean) => void;
}

export const TemplateCell: React.FC<Props> = ({
  cell,
  row,
  col,
  template,
  isSelected,
  onClick,
  onContextMenu,
  onMouseDown,
  onMouseEnter,
  applyVisual = false,
  visualTemplate,
  values = {},
  onValueChange,
}) => {
  const key = `${row}-${col}`;
  const valueKey = `r${row}c${col}`;
  const isMerged = !!cell.mergedWith;
  const cellCoord = `${row}-${col}`;

  // Base = no tiene mergedWith y al menos otra celda lo referencia
  const isBase =
    cell.mergedWith === undefined &&
    template.some((r) => r.some((c) => c?.mergedWith === cellCoord));

  const mergedGroup = template
    .flatMap((r, rIdx) =>
      r.map((c, cIdx) =>
        c?.mergedWith === cellCoord ? { row: rIdx, col: cIdx } : undefined
      )
    )
    .filter((v): v is { row: number; col: number } => v !== undefined);

  const checked = Boolean(values[valueKey]);

    // --- VISIBILIDAD ---
    if (applyVisual) {
      // Vista: solo activas; miembros no renderizan
      if (!cell.active) return null;
      if (isMerged && !isBase) return null;
    }
    // Edición: nunca return null (miembros quedan invisibles pero ocupan su celda)

    // Lookup de estilo visual (solo vista)
    const baseKey = cell.mergedWith ?? key;
    const v = applyVisual ? visualTemplate?.[baseKey] : undefined;

  // Vista: expandimos si todo el grupo está activo
  const allActiveInGroup =
    (cell.active ?? false) &&
    mergedGroup.every(({ row, col }) => template[row][col].active);

  // Estilo base en edición (no mezclado con visual)
  const editBaseStyle: React.CSSProperties = {
    backgroundColor: cell.active ? '#e9f1ff' : '#ffffff',
    border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
    color: '#111827',
  };

  // Anclaje absoluto
  const anchoredPosition: React.CSSProperties = {
    gridRow: `${row + 1} / ${row + 2}`,
    gridColumn: `${col + 1} / ${col + 2}`,
  };

  // Span en edición y/o vista
  const shouldSpanInEdit = !applyVisual && isBase && mergedGroup.length > 0;
  const shouldSpanInView = applyVisual && isBase && allActiveInGroup;

  const spanStyle: React.CSSProperties =
    (shouldSpanInEdit || shouldSpanInView)
      ? {
          gridRow: `${Math.min(row, ...mergedGroup.map((c) => c.row)) + 1} / ${
            Math.max(row, ...mergedGroup.map((c) => c.row)) + 2
          }`,
          gridColumn: `${
            Math.min(col, ...mergedGroup.map((c) => c.col)) + 1
          } / ${Math.max(col, ...mergedGroup.map((c) => c.col)) + 2}`,
          zIndex: 2,
        }
      : {};

  // Fallback de color en vista si no hay background configurado
  const viewFallbackBg =
    applyVisual && cell.active && !v?.backgroundColor ? '#ffffff' : undefined;

  // Mapeo legacy enum -> px (si no hay fontSizePx)
  const enumToPx = (fs?: 'small' | 'normal' | 'large') =>
    fs === 'small' ? 12 : fs === 'large' ? 20 : 14;

  const computedFontSizePx =
    applyVisual ? (v?.fontSizePx ?? enumToPx(v?.fontSize)) : undefined;
  const textAlignment = applyVisual ? v?.textAlign : undefined;
  const justifyFromAlignment =
    textAlignment === 'right'
      ? 'flex-end'
      : textAlignment === 'center'
      ? 'center'
      : 'flex-start';
  let conditionalColor: string | undefined;
  if (applyVisual && cell.type === 'text') {
    const src = v?.conditionalBg?.selectSource;
    if (src) {
      const [sr, sc] = src.coord.split('-').map(Number);
      const selKey = `r${sr}c${sc}`;
      const selVal = values[selKey];
      if (selVal !== undefined) {
        conditionalColor = src.colors[String(selVal)];
      }
    }
  }

  const bgColor = conditionalColor || v?.backgroundColor || viewFallbackBg;
  const textColor = v?.textColor ?? cell.style?.textColor;

  // Estilo del contenedor (.template-cell)
  const style: React.CSSProperties = {
    ...anchoredPosition,
    ...(applyVisual ? {} : editBaseStyle),
    ...spanStyle,
    // Fondo/borde del contenedor en vista
    ...(applyVisual
      ? v?.border === false
        ? { border: '1px solid transparent' }
        : v?.border
        ? { border: '1px solid #333' }
        : {}
      : {}),
    ...(applyVisual && bgColor ? { backgroundColor: bgColor } : {}),
    ...(applyVisual && cell.type === 'checkbox' && checked && v?.conditionalBg?.checkedColor
      ? { backgroundColor: v.conditionalBg.checkedColor }
      : {}),
    // ⛔️ OJO: ya NO aplicamos fontSize ni textAlign aquí
    ...(applyVisual && v?.textAlign
      ? {
          justifyContent:
            v.textAlign === 'left'
              ? 'flex-start'
              : v.textAlign === 'right'
              ? 'flex-end'
              : 'center',
        }
      : {}),
  };

  // En edición: miembros invisibles pero ocupan espacio
  if (!applyVisual && isMerged && !isBase) {
    style.visibility = 'hidden';
    style.pointerEvents = 'none';
    style.border = '1px solid transparent';
    style.backgroundColor = 'transparent';
  }

  // Contenido textual (estático)
  const displayStaticText =
    cell.type === 'staticText' && (cell.label ?? '').trim().length > 0
      ? cell.label!.trim()
      : '';

  // Placeholder para campos de texto o número (solo edición)
  let displayPlaceholder = '';
  if (cell.type === 'text' || cell.type === 'number') {
    const ph = (cell.placeholder ?? '').trim();
    if (ph && !applyVisual) {
      displayPlaceholder = ph;
    }
  }

  const hasLabel = !!(cell.label && cell.label.trim().length > 0);
  const showLabelOverlay = !applyVisual && hasLabel;

  // Icono distintivo para cada tipo de control (solo en edición)
  const controlIcon = !applyVisual
    ? cell.type === 'text'
      ? '📝'
      : cell.type === 'staticText'
      ? '🔒'
      : cell.type === 'checkbox'
      ? '☑️'
      : cell.type === 'select'
      ? '🔽'
      : cell.type === 'number'
      ? '🔢'
      : cell.type === 'calculated'
      ? '🧮'
      : undefined
    : undefined;

  // 🎯 Estilos SOLO del contenido (.cell-content): padding, font-size, text-align
  const contentStyle: React.CSSProperties = {};
  if (applyVisual) {
    const px = Math.max(0, Math.min(64, v?.paddingX ?? 8));
    const py = Math.max(0, Math.min(64, v?.paddingY ?? 6));
    contentStyle.padding = `${py}px ${px}px`;
    if (computedFontSizePx) contentStyle.fontSize = `${computedFontSizePx}px`;
    if (v?.textAlign) contentStyle.textAlign = v.textAlign;
    if (textColor) contentStyle.color = textColor;
    // staticText: allow cell-content to shrink vertically so parent flex can center it
    if (cell.type === 'staticText') {
      contentStyle.height = 'auto';
      contentStyle.display = 'flex';
      contentStyle.alignItems = 'center';
      contentStyle.justifyContent = justifyFromAlignment;
    }
    if (cell.type === 'checkbox') {
      const justify =
        v?.textAlign === 'right'
          ? 'flex-end'
          : v?.textAlign === 'center'
          ? 'center'
          : 'flex-start';
      (contentStyle as React.CSSProperties & Record<string, string>)[
        '--checkbox-justify'
      ] = justify;
    }
  }

  const textInputWrapperStyle: React.CSSProperties | undefined =
    applyVisual && cell.type === 'text'
      ? {
          display: 'flex',
          alignItems: 'center',
          justifyContent: justifyFromAlignment,
          width: '100%',
          height: '100%',
        }
      : undefined;
  
  const numberStep =
    cell.type === 'number'
      ? Math.pow(10, -(cell.decimalDigits ?? 0))
      : undefined;

  return (
    <div
      key={key}
      className={`template-cell ${cell.active ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isMerged ? 'merged' : ''} ${isBase ? 'base-cell' : ''} ${showLabelOverlay ? 'labelled' : ''}`}
      style={style}
      onClick={(e) => onClick(e, row, col)}
      onContextMenu={(e) => onContextMenu(e, row, col)}
      onMouseDown={() => onMouseDown(row, col)}
      onMouseEnter={() => onMouseEnter(row, col)}
      title={displayStaticText || undefined}
      aria-label={displayStaticText || undefined}
      role="gridcell"
      data-label={showLabelOverlay ? cell.label : undefined}
    >
      {controlIcon && <span className="control-icon">{controlIcon}</span>}
      {displayStaticText ? (
        <div className="cell-content" data-kind="staticText" style={contentStyle}>
          <span className="cell-text">{displayStaticText}</span>
        </div>
      ) : applyVisual && cell.type === 'text' ? (
        <div className="cell-content input-wrapper" data-kind="textInput" style={textInputWrapperStyle}>
          <textarea
            placeholder={cell.placeholder}
            className="text-input"
            style={contentStyle}
            rows={1}
            value={String(values[valueKey] ?? '')}
            onChange={(e) => onValueChange?.(valueKey, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (!text) return;
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const sanitized = text.replace(/[\r\n]+/g, '');
              const { selectionStart, selectionEnd, value } = target;
              const nextValue =
                value.slice(0, selectionStart ?? 0) +
                sanitized +
                value.slice(selectionEnd ?? value.length);
              target.value = nextValue;
              onValueChange?.(valueKey, nextValue);
            }}
          />
        </div>
      ) : applyVisual && cell.type === 'number' ? (
          <input
            type="number"
            placeholder={cell.placeholder}
            className="number-input"
            style={contentStyle}
            step={numberStep}
            value={typeof values[valueKey] === 'number' ? values[valueKey] : ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onValueChange?.(valueKey, Number.isNaN(val) ? 0 : val);
            }}
          />
        ) : applyVisual && cell.type === 'checkbox' ? (
          <div className="cell-content" data-kind="checkbox" style={contentStyle}>
            <label className="checkbox-control">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onValueChange?.(valueKey, e.target.checked)}
              />
              {cell.label}
            </label>
          </div>
        ) : applyVisual && cell.type === 'select' ? (
        <select
          className="select-input"
          style={contentStyle}
          value={String(values[valueKey] ?? '')}
          onChange={(e) => onValueChange?.(valueKey, e.target.value)}
        >
          {/* Opción en blanco por defecto para evitar cambios iniciales de color */}
          <option value=""></option>
          {(cell.dropdownOptions ?? []).map((opt, idx) => (
            <option key={idx} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : applyVisual && cell.type === 'calculated' ? (
        <input
          type="text"
          placeholder={cell.expression ?? 'a+b'}
          className="calculated-input"
          style={contentStyle}
          readOnly
          value={(() => {
            const res = cell.expression
              ? evaluateExpression(cell.expression, values as Record<string, number>)
              : NaN;
            return Number.isNaN(res) ? '' : String(res);
          })()}
        />
      ) : displayPlaceholder ? (
        <div className="cell-content placeholder" data-kind="textPlaceholder" style={contentStyle}>
          <span className="cell-text">{displayPlaceholder}</span>
        </div>
            ) : null}

    </div>
  );
};