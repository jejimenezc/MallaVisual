// src/components/ColorPaletteModal/ColorPaletteModal.tsx

import React, { useEffect, useId, useMemo, useState } from 'react';
import type { ProjectTheme } from '../../utils/malla-io.ts';
import {
  buildPalettePreset,
  type PalettePresetId,
  type BuildPaletteOptions,
} from '../../utils/palette.ts';
import { paletteInternals } from '../../utils/palettePresets.ts';
import styles from './ColorPaletteModal.module.css';

const PRESET_OPTIONS: Array<{
  id: PalettePresetId;
  label: string;
  description: string;
}> = [
  {
    id: 'pastel-neutro',
    label: 'Pastel neutro',
    description: 'Clara y versátil para proyectos generales.',
  },
  {
    id: 'monocromatica-suave',
    label: 'Monocromática suave',
    description: 'Un solo matiz con variaciones controladas.',
  },
  {
    id: 'categorias-claras',
    label: 'Categorías claras',
    description: 'Opciones bien diferenciadas en la malla.',
  },
  {
    id: 'alta-distincion',
    label: 'Alta distinción',
    description: 'Contraste más alto para destacar categorías.',
  },
];

const MIN_OPTIONS = 3;
const MAX_OPTIONS = 8;
const DEFAULT_HUE = 210;

