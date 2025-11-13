import {
  generateOptionPalette,
  type BuildPaletteOptions,
  type PalettePresetId,
} from './palettePresets';
import type { ProjectTheme } from './project-theme.ts';

export { buildPalettePreset } from './palettePresets';
export type { PalettePresetId, BuildPaletteOptions, PaletteTokens } from './palettePresets';

const DEFAULT_PRESET: PalettePresetId = 'categorias-claras';

export const PALETTE_PRESET_IDS: readonly PalettePresetId[] = [
  'pastel-neutro',
  'monocromatica-suave',
  'categorias-claras',
  'alta-distincion',
] as const;

export const resolvePalettePresetId = (
  candidate: string | null | undefined,
): PalettePresetId => {
  if (candidate && PALETTE_PRESET_IDS.includes(candidate as PalettePresetId)) {
    return candidate as PalettePresetId;
  }
  return DEFAULT_PRESET;
};

export const normalizePaletteHue = (value: unknown): number | undefined => {
  if (typeof value !== 'number') return undefined;
  if (Number.isNaN(value)) return undefined;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export interface PaletteConfig {
  presetId: PalettePresetId;
  seedHue?: number;
}

export const buildPaletteConfigFromTheme = (theme: ProjectTheme): PaletteConfig => {
  const presetId = resolvePalettePresetId(theme.paletteId);
  const seedHue = normalizePaletteHue(theme.params?.seedHue);
  return seedHue !== undefined ? { presetId, seedHue } : { presetId };
};

export const generatePalette = (
  count: number,
  preset: PalettePresetId = DEFAULT_PRESET,
  options: BuildPaletteOptions = {},
): string[] => generateOptionPalette(count, preset, options);

export default generatePalette;