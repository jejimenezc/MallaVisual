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
import type { BlockTemplate, BlockTemplateCell, InputType } from '../types/curricular';
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

type FormatTabKey = 'checkbox' | 'text';

interface FormatTab {
  key: FormatTabKey;
  label: string;
  type: InputType;
}

const CONTROL_TABS: FormatTab[] = [
  { key: 'checkbox', label: 'Checkbox', type: 'checkbox' },
  { key: 'text', label: 'Texto libre', type: 'text' },
];

const useFormatTabs = (selectedType?: InputType) => {
  const initialTab: FormatTabKey = selectedType === 'checkbox' ? 'checkbox' : 'text';
  const [activeTab, setActiveTab] = useState<FormatTabKey>(initialTab);

  useEffect(() => {
    if (selectedType === 'checkbox') {
      setActiveTab('checkbox');
    } else if (selectedType === 'text') {
      setActiveTab('text');
    }
  }, [selectedType]);

  return { activeTab, setActiveTab };
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
  const [colorPopover, setColorPopover] = useState<{
    type: 'background' | 'checkbox-normal' | 'checkbox-hover';
    anchor: DOMRect | null;
  } | null>(null);
  const [alignmentAnchor, setAlignmentAnchor] = useState<DOMRect | null>(null);
  const [activeSlider, setActiveSlider] = useState<{
    key: SliderKey;
    anchor: DOMRect | null;
  } | null>(null);

  const k = selectedCoord ? coordKey(selectedCoord.row, selectedCoord.col) : undefined;

  const current: VisualStyle = useMemo(() => (k ? visualTemplate[k] ?? {} : {}), [k, visualTemplate]);

  const selectedCell = useMemo(() => {
    if (!selectedCoord) return undefined;
    return template[selectedCoord.row]?.[selectedCoord.col];
  }, [selectedCoord, template]);

  const { activeTab, setActiveTab } = useFormatTabs(selectedCell?.type);

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

  const openColorPopover = (type: 'background' | 'checkbox-normal' | 'checkbox-hover') => (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const anchor = event.currentTarget.getBoundingClientRect();
    setColorPopover({ type, anchor });
  };

  const closeColorPopover = () => setColorPopover(null);

  const backgroundColor = current.backgroundColor ?? '#ffffff';
  const checkedColor = current.conditionalBg?.checkedColor ?? '#2dd4bf';
  const hoverCheckedColor = current.conditionalBg?.hoverCheckedColor ?? '#14b8a6';
  const checkboxColorEnabled = Boolean(current.conditionalBg?.checkedColor);

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
    const isCheckbox =
      colorPopover.type === 'checkbox-normal' || colorPopover.type === 'checkbox-hover';

    const value =
      colorPopover.type === 'background'
        ? backgroundColor
        : colorPopover.type === 'checkbox-normal'
        ? checkedColor
        : hoverCheckedColor;

    const labelText = !isCheckbox
      ? 'Color de fondo'
      : colorPopover.type === 'checkbox-hover'
      ? 'Estado hover'
      : 'Estado normal';

    const handleChange = (nextColor: string) => {
      if (!k) return;
      if (colorPopover.type === 'background') {
        patch({ backgroundColor: nextColor });
      } else if (colorPopover.type === 'checkbox-normal') {
        updateConditionalBg((prev) => ({ ...prev, checkedColor: nextColor }));
      } else {
        updateConditionalBg((prev) => ({ ...prev, hoverCheckedColor: nextColor }));
      }
    };

    return (
      <Popover anchorRect={colorPopover.anchor} onClose={closeColorPopover} width={240}>
        <div className="color-popover" role="group">
          <div className="color-popover__preview" aria-hidden="true">
            <span style={{ backgroundColor: value }} />
            <code>{value}</code>
          </div>
          <label className="color-popover__field">
            <span>{labelText}</span>
            <input
              type="color"
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              aria-label={labelText}
            />
          </label>
          <label className="color-popover__field">
            <span>HEX</span>
            <input
              type="text"
              value={value}
              onChange={(event) => {
                const next = event.target.value.startsWith('#')
                  ? event.target.value
                  : `#${event.target.value}`;
                handleChange(next);
              }}
              pattern="#?[0-9a-fA-F]{3,8}"
            />
          </label>
          {isCheckbox && (
            <p className="color-popover__hint">
              Configura el color base y el estado hover para mantener contraste.
            </p>
          )}
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
    setActiveSlider({ key, anchor: event.currentTarget.getBoundingClientRect() });
  };

  const aspectOptions: { value: BlockAspect; label: string }[] = [
    { value: '1/1', label: '1:1' },
    { value: '1/2', label: '1:2 (vertical)' },
    { value: '2/1', label: '2:1 (apaisado)' },
  ];

  const canEditControl = Boolean(selectedCoord && isControlType(selectedCell));

  return (
    <div className="format-style-panel" ref={panelRef}>
      <header className="format-panel-header">
        <div className="format-panel-title">
          <span aria-hidden="true">🖌️</span>
          <h3>Formato de bloque</h3>
        </div>
        <button type="button" className="format-panel-info" aria-label="Guía rápida de estilos">
          ℹ️
        </button>
      </header>

      <section className="format-section">
        <div className="format-section__header">
          <span className="format-section__eyebrow">General</span>
          <p>Configura parámetros que afectan al bloque completo.</p>
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
      </section>

      <section className="format-section">
        <div className="format-section__header">
          <span className="format-section__eyebrow">Estilos base</span>
          <p>Aplican al control seleccionado sin importar su tipo.</p>
        </div>
        {!canEditControl && (
          <p className="format-section__empty">Selecciona una celda activa para editar sus estilos.</p>
        )}
        {canEditControl && (
          <div className="format-section-grid">
            <div className="format-field">
              <div className="format-field__label">
                <span aria-hidden="true">🎨</span>
                <span>Color de fondo</span>
              </div>
              <div className="format-field__inline">
                <span
                  className="color-chip"
                  style={{ backgroundColor: backgroundColor }}
                  aria-label={`Color actual ${backgroundColor}`}
                />
                <button type="button" onClick={openColorPopover('background')}>
                  Editar
                </button>
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
        )}
      </section>

      <section className="format-section">
        <div className="format-section__header">
          <span className="format-section__eyebrow">Personalización por control</span>
          <p>Accede a ajustes específicos según el tipo de control.</p>
        </div>
        {!canEditControl && (
          <p className="format-section__empty">Selecciona una celda para mostrar sus opciones específicas.</p>
        )}
        {canEditControl && (
          <div className="control-tabs">
            <div className="control-tabs__list" role="tablist">
              {CONTROL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  className={`control-tabs__tab${activeTab === tab.key ? ' is-active' : ''}`}
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="control-tabs__panel" role="tabpanel">
              {activeTab === 'checkbox' && selectedCell?.type === 'checkbox' && (
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

              {activeTab === 'checkbox' && selectedCell?.type !== 'checkbox' && (
                <p className="format-section__empty">Este control no requiere opciones adicionales.</p>
              )}

              {activeTab === 'text' && selectedCell?.type === 'text' && (
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

              {activeTab === 'text' && selectedCell?.type !== 'text' && (
                <p className="format-section__empty">Este control no requiere opciones adicionales.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="format-section">
        <div className="format-section__header">
          <span className="format-section__eyebrow">Herramientas complementarias</span>
          <p>Prepara funciones que acompañarán al formato del bloque.</p>
        </div>
        <div className="format-field">
          <div className="format-field__label">
            <span aria-hidden="true">🎨</span>
            <span>Paleta de color por proyecto</span>
          </div>
          <label className="toggle toggle--disabled">
            <input type="checkbox" disabled />
            <span className="toggle__indicator" aria-hidden="true" />
            <span className="toggle__label">Próximamente</span>
          </label>
          <p className="format-field__hint">
            Centraliza colores aprobados para mantener consistencia.
          </p>
        </div>
      </section>

      {canEditControl && (
        <button className="reset-btn" onClick={resetStyle} type="button">
          ✨ Restablecer formato
        </button>
      )}

      {renderColorPopoverContent()}
      {renderAlignmentPopover()}
      {renderSliderPopover()}
    </div>
  );
};