import { describe, expect, it } from 'vitest';

import {
  buildPalettePreset,
  generateOptionPalette,
  paletteInternals,
  type PalettePresetId,
} from './palettePresets';

const PRESETS: PalettePresetId[] = [
  'pastel-neutro',
  'monocromatica-suave',
  'categorias-claras',
  'alta-distincion',
];

const getOptionTokens = (tokens: Record<string, string>) => {
  const optionEntries = Object.entries(tokens)
    .filter(([key]) => /^--option-\d+$/.test(key))
    .sort(([a], [b]) => parseInt(a.replace('--option-', ''), 10) - parseInt(b.replace('--option-', ''), 10));
  return optionEntries.map(([, value]) => value);
};

const textForOption = (tokens: Record<string, string>, index: number) =>
  tokens[`--option-${index + 1}-text`];

const getRgb = (hex: string) => paletteInternals.hexToSrgb(hex);

describe('buildPalettePreset', () => {
  PRESETS.forEach((preset) => {
    it(`generates accessible tokens for ${preset}`, () => {
      const tokens = buildPalettePreset(preset, { optionCount: 6 });

      expect(tokens['--cell-active']).toBeDefined();
      expect(tokens['--cell-active-text']).toBeDefined();
      expect(tokens['--checkbox-on']).toBeDefined();
      expect(tokens['--checkbox-on-text']).toBeDefined();

      const cellContrast = paletteInternals.contrastRatio(
        getRgb(tokens['--cell-active']),
        getRgb(tokens['--cell-active-text']),
      );
      const checkboxContrast = paletteInternals.contrastRatio(
        getRgb(tokens['--checkbox-on']),
        getRgb(tokens['--checkbox-on-text']),
      );

      expect(cellContrast).toBeGreaterThanOrEqual(4.5);
      expect(checkboxContrast).toBeGreaterThanOrEqual(4.5);

      const options = getOptionTokens(tokens);
      const minDelta = paletteInternals.PRESET_MIN_DELTA[preset];
      expect(options.length).toBe(6);
     options.forEach((value, index) => {
        const textColor = textForOption(tokens, index);
        expect(textColor).toBeTruthy();
        const contrast = paletteInternals.contrastRatio(getRgb(value), getRgb(textColor!));
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });

      for (let idx = 1; idx < options.length; idx += 1) {
        const previous = paletteInternals.hexToOklch(options[idx - 1]);
        const current = paletteInternals.hexToOklch(options[idx]);
        const delta = paletteInternals.oklchDeltaE(previous, current);
        expect(delta).toBeGreaterThanOrEqual(minDelta);
      }
    });
  });
});

describe('generateOptionPalette', () => {
  it('produces the requested number of colors with defaults', () => {
    const palette = generateOptionPalette(4);
    expect(palette).toHaveLength(4);
    const unique = new Set(palette);
    expect(unique.size).toBeGreaterThan(2);
  });

  it('handles edge cases for option count', () => {
    expect(generateOptionPalette(0)).toEqual([]);
    expect(generateOptionPalette(-2)).toEqual([]);
  });
});

describe('synthetic grid contrast scenarios', () => {
  it('maintains contrast and differentiation across palette roles', () => {
    const tokens = buildPalettePreset('alta-distincion', { optionCount: 5, seedHue: 32 });

    const rolePairs = [
      { background: tokens['--cell-active'], text: tokens['--cell-active-text'], minimum: 4.5 },
      { background: tokens['--checkbox-on'], text: tokens['--checkbox-on-text'], minimum: 4.5 },
    ];

    const optionBackgrounds: string[] = [];
    for (let index = 1; index <= 5; index += 1) {
      const background = tokens[`--option-${index}`];
      const text = tokens[`--option-${index}-text`];
      expect(background).toBeDefined();
      expect(text).toBeDefined();
      rolePairs.push({ background, text, minimum: 4.5 });
      optionBackgrounds.push(background);
    }

    rolePairs.forEach(({ background, text, minimum }) => {
      const contrast = paletteInternals.contrastRatio(getRgb(background), getRgb(text));
      expect(contrast).toBeGreaterThanOrEqual(minimum);
    });

    const uniqueBackgrounds = new Set(optionBackgrounds);
    expect(uniqueBackgrounds.size).toBe(optionBackgrounds.length);

    optionBackgrounds.forEach((value, index) => {
      for (let next = index + 1; next < optionBackgrounds.length; next += 1) {
        const delta = paletteInternals.oklchDeltaE(
          paletteInternals.hexToOklch(value),
          paletteInternals.hexToOklch(optionBackgrounds[next]),
        );
        expect(delta).toBeGreaterThanOrEqual(paletteInternals.PRESET_MIN_DELTA['alta-distincion']);
      }
    });
  });
});