const clampHue = (value: number): number => {
  if (Number.isNaN(value)) return DEFAULT_HUE;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const clampOptionCount = (value: number): number => {
  if (Number.isNaN(value)) return MIN_OPTIONS;
  return Math.min(MAX_OPTIONS, Math.max(MIN_OPTIONS, Math.round(value)));
};

const extractOptionCount = (tokens: ProjectTheme['tokens'], fallback: number): number => {
  const candidate = Object.keys(tokens ?? {})
    .map((key) => {
      const match = key.match(/^--option-(\d+)$/);
      return match ? Number.parseInt(match[1], 10) : null;
    })
    .filter((value): value is number => value !== null);
  if (candidate.length === 0) return clampOptionCount(fallback);
  return clampOptionCount(Math.max(...candidate));
};

interface ColorPaletteModalProps {
  isOpen: boolean;
  currentTheme: ProjectTheme;
  onApply: (theme: ProjectTheme) => void;
  onClose: () => void;
}

export const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({
  isOpen,
  currentTheme,
  onApply,
  onClose,
}) => {
  const hueFieldId = useId();
  const optionsFieldId = useId();

  const [preset, setPreset] = useState<PalettePresetId>(
    currentTheme.paletteId ?? PRESET_OPTIONS[0].id,
  );
  const [seedHue, setSeedHue] = useState<number>(
    clampHue(typeof currentTheme.params?.seedHue === 'number' ? currentTheme.params.seedHue : DEFAULT_HUE),
  );
  const [optionCount, setOptionCount] = useState<number>(
    typeof currentTheme.params?.optionCount === 'number'
      ? clampOptionCount(currentTheme.params.optionCount)
      : extractOptionCount(currentTheme.tokens, 6),
  );

  useEffect(() => {
    if (!isOpen) return;
    setPreset(currentTheme.paletteId ?? PRESET_OPTIONS[0].id);
    setSeedHue(
      clampHue(
        typeof currentTheme.params?.seedHue === 'number'
          ? currentTheme.params.seedHue
          : DEFAULT_HUE,
      ),
    );
    setOptionCount(
      typeof currentTheme.params?.optionCount === 'number'
        ? clampOptionCount(currentTheme.params.optionCount)
        : extractOptionCount(currentTheme.tokens, 6),
    );
  }, [currentTheme, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const buildOptions: BuildPaletteOptions = useMemo(
    () => ({ optionCount, seedHue }),
    [optionCount, seedHue],
  );

  const tokens = useMemo(
    () => buildPalettePreset(preset, buildOptions),
    [preset, buildOptions],
  );

  const previewStyle = useMemo(() => {
    const entries = Object.entries(tokens);
    return entries.reduce<React.CSSProperties>((acc, [key, value]) => {
      acc[key as keyof React.CSSProperties] = value;
      return acc;
    }, {} as React.CSSProperties);
  }, [tokens]);

  const optionTokens = useMemo(() => {
    const list: Array<{ id: number; background: string; text: string }> = [];
    for (let index = 1; index <= optionCount; index += 1) {
      const background = tokens[`--option-${index}`];
      const text = tokens[`--option-${index}-text`];
      if (!background || !text) continue;
      list.push({ id: index, background, text });
    }
    return list;
  }, [optionCount, tokens]);

  const contrastChecks = useMemo(() => {
    const pairs: Array<{ id: string; label: string; background: string; text: string; minimum: number }> = [
      {
        id: 'cell-active',
        label: 'Celda activa',
        background: tokens['--cell-active'],
        text: tokens['--cell-active-text'],
        minimum: 4.5,
      },
      {
        id: 'checkbox-on',
        label: 'Checkbox activo',
        background: tokens['--checkbox-on'],
        text: tokens['--checkbox-on-text'],
        minimum: 4.5,
      },
      {
        id: 'border-muted',
        label: 'Contorno suave',
        background: tokens['--bg-base'],
        text: tokens['--border-muted'],
        minimum: 1.8,
      },
    ];
    optionTokens.forEach((option) => {
      pairs.push({
        id: `option-${option.id}`,
        label: `Opción ${option.id}`,
        background: option.background,
        text: option.text,
        minimum: 4.5,
      });
    });

    return pairs
      .filter((pair) => Boolean(pair.background) && Boolean(pair.text))
      .map((pair) => {
        const foreground = paletteInternals.hexToSrgb(pair.text);
        const background = paletteInternals.hexToSrgb(pair.background);
        const contrast = paletteInternals.contrastRatio(foreground, background);
        return { ...pair, contrast, ok: contrast >= pair.minimum };
      });
  }, [optionTokens, tokens]);

  const handlePresetClick = (id: PalettePresetId) => () => {
    setPreset(id);
  };

  const handleApply = () => {
    const normalizedHue = clampHue(seedHue);
    const normalizedOptions = clampOptionCount(optionCount);
    const nextTokens = buildPalettePreset(preset, {
      optionCount: normalizedOptions,
      seedHue: normalizedHue,
    });
    const nextParams = {
      ...(currentTheme.params ?? {}),
      seedHue: normalizedHue,
      optionCount: normalizedOptions,
    };
    const nextTheme: ProjectTheme = {
      paletteId: preset,
      params: nextParams,
      tokens: nextTokens,
    };
    onApply(nextTheme);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${hueFieldId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id={`${hueFieldId}-title`} className={styles.title}>
            Paleta del proyecto
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Selecciona un estilo base</h3>
            <div className={styles.presetGrid}>
              {PRESET_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.presetButton}
                  aria-pressed={preset === option.id}
                  onClick={handlePresetClick(option.id)}
                >
                  <span className={styles.presetName}>{option.label}</span>
                  <span className={styles.presetDescription}>{option.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Personaliza la paleta</h3>
            <div className={styles.controlRow}>
              <label htmlFor={hueFieldId}>Matiz base</label>
              <div className={styles.sliderRow}>
                <input
                  id={hueFieldId}
                  className={styles.range}
                  type="range"
                  min={0}
                  max={359}
                  value={seedHue}
                  onChange={(event) => setSeedHue(clampHue(Number(event.target.value)))}
                />
                <span className={styles.valueBadge}>{seedHue.toFixed(0)}°</span>
              </div>
              <p className={styles.helpText}>Ajusta el matiz principal para alinear la paleta con la identidad del proyecto.</p>
            </div>

            <div className={styles.controlRow}>
              <label htmlFor={optionsFieldId}>Cantidad de opciones</label>
              <div className={styles.sliderRow}>
                <input
                  id={optionsFieldId}
                  className={styles.range}
                  type="range"
                  min={MIN_OPTIONS}
                  max={MAX_OPTIONS}
                  value={optionCount}
                  onChange={(event) => setOptionCount(clampOptionCount(Number(event.target.value)))}
                />
                <span className={styles.valueBadge}>{optionCount}</span>
              </div>
              <p className={styles.helpText}>Controla cuántos colores de categoría se generan para condicionales y listados.</p>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Vista previa rápida</h3>
            <div className={styles.previewCard} style={previewStyle}>
              <div className={styles.previewGrid}>
                <div className={styles.previewCell}>
                  <span>Celda activa</span>
                  <span className={styles.checkboxBadge}>Label</span>
                </div>
                <div className={styles.previewCheckbox}>
                  <span className={styles.checkboxBadge}>✔</span>
                  <span>Checkbox activo</span>
                </div>
              </div>
              <div className={styles.optionsGrid}>
                <span className={styles.helpText}>Opciones condicionadas</span>
                <div className={styles.optionRow}>
                  {optionTokens.map((option) => (
                    <span
                      key={option.id}
                      className={styles.optionChip}
                      style={{ background: option.background, color: option.text }}
                    >
                      Opción {option.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Indicadores de contraste</h3>
            <p className={styles.helpText}>
              Validamos cada combinación según WCAG AA (4.5× para textos y 1.8× para bordes sutiles).
            </p>
            <ul className={styles.contrastList}>
              {contrastChecks.map((check) => (
                <li key={check.id} className={styles.contrastItem}>
                  <span
                    className={styles.contrastIcon}
                    aria-hidden="true"
                    title={check.ok ? 'Contraste adecuado' : 'Contraste bajo'}
                  >
                    {check.ok ? '✔' : '⚠'}
                  </span>
                  <span>{check.label}</span>
                  <span className={styles.contrastValue}>{check.contrast.toFixed(2)}×</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.ghostButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleApply}>
            Aplicar paleta
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ColorPaletteModal;