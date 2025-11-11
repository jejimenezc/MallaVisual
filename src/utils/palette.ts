import {
  buildPalettePreset,
  generateOptionPalette,
  type BuildPaletteOptions,
  type PalettePresetId,
  type PaletteTokens,
} from './palettePresets';

export { buildPalettePreset } from './palettePresets';
export type { PalettePresetId, BuildPaletteOptions, PaletteTokens } from './palettePresets';

const DEFAULT_PRESET: PalettePresetId = 'categorias-claras';

export const generatePalette = (
  count: number,
  preset: PalettePresetId = DEFAULT_PRESET,
  options: BuildPaletteOptions = {},
): string[] => generateOptionPalette(count, preset, options);

export default generatePalette;