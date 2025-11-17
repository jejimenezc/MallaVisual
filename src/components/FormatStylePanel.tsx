// src/components/FormatStylePanel.tsx

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { assignSelectOptionColors } from '../utils/selectColors';
import { collectSelectControls } from '../utils/selectControls';
import { useProjectTheme } from '../state/project-theme.tsx';
import {
  normalizePaletteHue,
  resolvePalettePresetId,
  type PaletteConfig,
} from '../utils/palette.ts';

type VisualUpdateMetadata = { historyBatchId?: string };
type UpdateVisualFn = (
  next: React.SetStateAction<VisualTemplate>,
  meta?: VisualUpdateMetadata,
) => void;

interface FormatStylePanelProps {
  selectedCoord?: { row: number; col: number };
  visualTemplate: VisualTemplate;
  onUpdateVisual: UpdateVisualFn;
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
  suffix: string;
};

const SLIDERS: Record<SliderKey, SliderConfig> = {
  fontSizePx: {
    key: 'fontSizePx',
    label: 'Tamaño de fuente',
    min: 10,
    max: 48,
    step: 1,
    suffix: 'px',
  },
  paddingX: {
    key: 'paddingX',
    label: 'Relleno horizontal',
    min: 0,
    max: 100,
    step: 1,
    suffix: 'px',
  },
  paddingY: {
    key: 'paddingY',
    label: 'Relleno vertical',
    min: 0,
    max: 100,
    step: 1,
    suffix: 'px',
  },
};

interface PaletteBaseRole {
  id: 'cell-active';
  label: string;
  background: string;
  text: string;
  normalizedBackground: string;
  normalizedText: string;
}

interface PaletteCheckboxRole {
  id: 'checkbox-on';
  label: string;
  background: string;
  text: string;
  normalizedBackground: string;
  normalizedText: string;
}

interface PaletteOptionRole {
  index: number;
  label: string;
  background: string;
  text: string;
  normalizedBackground: string;
  normalizedText: string;
}

type AlignmentValue = NonNullable<VisualStyle['textAlign']>;

const ALIGNMENT_OPTIONS: { value: AlignmentValue; icon: string; label: string }[] = [
  { value: 'left', icon: '⭰', label: 'Izquierda' },
  { value: 'center', icon: '⚀', label: 'Centro' },
  { value: 'right', icon: '⭲', label: 'Derecha' },
  { value: 'justify', icon: '☰', label: 'Justificado' },
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const areColorMapsEqual = (
  a: Record<string, string>,
  b: Record<string, string>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
};

const expandShortHex = (hex: string) =>
  `#${hex
    .slice(1)
    .split('')
    .map((char) => char + char)
    .join('')}`;

const tryNormalizeHex = (hex: string): string | null => {
  if (!hex) return null;
  const trimmed = hex.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return expandShortHex(prefixed).toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) {
    return prefixed.toLowerCase();
  }
  return null;
};

const rgbStringToHex = (value: string): string | null => {
  const match = value.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
  if (!match) return null;
  const [, r, g, b] = match;
  const toHex = (component: string) => {
    const intVal = Math.round(parseFloat(component));
    const clamped = Math.max(0, Math.min(255, intVal));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const getProcessEnv = () => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = (globalThis as typeof globalThis & {
    process?: { env?: { NODE_ENV?: string } };
  }).process;
  return candidate?.env;
};

const parseCssColorToHex = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  const ensureCtx = () => {
    if (typeof document === 'undefined') return null;
    if (!ctx) {
      const canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
    }
    return ctx;
  };
  return (value: string): string | null => {
    const context = ensureCtx();
    if (!context) return null;
    try {
      context.fillStyle = '#000000';
      context.fillStyle = value;
      const computed = context.fillStyle;
      if (typeof computed !== 'string' || computed.length === 0) return null;
      if (computed.startsWith('#')) {
        return tryNormalizeHex(computed);
      }
      const rgbHex = rgbStringToHex(computed);
      return rgbHex ? tryNormalizeHex(rgbHex) : null;
    } catch (error) {
      const env = getProcessEnv();
      if (env?.NODE_ENV !== 'production') {
        console.warn('No se pudo interpretar el color', value, error);
      }
      return null;
    }
  };
})();

