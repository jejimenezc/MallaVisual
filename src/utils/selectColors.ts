import { generatePalette, type PaletteConfig } from './palette';

const normalizeColorKey = (color: string) => color.trim().toLowerCase();

export const assignSelectOptionColors = (
  options: string[],
  existingColors: Record<string, string> = {},
  paletteOptions?: PaletteConfig | null,
): Record<string, string> => {
  if (options.length === 0) return {};

  const palettePreset = paletteOptions?.presetId;
  const buildOptions =
    paletteOptions?.seedHue !== undefined ? { seedHue: paletteOptions.seedHue } : undefined;

  const generated = generatePalette(options.length, palettePreset, buildOptions);
  const available = generated.map((color) => ({
    raw: color,
    key: normalizeColorKey(color),
  }));

  const used = new Set<string>();
  const nextColors: Record<string, string> = {};

  options.forEach((option) => {
    const existing = existingColors[option];
    if (!existing) return;
    nextColors[option] = existing;
    used.add(normalizeColorKey(existing));
  });

  const takeFromPalette = (): string | undefined => {
    for (let index = 0; index < available.length; index += 1) {
      const candidate = available[index];
      if (used.has(candidate.key)) {
        continue;
      }
      available.splice(index, 1);
      return candidate.raw;
    }
    return undefined;
  };

  const fallbackColor = (): string => {
    let attempt = 0;
    while (attempt < 720) {
      const hue = Math.round(((used.size + attempt) * 137.508) % 360);
      const candidate = `hsl(${hue}, 70%, 60%)`;
      const key = normalizeColorKey(candidate);
      if (!used.has(key)) {
        return candidate;
      }
      attempt += 1;
    }
    return '#cccccc';
  };

  options.forEach((option) => {
    if (nextColors[option]) return;
    const fromPalette = takeFromPalette();
    const color = fromPalette ?? fallbackColor();
    nextColors[option] = color;
    used.add(normalizeColorKey(color));
  });

  return nextColors;
};

export default assignSelectOptionColors;