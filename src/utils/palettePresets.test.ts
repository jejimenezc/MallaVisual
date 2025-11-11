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