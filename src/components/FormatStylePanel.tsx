// src/components/FormatStylePanel.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './FormatStylePanel.css';
import { coordKey } from '../types/visual';
import type {
  VisualTemplate,
  VisualStyle,
  BlockAspect,
  ConditionalBg,
} from '../types/visual';
import type { BlockTemplate, BlockTemplateCell } from '../types/curricular';
import { generatePalette } from '../utils/palette';

interface FormatStylePanelProps {
  selectedCoord?: { row: number; col: number };
  visualTemplate: VisualTemplate;
  onUpdateVisual: (next: VisualTemplate) => void;
  template: BlockTemplate;
  blockAspect: BlockAspect;
  onUpdateAspect: (a: BlockAspect) => void;
}

type SliderKey = 'fontSizePx' | 'paddingX' | 'paddingY';

type SliderConfig = {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
  presets: number[];
  suffix: string;
};

const SLIDERS: Record<SliderKey, SliderConfig> = {
  fontSizePx: {
    key: 'fontSizePx',
    label: 'Tamaño de fuente',
    min: 10,
    max: 48,
    step: 1,
    presets: [12, 14, 16, 18, 24, 32],
    suffix: 'px',
  },
  paddingX: {
    key: 'paddingX',
    label: 'Relleno horizontal',
    min: 0,
    max: 100,
    step: 1,
    presets: [0, 4, 8, 16, 24, 32],
    suffix: 'px',
  },
  paddingY: {
    key: 'paddingY',
    label: 'Relleno vertical',
    min: 0,
    max: 100,
    step: 1,
    presets: [0, 4, 8, 12, 16, 24],
    suffix: 'px',
  },
};

type AlignmentValue = NonNullable<VisualStyle['textAlign']>;

const ALIGNMENT_OPTIONS: { value: AlignmentValue; icon: string; label: string }[] = [
  { value: 'left', icon: '⭰', label: 'Izquierda' },
  { value: 'center', icon: '⭲', label: 'Centro' },
  { value: 'right', icon: '⭱', label: 'Derecha' },
  { value: 'justify', icon: '☰', label: 'Justificado' },
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const expandShortHex = (hex: string) =>
  `#${hex
    .slice(1)
    .split('')
    .map((char) => char + char)
    .join('')}`;

const normalizeHex = (hex: string) => {
  if (!hex) return '#000000';
  const prefixed = hex.startsWith('#') ? hex : `#${hex}`;
  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return expandShortHex(prefixed).toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }
  return '#000000';
};

const sanitizeConditionalBg = (value?: ConditionalBg | null): ConditionalBg | undefined => {
  if (!value) return undefined;
  const next: ConditionalBg = {};
  if (value.selectSource && value.selectSource.coord) {
    next.selectSource = value.selectSource;
  }
  if (value.checkedColor) {
    next.checkedColor = value.checkedColor;
  }
  if (value.hoverCheckedColor) {
    next.hoverCheckedColor = value.hoverCheckedColor;
  }
  return Object.keys(next).length ? next : undefined;
};