const normalizeHex = (value: string) =>
  tryNormalizeHex(value) ?? parseCssColorToHex(value) ?? '#000000';

const sanitizeConditionalBg = (value?: ConditionalBg | null): ConditionalBg | undefined => {
  if (!value) return undefined;
  const next: ConditionalBg = {};
  if (value.selectSource) {
    const { controlName, coord, colors } = value.selectSource;
    if ((controlName || coord) && colors) {
      next.selectSource = {
        colors: { ...colors },
        ...(controlName ? { controlName } : {}),
        ...(coord ? { coord } : {}),
      };
    }
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
  placement?: 'bottom' | 'top';
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  anchorRect,
  onClose,
  width = 220,
  className,
  style,
  placement = 'bottom',
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

  const baseStyle: React.CSSProperties =
    placement === 'top'
      ? {
          top: anchorRect.top + window.scrollY - 8,
          left: anchorRect.left + window.scrollX,
          width,
          transform: 'translateY(-100%)',
        }
      : {
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
  const backgroundColorHexInputRef = useRef<HTMLInputElement | null>(null);
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const textColorHexInputRef = useRef<HTMLInputElement | null>(null);
  const checkboxColorInputRef = useRef<HTMLInputElement | null>(null);
  const checkboxColorHexInputRef = useRef<HTMLInputElement | null>(null);
  const [alignmentAnchor, setAlignmentAnchor] = useState<DOMRect | null>(null);
  const [advancedAnchor, setAdvancedAnchor] = useState<DOMRect | null>(null);
  const selectColorInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const { theme: projectTheme, isActive: themeActive } = useProjectTheme();
  const paletteAvailable = useMemo(() => {
    if (!themeActive) return false;
    return Object.keys(projectTheme.tokens ?? {}).length > 0;
  }, [projectTheme.tokens, themeActive]);

  const palettePresetId = useMemo(
    () => resolvePalettePresetId(projectTheme.paletteId),
    [projectTheme.paletteId],
  );

  const paletteSeedHue = useMemo(
    () => normalizePaletteHue(projectTheme.params?.seedHue),
    [projectTheme.params?.seedHue],
  );

  const paletteConfig = useMemo<PaletteConfig>(
    () =>
      paletteSeedHue !== undefined
        ? { presetId: palettePresetId, seedHue: paletteSeedHue }
        : { presetId: palettePresetId },
    [palettePresetId, paletteSeedHue],
  );

  const paletteRoles = useMemo<{
    base: PaletteBaseRole | null;
    checkbox: PaletteCheckboxRole | null;
    options: PaletteOptionRole[];
  }>(() => {
    const tokens = projectTheme.tokens ?? {};

    const baseRole: PaletteBaseRole | null = tokens['--cell-active'] && tokens['--cell-active-text']
      ? {
          id: 'cell-active',
          label: 'Celda activa',
          background: tokens['--cell-active'],
          text: tokens['--cell-active-text'],
          normalizedBackground: normalizeHex(tokens['--cell-active']),
          normalizedText: normalizeHex(tokens['--cell-active-text']),
        }
      : null;

    const checkboxRole: PaletteCheckboxRole | null = tokens['--checkbox-on'] && tokens['--checkbox-on-text']
      ? {
          id: 'checkbox-on',
          label: 'Checkbox activo',
          background: tokens['--checkbox-on'],
          text: tokens['--checkbox-on-text'],
          normalizedBackground: normalizeHex(tokens['--checkbox-on']),
          normalizedText: normalizeHex(tokens['--checkbox-on-text']),
        }
      : null;

    const optionRoles: PaletteOptionRole[] = [];

    Object.entries(tokens).forEach(([key, value]) => {
      const match = key.match(/^--option-(\d+)$/);
      if (!match) return;
      const index = Number(match[1]);
      if (Number.isNaN(index)) return;
      const background = value;
      const textKey = `--option-${index}-text`;
      const text = tokens[textKey];
      if (!background || !text) return;
      optionRoles.push({
        index,
        label: `Opción ${index}`,
        background,
        text,
        normalizedBackground: normalizeHex(background),
        normalizedText: normalizeHex(text),
      });
    });

    optionRoles.sort((a, b) => a.index - b.index);

    return {
      base: baseRole,
      checkbox: checkboxRole,
      options: optionRoles,
    };
  }, [projectTheme.tokens]);

  const k = selectedCoord ? coordKey(selectedCoord.row, selectedCoord.col) : undefined;

  const current: VisualStyle = useMemo(() => (k ? visualTemplate[k] ?? {} : {}), [k, visualTemplate]);
  const paintWithPalette = Boolean(current.paintWithPalette);

  const paletteOptionsForSelect = useMemo(
    () => (paletteAvailable && paintWithPalette ? paletteConfig : undefined),
    [paletteAvailable, paintWithPalette, paletteConfig],
  );

  const selectedCell = useMemo(() => {
    if (!selectedCoord) return undefined;
    return template[selectedCoord.row]?.[selectedCoord.col];
  }, [selectedCoord, template]);

  const colorBatchIdsRef = useRef<Map<string, string>>(new Map());

  const getColorBatchId = useCallback((key: string) => {
    const existing = colorBatchIdsRef.current.get(key);
    if (existing) return existing;
    const generated = `color-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    colorBatchIdsRef.current.set(key, generated);
    return generated;
  }, []);

  const releaseColorBatchId = useCallback((key: string) => {
    colorBatchIdsRef.current.delete(key);
  }, []);
  
  const patch = useCallback(
    (partial: Partial<VisualStyle>, meta?: VisualUpdateMetadata) => {
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
      onUpdateVisual(next, meta);
    },
    [current, k, onUpdateVisual, visualTemplate]
  );

  const updateConditionalBg = useCallback(
    (
      updater: (prev: ConditionalBg | undefined) => ConditionalBg | undefined,
      meta?: VisualUpdateMetadata,
    ) => {
      if (!k) return;
      const nextValue = sanitizeConditionalBg(updater(current.conditionalBg));
      const base: VisualStyle = { ...current };
      if (nextValue) {
        base.conditionalBg = nextValue;
      } else {
        delete base.conditionalBg;
      }
      onUpdateVisual({ ...visualTemplate, [k]: base }, meta);
    },
    [current, k, onUpdateVisual, visualTemplate]
  );

  useEffect(() => {
    if (!paletteAvailable && current.paintWithPalette) {
      patch({ paintWithPalette: false });
    }
  }, [paletteAvailable, current.paintWithPalette, patch]);

  const resetStyle = useCallback(() => {
    if (!k) return;
    const next = { ...visualTemplate };
    delete next[k];
    onUpdateVisual(next);
  }, [k, onUpdateVisual, visualTemplate]);

  const fontPx = current.fontSizePx ?? 14;
  const padX = current.paddingX ?? 8;
  const padY = current.paddingY ?? 6;

  const {
    list: selectControlsList,
    byName: selectControlsByName,
    byCoord: selectControlsByCoord,
  } = useMemo(() => {
    const list = collectSelectControls(template);
    const byName = new Map(list.map((control) => [control.name, control]));
    const byCoord = new Map(list.map((control) => [control.coord, control]));
    return { list, byName, byCoord };
  }, [template]);

  const selectedSelectSource = current.conditionalBg?.selectSource;
  const selectedControlName = useMemo(() => {
    if (!selectedSelectSource) return '';
    if (selectedSelectSource.controlName) return selectedSelectSource.controlName;
    if (selectedSelectSource.coord) {
      const control = selectControlsByCoord.get(selectedSelectSource.coord);
      return control?.name ?? '';
    }
    return '';
  }, [selectedSelectSource, selectControlsByCoord]);

  const conditionalSourceControl = useMemo(() => {
    if (!selectedSelectSource) return null;
    if (selectedSelectSource.controlName) {
      return selectControlsByName.get(selectedSelectSource.controlName) ?? null;
    }
    if (selectedSelectSource.coord) {
      return selectControlsByCoord.get(selectedSelectSource.coord) ?? null;
    }
    return null;
  }, [selectedSelectSource, selectControlsByCoord, selectControlsByName]);

  const conditionalOptionEntries = useMemo(() => {
    if (!selectedSelectSource) return [] as Array<{ option: string; color: string }>;
    const colors = selectedSelectSource.colors ?? {};
    const options = conditionalSourceControl?.options ?? [];
    if (!options || options.length === 0) {
      return Object.entries(colors).map(([option, color]) => ({ option, color }));
    }
    return options.map((option) => ({ option, color: colors[option] ?? '#ffffff' }));
  }, [selectedSelectSource, conditionalSourceControl]);

  useEffect(() => {
    if (!conditionalSourceControl) return;
    if (!paletteOptionsForSelect) return;
    const options = conditionalSourceControl.options ?? [];
    if (options.length === 0) return;
    const existingColors = current.conditionalBg?.selectSource?.colors ?? {};
    const nextColors = assignSelectOptionColors(options, {}, paletteOptionsForSelect);
    if (areColorMapsEqual(existingColors, nextColors)) {
      return;
    }
    updateConditionalBg((prev) => {
      if (!prev?.selectSource) return prev;
      return {
        ...prev,
        selectSource: {
          ...prev.selectSource,
          colors: nextColors,
        },
      };
    });
  }, [
    conditionalSourceControl,
    current.conditionalBg?.selectSource?.colors,
    paletteOptionsForSelect,
    updateConditionalBg,
  ]);

  const handleSelectSourceChange = (controlName: string) => {
    if (!k) return;
    if (!controlName) {
      updateConditionalBg((prev) => {
        if (!prev) return undefined;
        const next: ConditionalBg = { ...prev };
        delete next.selectSource;
        return next;
      });
      return;
    }
    const control = selectControlsByName.get(controlName);
    const existingColors = current.conditionalBg?.selectSource?.colors ?? {};
    const baseExistingColors = paletteOptionsForSelect ? {} : existingColors;
    const colors = assignSelectOptionColors(
      control?.options ?? [],
      baseExistingColors,
      paletteOptionsForSelect,
    );
    updateConditionalBg((prev) => ({
      ...prev,
      selectSource: {
        controlName,
        coord: control?.coord,
        colors,
      },
    }));
  };

  const applyPaletteBaseRole = useCallback(() => {
    if (!paletteRoles.base) return;
    patch({
      backgroundColor: paletteRoles.base.normalizedBackground,
      textColor: paletteRoles.base.normalizedText,
    });
  }, [paletteRoles.base, patch]);

  const applyCheckboxPaletteRole = useCallback(() => {
    if (!paletteRoles.checkbox) return;
    const role = paletteRoles.checkbox;
    updateConditionalBg((prev) => {
      const base: ConditionalBg = { ...(prev ?? {}) };
      base.checkedColor = role.normalizedBackground;
      return base;
    });
  }, [paletteRoles.checkbox, updateConditionalBg]);

  const handlePaletteToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    if (enabled && !paletteAvailable) return;
    patch({ paintWithPalette: enabled });
  };

  const rawTextColor = current.textColor ?? selectedCell?.style?.textColor ?? '#111827';
  const normalizedTextColor = normalizeHex(rawTextColor);
  const textColorLabel = normalizedTextColor.toUpperCase();
  const [textColorText, setTextColorText] = useState(textColorLabel);
  useEffect(() => {
    if (textColorHexInputRef.current === document.activeElement) return;
    setTextColorText(textColorLabel);
  }, [textColorLabel]);

  const backgroundColor = current.backgroundColor ?? '#ffffff';
  const normalizedBackgroundColor = normalizeHex(backgroundColor);
  const backgroundColorLabel = normalizedBackgroundColor.toUpperCase();
  const [backgroundColorText, setBackgroundColorText] = useState(backgroundColorLabel);
  useEffect(() => {
    if (backgroundColorHexInputRef.current === document.activeElement) return;
    setBackgroundColorText(backgroundColorLabel);
  }, [backgroundColorLabel]);
  const checkedColor = current.conditionalBg?.checkedColor ?? '#2dd4bf';
  const checkboxColorEnabled = Boolean(current.conditionalBg?.checkedColor);

  const handleBackgroundColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = getColorBatchId('background');
    patch({ backgroundColor: normalizeHex(event.target.value) }, { historyBatchId: id });
  };

  const handleBackgroundColorInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = getColorBatchId('background');
    patch({ backgroundColor: normalizeHex(event.target.value) }, { historyBatchId: id });
  };

  const handleBackgroundHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.trim();
    setBackgroundColorText(rawValue);
    const sanitized = rawValue.startsWith('#') ? rawValue.slice(1) : rawValue;
    if (/^[0-9a-fA-F]{6}$/.test(sanitized)) {
      patch({ backgroundColor: normalizeHex(rawValue) });
      return;
    }
    if (/^[0-9a-fA-F]{3}$/.test(sanitized) && sanitized.length === 3 && rawValue.length <= 4) {
      patch({ backgroundColor: normalizeHex(rawValue) });
    }
  };

  const handleBackgroundHexInputBlur = () => {
    setBackgroundColorText(backgroundColorLabel);
  };

  const handleBackgroundPickerOpen = () => {
    const input = backgroundColorInputRef.current;
    if (!input) return;
    input.click();
  };

  const handleBackgroundPickerClose = () => {
    releaseColorBatchId('background');
  };

  const handleTextColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = getColorBatchId('text');
    patch({ textColor: normalizeHex(event.target.value) }, { historyBatchId: id });
  };

  const handleTextColorInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = getColorBatchId('text');
    patch({ textColor: normalizeHex(event.target.value) }, { historyBatchId: id });
  };

  const handleTextHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.trim();
    setTextColorText(rawValue);
    const sanitized = rawValue.startsWith('#') ? rawValue.slice(1) : rawValue;
    if (/^[0-9a-fA-F]{6}$/.test(sanitized)) {
      patch({ textColor: normalizeHex(rawValue) });
      return;
    }
    if (/^[0-9a-fA-F]{3}$/.test(sanitized) && sanitized.length === 3 && rawValue.length <= 4) {
      patch({ textColor: normalizeHex(rawValue) });
    }
  };

  const handleTextHexInputBlur = () => {
    setTextColorText(textColorLabel);
  };

  const handleTextColorPickerOpen = () => {
    const input = textColorInputRef.current;
    if (!input) return;
    input.click();
  };

  const handleTextColorPickerClose = () => {
    releaseColorBatchId('text');
  };

  const handleCheckboxColorToggle = (checked: boolean) => {
    if (checked) {
      updateConditionalBg((prev) => ({
        ...prev,
        checkedColor: prev?.checkedColor ?? '#2dd4bf',
      }));
    } else {
      updateConditionalBg((prev) => {
        if (!prev) return undefined;
        const next: ConditionalBg = { ...prev };
        delete next.checkedColor;
        return next;
      });
    }
  };

  const normalizedCheckboxColor = normalizeHex(checkedColor);
  const checkboxColorLabel = normalizedCheckboxColor.toUpperCase();
  const [checkboxColorText, setCheckboxColorText] = useState(checkboxColorLabel);
  useEffect(() => {
    if (checkboxColorHexInputRef.current === document.activeElement) return;
    setCheckboxColorText(checkboxColorLabel);
  }, [checkboxColorLabel]);

  const handleCheckboxColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextColor = normalizeHex(event.target.value);
    const id = getColorBatchId('checkbox');
    updateConditionalBg((prev) => ({ ...prev, checkedColor: nextColor }), { historyBatchId: id });
  };

  const handleCheckboxColorInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextColor = normalizeHex(event.target.value);
    const id = getColorBatchId('checkbox');
    updateConditionalBg((prev) => ({ ...prev, checkedColor: nextColor }), { historyBatchId: id });
  };

  const handleCheckboxHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.trim();
    setCheckboxColorText(rawValue);
    const sanitized = rawValue.startsWith('#') ? rawValue.slice(1) : rawValue;
    if (/^[0-9a-fA-F]{6}$/.test(sanitized)) {
      updateConditionalBg((prev) => ({ ...prev, checkedColor: normalizeHex(rawValue) }));
      return;
    }
    if (/^[0-9a-fA-F]{3}$/.test(sanitized) && sanitized.length === 3 && rawValue.length <= 4) {
      updateConditionalBg((prev) => ({ ...prev, checkedColor: normalizeHex(rawValue) }));
    }
  };

  const handleCheckboxHexInputBlur = () => {
    setCheckboxColorText(checkboxColorLabel);
  };

  const handleCheckboxPickerOpen = () => {
    const input = checkboxColorInputRef.current;
    if (!input) return;
    input.click();
  };

  const handleCheckboxPickerClose = () => {
    releaseColorBatchId('checkbox');
  };

  useEffect(() => {
    if (!checkboxColorEnabled) {
      releaseColorBatchId('checkbox');
      return;
    }
    return () => {
      releaseColorBatchId('checkbox');
    };
  }, [checkboxColorEnabled, releaseColorBatchId]);

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

  const handleSliderChange = useCallback(
    (key: SliderKey, rawValue: number) => {
      const slider = SLIDERS[key];
      const next = clamp(rawValue, slider.min, slider.max);
      if (key === 'fontSizePx') {
        patch({ fontSizePx: next });
      } else if (key === 'paddingX') {
        patch({ paddingX: next });
      } else {
        patch({ paddingY: next });
      }
    },
    [patch]
  );

  const renderSliderChip = useCallback(
    (key: SliderKey, value: number) => {
      const slider = SLIDERS[key];
      return (
        <div className="slider-chip">
          <input
            className="slider-chip__range"
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={value}
            onChange={(event) => handleSliderChange(key, Number(event.target.value))}
            aria-label={slider.label}
            aria-valuetext={`${value}${slider.suffix}`}
          />
          <output className="slider-chip__value" aria-live="polite">
            {`${value}${slider.suffix}`}
          </output>
        </div>
      );
    },
    [handleSliderChange]
  );

  const toggleAdvanced = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAdvancedAnchor((prev) => (prev ? null : rect));
  };

  const closeAdvanced = () => setAdvancedAnchor(null);

  const renderAdvancedPopover = () => {
    if (!advancedAnchor) return null;
    return (
      <Popover anchorRect={advancedAnchor} onClose={closeAdvanced} width={260} placement="top">
        <div className="advanced-popover" role="group" aria-label="Opciones avanzadas de estilo">
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
              <span aria-hidden="true">↔️</span>
              <span>Relleno horizontal</span>
            </div>
            {renderSliderChip('paddingX', padX)}
          </div>
          <div className="format-field">
            <div className="format-field__label">
              <span aria-hidden="true">↕️</span>
              <span>Relleno vertical</span>
            </div>
            {renderSliderChip('paddingY', padY)}
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
  const [isGeneralCollapsed, setGeneralCollapsed] = useState(() =>
    Boolean(selectedCell)
  );
  const generalContentId = useId();
  const generalSectionLabelId = useId();

  useEffect(() => {
    if (selectedCell) {
      setGeneralCollapsed(true);
    } else {
      setGeneralCollapsed(false);
    }
  }, [selectedCell, selectedCoord?.row, selectedCoord?.col]);

  return (
    <div className="format-style-panel" ref={panelRef}>
      <header className="format-panel-header">
        <div className="format-panel-title">
          <span aria-hidden="true">🖌️</span>
          <h3>Formato de bloque</h3>
        </div>
      </header>

      <section className="format-section" aria-labelledby={generalSectionLabelId}>
        <header className="format-section__header">
          <button
            type="button"
            className="format-section__toggle"
            aria-expanded={!isGeneralCollapsed}
            aria-controls={generalContentId}
            onClick={() => setGeneralCollapsed((prev) => !prev)}
          >
            <div className="format-section__title" id={generalSectionLabelId}>
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
            <span className="format-section__chevron" aria-hidden="true">
              {isGeneralCollapsed ? '▸' : '▾'}
            </span>
          </button>
        </header>
        {!isGeneralCollapsed && (
          <div
            id={generalContentId}
            className="format-section__content"
            aria-hidden={isGeneralCollapsed}
          >
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
              <label className={`toggle${!paletteAvailable ? ' toggle--disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={paintWithPalette}
                  onChange={handlePaletteToggleChange}
                  disabled={!paletteAvailable}
                />
                <span className="toggle__indicator" aria-hidden="true" />
                <span className="toggle__label">{paintWithPalette ? 'Activo' : 'Inactivo'}</span>
              </label>
              <p className="format-field__hint">Centraliza colores aprobados para mantener consistencia.</p>
            </div>
          </div>
        )}
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
            {!paintWithPalette && (
              <>
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
                    <input
                      ref={backgroundColorHexInputRef}
                      className="color-chip__value-input"
                      type="text"
                      value={backgroundColorText}
                      onChange={handleBackgroundHexInputChange}
                      onBlur={handleBackgroundHexInputBlur}
                      maxLength={7}
                      spellCheck={false}
                      aria-label="Editar color de fondo en formato hexadecimal"
                    />
                    <button type="button" onClick={handleBackgroundPickerOpen}>
                      Editar
                    </button>
                    <input
                      ref={backgroundColorInputRef}
                      className="format-field__sr"
                      type="color"
                      value={normalizedBackgroundColor}
                      onInput={handleBackgroundColorInput}
                      onChange={handleBackgroundColorChange}
                      onBlur={handleBackgroundPickerClose}
                      aria-label="Seleccionar color de fondo"
                    />
                  </div>
                </div>

                <div className="format-field">
                  <div className="format-field__label">
                    <span aria-hidden="true">🅰️</span>
                    <span>Color de texto</span>
                  </div>
                  <div className="format-field__inline">
                    <span
                      className="color-chip"
                      style={{ backgroundColor: normalizedTextColor }}
                      aria-label={`Color actual ${textColorLabel}`}
                    />
                    <input
                      ref={textColorHexInputRef}
                      className="color-chip__value-input"
                      type="text"
                      value={textColorText}
                      onChange={handleTextHexInputChange}
                      onBlur={handleTextHexInputBlur}
                      maxLength={7}
                      spellCheck={false}
                      aria-label="Editar color de texto en formato hexadecimal"
                    />
                    <button type="button" onClick={handleTextColorPickerOpen}>
                      Editar
                    </button>
                    <input
                      ref={textColorInputRef}
                      className="format-field__sr"
                      type="color"
                      value={normalizedTextColor}
                      onInput={handleTextColorInput}
                      onChange={handleTextColorChange}
                      onBlur={handleTextColorPickerClose}
                      aria-label="Seleccionar color de texto"
                    />
                  </div>
                </div>
              </>
            )}

            {paintWithPalette && (
              <div className="format-field">
                <div className="format-field__label">
                  <span aria-hidden="true">🟩</span>
                  <span>Roles rápidos</span>
                </div>
                {paletteRoles.base ? (
                  <div className="palette-quick-picks" role="list">
                    <button
                      type="button"
                      className={`palette-quick-pick${
                        paletteRoles.base &&
                        normalizedBackgroundColor === paletteRoles.base.normalizedBackground &&
                        normalizedTextColor === paletteRoles.base.normalizedText
                          ? ' is-active'
                          : ''
                      }`}
                      onClick={applyPaletteBaseRole}
                    >
                      <span
                        className="palette-quick-pick__swatch"
                        style={{
                          backgroundColor: paletteRoles.base.background,
                          color: paletteRoles.base.text,
                        }}
                        aria-hidden="true"
                      >
                        Aa
                      </span>
                      <span className="palette-quick-pick__label">{paletteRoles.base.label}</span>
                    </button>
                  </div>
                ) : (
                  <p className="format-field__hint">La paleta del proyecto aún no define roles de celda.</p>
                )}
              </div>
            )}

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
                <span aria-hidden="true">🔠</span>
                <span>Tamaño de fuente</span>
              </div>
              {renderSliderChip('fontSizePx', fontPx)}
            </div>

            <button
              type="button"
              className="format-section__advanced"
              onClick={toggleAdvanced}
              aria-haspopup="dialog"
              aria-expanded={Boolean(advancedAnchor)}
            >
              Configuración avanzada...
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
                {paintWithPalette ? (
                  paletteRoles.checkbox ? (
                    <div className="palette-quick-picks" role="list">
                      <button
                        type="button"
                        className={`palette-quick-pick${
                          normalizedCheckboxColor === paletteRoles.checkbox.normalizedBackground
                            ? ' is-active'
                            : ''
                        }`}
                        onClick={applyCheckboxPaletteRole}
                      >
                        <span
                          className="palette-quick-pick__swatch"
                          style={{
                            backgroundColor: paletteRoles.checkbox.background,
                            color: paletteRoles.checkbox.text,
                          }}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span className="palette-quick-pick__label">{paletteRoles.checkbox.label}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="format-field__hint">La paleta no define un color para checkboxes.</p>
                  )
                ) : (
                  <>
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
                      <div className="format-field__inline">
                        <span
                          className="color-chip"
                          style={{ backgroundColor: normalizedCheckboxColor }}
                          aria-label={`Color actual ${checkboxColorLabel}`}
                        />
                        <input
                          ref={checkboxColorHexInputRef}
                          className="color-chip__value-input"
                          type="text"
                          value={checkboxColorText}
                          onChange={handleCheckboxHexInputChange}
                          onBlur={handleCheckboxHexInputBlur}
                          maxLength={7}
                          spellCheck={false}
                          aria-label="Editar color del checkbox en formato hexadecimal"
                        />
                        <button type="button" onClick={handleCheckboxPickerOpen}>
                          Editar
                        </button>
                        <input
                          ref={checkboxColorInputRef}
                          className="format-field__sr"
                          type="color"
                          value={normalizedCheckboxColor}
                          onInput={handleCheckboxColorInput}
                          onChange={handleCheckboxColorChange}
                          onBlur={handleCheckboxPickerClose}
                          aria-label="Seleccionar color del checkbox"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {isTextControl && (
              <div className="format-field">
                <div className="format-field__label">
                  <span aria-hidden="true">🎯</span>
                  <span>Color según select</span>
                </div>
                {selectControlsList.length > 0 ? (
                  <>
                    <select
                      value={selectedControlName}
                      onChange={(event) => handleSelectSourceChange(event.target.value)}
                    >
                      <option value="">Sin origen</option>
                      {selectControlsList.map((cell) => (
                        <option key={cell.coord} value={cell.name}>
                          {cell.name}
                        </option>
                      ))}
                    </select>
                    {current.conditionalBg?.selectSource && (
                      paintWithPalette ? (
                        conditionalOptionEntries.length > 0 ? (
                          <>
                            <p className="format-field__hint">
                              Los colores se asignan automáticamente según la paleta del proyecto.
                            </p>
                            <div className="select-color-grid select-color-grid--readonly" role="list">
                              {conditionalOptionEntries.map(({ option, color }) => {
                                const normalized = normalizeHex(color);
                                return (
                                  <div
                                    key={option}
                                    role="listitem"
                                    className="select-color-grid__item select-color-grid__item--static"
                                  >
                                    <span
                                      className="select-color-grid__swatch"
                                      style={{ backgroundColor: normalized }}
                                      aria-hidden="true"
                                    />
                                    <span className="select-color-grid__label">{option}</span>
                                    <span className="select-color-grid__value">{normalized.toUpperCase()}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="format-field__hint">
                            El select seleccionado no contiene opciones para colorear.
                          </p>
                        )
                      ) : (
                        <div className="select-color-grid" role="list">
                          {conditionalOptionEntries.map(({ option, color }) => {
                            const normalized = normalizeHex(color);
                            const handleButtonClick = () => {
                              const input = selectColorInputsRef.current[option];
                              input?.click();
                            };
                            const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                              if (!k) return;
                              const nextColor = normalizeHex(event.target.value);
                              updateConditionalBg((prev) => {
                                if (!prev?.selectSource) return prev;
                                const nextColors = {
                                  ...prev.selectSource.colors,
                                  [option]: nextColor,
                                };
                                return {
                                  ...prev,
                                  selectSource: {
                                    ...prev.selectSource,
                                    colors: nextColors,
                                  },
                                };
                              });
                            };
                            return (
                              <div key={option} role="listitem" style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  className="select-color-grid__item"
                                  onClick={handleButtonClick}
                                  aria-label={`Editar color para ${option}`}
                                >
                                  <span
                                    className="select-color-grid__swatch"
                                    style={{ backgroundColor: normalized }}
                                    aria-hidden="true"
                                  />
                                  <span className="select-color-grid__label">{option}</span>
                                  <span className="select-color-grid__value">{normalized.toUpperCase()}</span>
                                </button>
                                <input
                                  ref={(element) => {
                                    if (element) {
                                      selectColorInputsRef.current[option] = element;
                                    } else {
                                      delete selectColorInputsRef.current[option];
                                    }
                                  }}
                                  type="color"
                                  value={normalized}
                                  onChange={handleColorChange}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  style={{
                                    position: 'absolute',
                                    width: 1,
                                    height: 1,
                                    opacity: 0,
                                    pointerEvents: 'none',
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )
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

      {renderAlignmentPopover()}
      {renderAdvancedPopover()}
    </div>
  );
};