interface PopoverProps {
  anchorRect: DOMRect | null;
  onClose: () => void;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  anchorRect,
  onClose,
  width = 220,
  className,
  style,
  children,
}) => {
  useEffect(() => {
    if (!anchorRect) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [anchorRect, onClose]);

  if (!anchorRect) return null;

  const baseStyle: React.CSSProperties = {
    top: anchorRect.bottom + window.scrollY + 8,
    left: anchorRect.left + window.scrollX,
    width,
  };

  const mergedStyle = { ...baseStyle, ...style } as React.CSSProperties;

  return createPortal(
    <div className="format-popover-layer" role="presentation">
      <div className="format-popover-backdrop" onMouseDown={onClose} />
      <div
        className={`format-popover ${className ?? ''}`.trim()}
        style={mergedStyle}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

interface SliderPopoverProps {
  slider: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  panelRect: DOMRect | null;
}

const SliderPopover: React.FC<SliderPopoverProps> = ({
  slider,
  value,
  onChange,
  onClose,
  anchorRect,
  panelRect,
}) => (
  <Popover
    anchorRect={anchorRect}
    onClose={onClose}
    width={200}
    style={
      panelRect
        ? {
            top: anchorRect ? anchorRect.top + window.scrollY : undefined,
            left: panelRect.right - 200 + window.scrollX,
            height: 200,
          }
        : { height: 200 }
    }
    className="slider-popover"
  >
    <div className="slider-popover__content" role="group" aria-label={slider.label}>
      <div className="slider-popover__value">
        <strong>{`${value}${slider.suffix}`}</strong>
        <span>Ctrl+↑/↓ para ajustes rápidos</span>
      </div>
      <input
        className="slider-popover__slider"
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value}${slider.suffix}`}
      />
      <input
        className="slider-popover__input"
        type="number"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={value}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value), slider.min, slider.max))
        }
        aria-label={`${slider.label} exacto`}
      />
      <div className="slider-popover__presets" role="list">
        {slider.presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="slider-popover__preset"
            onClick={() => onChange(preset)}
          >
            {`${preset}${slider.suffix}`}
          </button>
        ))}
      </div>
      <div className="slider-popover__actions">
        <button type="button" onClick={onClose} className="slider-popover__close">
          Listo
        </button>
      </div>
    </div>
  </Popover>
);

const isControlType = (cell?: BlockTemplateCell | null): cell is BlockTemplateCell => Boolean(cell);

export const FormatStylePanel: React.FC<FormatStylePanelProps> = ({
  selectedCoord,
  visualTemplate,
  onUpdateVisual,
  template,
  blockAspect,
  onUpdateAspect,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backgroundColorInputRef = useRef<HTMLInputElement | null>(null);
  const [colorPopover, setColorPopover] = useState<{
    type: 'checkbox-normal' | 'checkbox-hover';
    anchor: DOMRect | null;
  } | null>(null);
  const [alignmentAnchor, setAlignmentAnchor] = useState<DOMRect | null>(null);
  const [activeSlider, setActiveSlider] = useState<{
    key: SliderKey;
    anchor: DOMRect | null;
  } | null>(null);
  const [advancedAnchor, setAdvancedAnchor] = useState<DOMRect | null>(null);

  const k = selectedCoord ? coordKey(selectedCoord.row, selectedCoord.col) : undefined;

  const current: VisualStyle = useMemo(() => (k ? visualTemplate[k] ?? {} : {}), [k, visualTemplate]);

  const selectedCell = useMemo(() => {
    if (!selectedCoord) return undefined;
    return template[selectedCoord.row]?.[selectedCoord.col];
  }, [selectedCoord, template]);

  const patch = useCallback(
    (partial: Partial<VisualStyle>) => {
      if (!k) return;
      const base: VisualStyle = { ...current, ...partial };
      if ('conditionalBg' in partial) {
        if (!partial.conditionalBg) {
          delete base.conditionalBg;
        } else {
          base.conditionalBg = sanitizeConditionalBg(partial.conditionalBg) ?? undefined;
          if (!base.conditionalBg) {
            delete base.conditionalBg;
          }
        }
      }
      const next = { ...visualTemplate, [k]: base };
      onUpdateVisual(next);
    },
    [current, k, onUpdateVisual, visualTemplate]
  );

  const updateConditionalBg = useCallback(
    (updater: (prev: ConditionalBg | undefined) => ConditionalBg | undefined) => {
      if (!k) return;
      const nextValue = sanitizeConditionalBg(updater(current.conditionalBg));
      const base: VisualStyle = { ...current };
      if (nextValue) {
        base.conditionalBg = nextValue;
      } else {
        delete base.conditionalBg;
      }
      onUpdateVisual({ ...visualTemplate, [k]: base });
    },
    [current, k, onUpdateVisual, visualTemplate]
  );

  const resetStyle = useCallback(() => {
    if (!k) return;
    const next = { ...visualTemplate };
    delete next[k];
    onUpdateVisual(next);
  }, [k, onUpdateVisual, visualTemplate]);

  const fontPx = current.fontSizePx ?? 14;
  const padX = current.paddingX ?? 8;
  const padY = current.paddingY ?? 6;

  const selectCells = useMemo(() => {
    const cells: { coord: string; options: string[] }[] = [];
    template.forEach((row, rIdx) =>
      row.forEach((cell, cIdx) => {
        if (cell.type === 'select') {
          cells.push({
            coord: coordKey(rIdx, cIdx),
            options: cell.dropdownOptions ?? [],
          });
        }
      })
    );
    return cells;
  }, [template]);

  const handleSelectSourceChange = (coord: string) => {
    if (!k) return;
    if (!coord) {
      updateConditionalBg((prev) => {
        if (!prev) return undefined;
        const next: ConditionalBg = { ...prev };
        delete next.selectSource;
        return next;
      });
      return;
    }
    const source = selectCells.find((c) => c.coord === coord);
    const palette = generatePalette(source?.options.length ?? 0);
    const colors = Object.fromEntries(
      (source?.options ?? []).map((opt, idx) => [opt, palette[idx] ?? '#cccccc'])
    );
    updateConditionalBg((prev) => ({ ...prev, selectSource: { coord, colors } }));
  };

  const openColorPopover = (type: 'checkbox-normal' | 'checkbox-hover') => (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    setColorPopover({ type, anchor });
  };

  const closeColorPopover = () => {
    setColorPopover(null);
  };

  const backgroundColor = current.backgroundColor ?? '#ffffff';
  const normalizedBackgroundColor = normalizeHex(backgroundColor);
  const backgroundColorLabel = normalizedBackgroundColor.toUpperCase();
  const checkedColor = current.conditionalBg?.checkedColor ?? '#2dd4bf';
  const hoverCheckedColor = current.conditionalBg?.hoverCheckedColor ?? '#14b8a6';
  const checkboxColorEnabled = Boolean(current.conditionalBg?.checkedColor);

  const handleBackgroundColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    patch({ backgroundColor: normalizeHex(event.target.value) });
  };

  const handleBackgroundPickerOpen = () => {
    const input = backgroundColorInputRef.current;
    if (!input) return;
    input.click();
  };

  const handleCheckboxColorToggle = (checked: boolean) => {
    if (checked) {
      updateConditionalBg((prev) => ({
        ...prev,
        checkedColor: prev?.checkedColor ?? '#2dd4bf',
        hoverCheckedColor: prev?.hoverCheckedColor ?? '#14b8a6',
      }));
    } else {
      updateConditionalBg((prev) => {
        if (!prev) return undefined;
        const next: ConditionalBg = { ...prev };
        delete next.checkedColor;
        delete next.hoverCheckedColor;
        return next;
      });
    }
  };

  const renderColorPopoverContent = () => {
    if (!colorPopover) return null;
    const rawValue =
      colorPopover.type === 'checkbox-normal' ? checkedColor : hoverCheckedColor;

    const value = normalizeHex(rawValue);

    const labelText =
      colorPopover.type === 'checkbox-hover' ? 'Estado hover' : 'Estado normal';

    const handleChange = (nextColor: string) => {
      if (!k) return;
      if (colorPopover.type === 'checkbox-normal') {
        updateConditionalBg((prev) => ({ ...prev, checkedColor: nextColor }));
      } else {
        updateConditionalBg((prev) => ({ ...prev, hoverCheckedColor: nextColor }));
      }
    };

    return (
      <Popover anchorRect={colorPopover.anchor} onClose={closeColorPopover} width={240}>
        <div className="color-popover" role="group" aria-label={labelText}>
          <label className="color-popover__field">
            <span>{labelText}</span>
            <input
              type="color"
              value={value}
              onChange={(event) => handleChange(normalizeHex(event.target.value))}
              aria-label={labelText}
            />
            <output aria-live="polite">{value.toUpperCase()}</output>
          </label>
          <p className="color-popover__hint">
            Configura el color base y el estado hover para mantener contraste.
          </p>
        </div>
      </Popover>
    );
  };

  const renderAlignmentPopover = () => (
    <Popover anchorRect={alignmentAnchor} onClose={() => setAlignmentAnchor(null)} width={160}>
      <div className="alignment-popover" role="listbox" aria-label="Alineación de texto">
        {ALIGNMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={current.textAlign === option.value}
            className={`alignment-popover__item${
              current.textAlign === option.value ? ' is-active' : ''
            }`}
            onClick={() => {
              patch({ textAlign: option.value });
              setAlignmentAnchor(null);
            }}
          >
            <span className="alignment-popover__icon" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </Popover>
  );

  const renderSliderPopover = () => {
    if (!activeSlider) return null;
    const config = SLIDERS[activeSlider.key];
    const value =
      activeSlider.key === 'fontSizePx'
        ? fontPx
        : activeSlider.key === 'paddingX'
        ? padX
        : padY;
    const panelRect = panelRef.current?.getBoundingClientRect() ?? null;

    const handleChange = (val: number) => {
      const next = clamp(val, config.min, config.max);
      if (activeSlider.key === 'fontSizePx') {
        patch({ fontSizePx: next });
      } else if (activeSlider.key === 'paddingX') {
        patch({ paddingX: next });
      } else {
        patch({ paddingY: next });
      }
    };

    return (
      <SliderPopover
        slider={config}
        value={value}
        onChange={handleChange}
        onClose={() => setActiveSlider(null)}
        anchorRect={activeSlider.anchor}
        panelRect={panelRect}
      />
    );
  };

  const handleSliderOpen = (key: SliderKey) => (event: React.MouseEvent<HTMLButtonElement>) => {
    setAdvancedAnchor(null);
    setActiveSlider({ key, anchor: event.currentTarget.getBoundingClientRect() });
  };

  const toggleAdvanced = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAdvancedAnchor((prev) => (prev ? null : rect));
  };

  const closeAdvanced = () => setAdvancedAnchor(null);

  const renderAdvancedPopover = () => {
    if (!advancedAnchor) return null;
    return (
      <Popover anchorRect={advancedAnchor} onClose={closeAdvanced} width={240}>
        <div className="advanced-popover" role="group" aria-label="Opciones avanzadas de estilo">
          <div className="format-field">
            <div className="format-field__label">
              <span aria-hidden="true">↔️</span>
              <span>Relleno horizontal</span>
            </div>
            <button type="button" className="value-chip" onClick={handleSliderOpen('paddingX')}>
              {`${padX}px`}
            </button>
          </div>
          <div className="format-field">
            <div className="format-field__label">
              <span aria-hidden="true">↕️</span>
              <span>Relleno vertical</span>
            </div>
            <button type="button" className="value-chip" onClick={handleSliderOpen('paddingY')}>
              {`${padY}px`}
            </button>
          </div>
        </div>
      </Popover>
    );
  };

  const aspectOptions: { value: BlockAspect; label: string }[] = [
    { value: '1/1', label: '1:1' },
    { value: '1/2', label: '1:2 (vertical)' },
    { value: '2/1', label: '2:1 (apaisado)' },
  ];

  const canEditControl = Boolean(selectedCoord && isControlType(selectedCell));
  const isCheckboxControl = canEditControl && selectedCell?.type === 'checkbox';
  const isTextControl = canEditControl && selectedCell?.type === 'text';
  const isCustomizableControl = isCheckboxControl || isTextControl;

  return (
    <div className="format-style-panel" ref={panelRef}>
      <header className="format-panel-header">
        <div className="format-panel-title">
          <span aria-hidden="true">🖌️</span>
          <h3>Formato de bloque</h3>
        </div>
      </header>

      <section className="format-section">
        <div className="format-section__header">
          <div className="format-section__title">
            <span className="format-section__eyebrow">General</span>
            <span
              className="format-section__tooltip"
              role="img"
              aria-label="Configura parámetros que afectan al bloque completo."
              title="Configura parámetros que afectan al bloque completo."
            >
              ℹ️
            </span>
          </div>
        </div>
        <div className="format-field">
          <div className="format-field__label">
            <span aria-hidden="true">📐</span>
            <label htmlFor="aspect-select">Relación de aspecto</label>
          </div>
          <select
            id="aspect-select"
            value={blockAspect}
            onChange={(event) => onUpdateAspect(event.target.value as BlockAspect)}
          >
            {aspectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="format-field__hint">Ajusta la relación para mantener proporciones consistentes.</p>
        </div>
        <div className="format-field">
          <div className="format-field__label">
            <span aria-hidden="true">🎨</span>
            <span>Paleta de color</span>
          </div>
          <label className="toggle toggle--disabled">
            <input type="checkbox" disabled />
            <span className="toggle__indicator" aria-hidden="true" />
            <span className="toggle__label">Próximamente</span>
          </label>
          <p className="format-field__hint">Centraliza colores aprobados para mantener consistencia.</p>
        </div>
      </section>

      <section className="format-section">
        <div className="format-section__header">
          <div className="format-section__title">
            <span className="format-section__eyebrow">Estilos base</span>
            <span
              className="format-section__tooltip"
              role="img"
              aria-label="Aplican al control seleccionado sin importar su tipo."
              title="Aplican al control seleccionado sin importar su tipo."
            >
              ℹ️
            </span>
          </div>
        </div>
        {!canEditControl && (
          <p className="format-section__empty">Selecciona una celda activa para editar sus estilos.</p>
        )}
        {canEditControl && (
          <div className="format-section__list">
            <div className="format-field">
              <div className="format-field__label">
                <span aria-hidden="true">🎨</span>
                <span>Color de fondo</span>
              </div>
              <div className="format-field__inline">
                <span
                  className="color-chip"
                  style={{ backgroundColor: normalizedBackgroundColor }}
                  aria-label={`Color actual ${backgroundColorLabel}`}
                />
                <span className="color-chip__value" aria-hidden="true">
                  {backgroundColorLabel}
                </span>
                <button type="button" onClick={handleBackgroundPickerOpen}>
                 Editar
                </button>
                <input
                  ref={backgroundColorInputRef}
                  className="format-field__sr"
                  type="color"
                  value={normalizedBackgroundColor}
                  onChange={handleBackgroundColorChange}
                  aria-label="Seleccionar color de fondo"
                />
              </div>
            </div>

            <div className="format-field">
              <div className="format-field__label">
                <span aria-hidden="true">🧭</span>
                <span>Alineación</span>
              </div>
              <button
                type="button"
                className="alignment-trigger"
                onClick={(event) => setAlignmentAnchor(event.currentTarget.getBoundingClientRect())}
                aria-haspopup="listbox"
                aria-expanded={Boolean(alignmentAnchor)}
              >
                <span aria-hidden="true">
                  {ALIGNMENT_OPTIONS.find((option) => option.value === current.textAlign)?.icon ?? '⭰'}
                </span>
                <span>
                  {ALIGNMENT_OPTIONS.find((option) => option.value === current.textAlign)?.label ?? 'Izquierda'}
                </span>
              </button>
            </div>

            <div className="format-field">
              <div className="format-field__label">
                <span aria-hidden="true">🧱</span>
                <span>Borde visible</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={current.border !== false}
                  onChange={(event) => patch({ border: event.target.checked })}
                />
                <span className="toggle__indicator" aria-hidden="true" />
                <span className="toggle__label">Activar</span>
              </label>
            </div>

            <div className="format-field">
              <div className="format-field__label">
                <span aria-hidden="true">🔠</span>
                <span>Tamaño de fuente</span>
              </div>
              <button type="button" className="value-chip" onClick={handleSliderOpen('fontSizePx')}>
                {`${fontPx}px`}
              </button>
            </div>

            <button
              type="button"
              className="format-section__advanced"
              onClick={toggleAdvanced}
              aria-haspopup="dialog"
              aria-expanded={Boolean(advancedAnchor)}
            >
              Avanzado
            </button>
          </div>
        )}
      </section>

      <section className="format-section">
        <div className="format-section__header">
          <div className="format-section__title">
            <span className="format-section__eyebrow">Formato condicional</span>
            <span
              className="format-section__tooltip"
              role="img"
              aria-label="Accede a ajustes específicos según el tipo de control."
              title="Accede a ajustes específicos según el tipo de control."
            >
              ℹ️
            </span>
          </div>
        </div>
        {!canEditControl && (
          <p className="format-section__empty">Selecciona una celda para mostrar sus opciones específicas.</p>
        )}
        {canEditControl && (
          <>
            {isCheckboxControl && (
              <div className="format-field">
                <div className="format-field__label">
                  <span aria-hidden="true">✅</span>
                  <span>Color al marcar</span>
                </div>
                <label className="toggle toggle--inline">
                  <input
                    type="checkbox"
                    checked={checkboxColorEnabled}
                    onChange={(event) => handleCheckboxColorToggle(event.target.checked)}
                  />
                  <span className="toggle__indicator" aria-hidden="true" />
                  <span className="toggle__label">Personalizar</span>
                </label>
                {checkboxColorEnabled && (
                  <div className="format-field__stack">
                    <button
                      type="button"
                      className="value-chip"
                      onClick={openColorPopover('checkbox-normal')}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      className="value-chip"
                      onClick={openColorPopover('checkbox-hover')}
                    >
                      Hover
                    </button>
                  </div>
                )}
              </div>
            )}

            {isTextControl && (
              <div className="format-field">
                <div className="format-field__label">
                  <span aria-hidden="true">🎯</span>
                  <span>Color según select</span>
                </div>
                {selectCells.length > 0 ? (
                  <>
                    <select
                      value={current.conditionalBg?.selectSource?.coord ?? ''}
                      onChange={(event) => handleSelectSourceChange(event.target.value)}
                    >
                      <option value="">Sin origen</option>
                      {selectCells.map((cell) => (
                        <option key={cell.coord} value={cell.coord}>
                          {cell.coord}
                        </option>
                      ))}
                    </select>
                    {current.conditionalBg?.selectSource && (
                      <div className="color-preview-grid">
                        {Object.entries(current.conditionalBg.selectSource.colors).map(
                          ([option, color]) => (
                            <div key={option} className="color-preview-grid__item">
                              <span style={{ backgroundColor: color }} aria-hidden="true" />
                              <span>{option}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="format-section__empty">
                    No hay campos select disponibles en este bloque.
                  </p>
                )}
              </div>
            )}

            {!isCustomizableControl && (
              <p className="format-section__empty">Este control no requiere opciones adicionales.</p>
            )}
          </>
        )}
      </section>

      {canEditControl && (
        <button className="reset-btn" onClick={resetStyle} type="button">
          ✨ Restablecer formato
        </button>
      )}

      {renderColorPopoverContent()}
      {renderAlignmentPopover()}
      {renderSliderPopover()}
      {renderAdvancedPopover()}
    </div>
  );
};