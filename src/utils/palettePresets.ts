const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export type PalettePresetId =
  | 'pastel-neutro'
  | 'monocromatica-suave'
  | 'categorias-claras'
  | 'alta-distincion';

export interface BuildPaletteOptions {
  optionCount?: number;
  seedHue?: number;
}

export type PaletteTokens = Record<string, string>;

interface OklchColor {
  l: number;
  c: number;
  h: number;
}

interface PaletteDefinition {
  baseHue: number;
  cellActive: OklchColor;
  checkboxOn: OklchColor;
  optionColors: OklchColor[];
}

const MIN_TEXT_CONTRAST = 4.5;
const MIN_BORDER_CONTRAST = 1.8;
const PRESET_MIN_DELTA: Record<PalettePresetId, number> = {
  'pastel-neutro': 0.07,
  'monocromatica-suave': 0.06,
  'categorias-claras': 0.08,
  'alta-distincion': 0.08,
};

const DARK_TEXT = '#111111';
const LIGHT_TEXT = '#ffffff';

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const oklchToSrgb = ({ l, c, h }: OklchColor): { r: number; g: number; b: number } => {
  const a = c * Math.cos(toRadians(h));
  const b = c * Math.sin(toRadians(h));

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ ** 3;
  const mCubed = m_ ** 3;
  const sCubed = s_ ** 3;

  const rLinear = +4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  const encode = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return {
    r: encode(rLinear),
    g: encode(gLinear),
    b: encode(bLinear),
  };
};

const srgbToHex = ({ r, g, b }: { r: number; g: number; b: number }): string => {
  const toChannel = (channel: number): string => {
    const value = Math.round(clamp(channel, 0, 1) * 255);
    return value.toString(16).padStart(2, '0');
  };

  return `#${toChannel(r)}${toChannel(g)}${toChannel(b)}`;
};

const hexToSrgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = hex.replace('#', '').trim();
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char.repeat(2)).join('')
    : normalized;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return { r, g, b };
};

const srgbToLuminance = ({ r, g, b }: { r: number; g: number; b: number }): number => {
  const decode = (value: number) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  const rl = decode(r);
  const gl = decode(g);
  const bl = decode(b);

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

const srgbToOklab = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const decode = (value: number) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  const rl = decode(r);
  const gl = decode(g);
  const bl = decode(b);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

const hexToOklch = (hex: string): OklchColor => {
  const rgb = hexToSrgb(hex);
  const lab = srgbToOklab(rgb);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return {
    l: lab.l,
    c,
    h: (h + 360) % 360,
  };
};

const contrastRatio = (foreground: { r: number; g: number; b: number }, background: { r: number; g: number; b: number }): number => {
  const lum1 = srgbToLuminance(foreground) + 0.05;
  const lum2 = srgbToLuminance(background) + 0.05;
  return lum1 > lum2 ? lum1 / lum2 : lum2 / lum1;
};

const oklchDeltaE = (a: OklchColor, b: OklchColor): number => {
  const a1 = a.c * Math.cos(toRadians(a.h));
  const b1 = a.c * Math.sin(toRadians(a.h));
  const a2 = b.c * Math.cos(toRadians(b.h));
  const b2 = b.c * Math.sin(toRadians(b.h));
  const dl = a.l - b.l;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dl * dl + da * da + db * db);
};

const mapToGamut = (color: OklchColor): { color: OklchColor; rgb: { r: number; g: number; b: number } } => {
  let candidate = { ...color };
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const rgb = oklchToSrgb(candidate);
    if (rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1) {
      return { color: candidate, rgb };
    }
    candidate = { ...candidate, c: Math.max(0, candidate.c * 0.9) };
  }
  const finalRgb = oklchToSrgb(candidate);
  return { color: candidate, rgb: {
    r: clamp(finalRgb.r, 0, 1),
    g: clamp(finalRgb.g, 0, 1),
    b: clamp(finalRgb.b, 0, 1),
  } };
};

const ensureAccessibleBackground = (base: OklchColor, preference: 'dark' | 'light' | 'auto') => {
  let candidate = { ...base };
  let mapped = mapToGamut(candidate);

  const darkRgb = hexToSrgb(DARK_TEXT);
  const lightRgb = hexToSrgb(LIGHT_TEXT);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const darkContrast = contrastRatio(mapped.rgb, darkRgb);
    const lightContrast = contrastRatio(mapped.rgb, lightRgb);

    const pickDark = preference === 'dark' || (preference === 'auto' && darkContrast >= lightContrast);
    const textColor = pickDark ? DARK_TEXT : LIGHT_TEXT;
    const contrast = pickDark ? darkContrast : lightContrast;

    if (contrast >= MIN_TEXT_CONTRAST) {
      return {
        background: srgbToHex(mapped.rgb),
        text: textColor,
        oklch: mapped.color,
      };
    }

    const direction = pickDark ? 1 : -1;
    candidate = { ...mapped.color, l: clamp(mapped.color.l + 0.01 * direction, 0.02, 0.98) };
    mapped = mapToGamut(candidate);
  }

  const fallbackContrastDark = contrastRatio(mapped.rgb, darkRgb);
  const fallbackContrastLight = contrastRatio(mapped.rgb, lightRgb);
  const useDark = preference === 'dark' || fallbackContrastDark >= fallbackContrastLight;

  return {
    background: srgbToHex(mapped.rgb),
    text: useDark ? DARK_TEXT : LIGHT_TEXT,
    oklch: mapped.color,
  };
};

const enforceMinimumDelta = (colors: OklchColor[], minimum: number): OklchColor[] => {
  if (colors.length < 2) {
    return colors;
  }

  const adjusted = colors.map((color) => ({ ...color }));

  for (let index = 1; index < adjusted.length; index += 1) {
    let attempts = 0;
    while (attempts < 24 && oklchDeltaE(adjusted[index - 1], adjusted[index]) < minimum) {
      adjusted[index].c = clamp(adjusted[index].c + 0.02, 0, 0.25);
      adjusted[index].l = clamp(adjusted[index].l - 0.012, 0.2, 0.98);
      adjusted[index].h = (adjusted[index].h + 10) % 360;
      attempts += 1;
    }
  }

  return adjusted;
};

const enforceTokenDelta = (
  tokens: ReturnType<typeof ensureAccessibleBackground>[],
  minimum: number,
  allowHueShift: boolean,
) => {
  if (tokens.length < 2) return tokens;
  const corrected = [...tokens];
  for (let index = 1; index < corrected.length; index += 1) {
    let attempts = 0;
    while (attempts < 24 && oklchDeltaE(corrected[index - 1].oklch, corrected[index].oklch) < minimum) {
      const nextBase: OklchColor = {
        ...corrected[index].oklch,
        c: clamp(corrected[index].oklch.c + 0.02, 0, 0.3),
        l: clamp(corrected[index].oklch.l - 0.02, 0.2, 0.98),
        h: allowHueShift ? (corrected[index].oklch.h + 12) % 360 : corrected[index].oklch.h,
      };
      corrected[index] = ensureAccessibleBackground(nextBase, 'dark');
      attempts += 1;
    }
    if (oklchDeltaE(corrected[index - 1].oklch, corrected[index].oklch) < minimum) {
      const pivot = corrected[index - 1].oklch;
      const fallbackBase: OklchColor = {
        l: clamp(pivot.l - 0.1, 0.2, 0.98),
        c: clamp(pivot.c + 0.1, 0, 0.35),
        h: allowHueShift ? (pivot.h + 72) % 360 : pivot.h,
      };
      corrected[index] = ensureAccessibleBackground(fallbackBase, 'auto');
    }
  }
  return corrected;
};

const buildPastelNeutro = (optionCount: number, seedHue: number): PaletteDefinition => {
  const hues = Array.from({ length: optionCount }, (_, index) => (seedHue + index * (360 / Math.max(optionCount, 4))) % 360);

  return {
    baseHue: seedHue,
    cellActive: { l: 0.95, c: 0.045, h: seedHue },
    checkboxOn: { l: 0.75, c: 0.14, h: seedHue },
    optionColors: hues.map((hue) => ({ l: 0.91, c: 0.09, h: hue })),
  };
};

const buildMonocromatica = (optionCount: number, seedHue: number): PaletteDefinition => {
  const step = optionCount <= 1 ? 0 : 0.12 / (optionCount - 1);
  return {
    baseHue: seedHue,
    cellActive: { l: 0.955, c: 0.035, h: seedHue },
    checkboxOn: { l: 0.72, c: 0.11, h: seedHue },
    optionColors: Array.from({ length: optionCount }, (_, index) => ({
      l: 0.82 - index * 0.05,
      c: 0.12 + index * step,
      h: seedHue,
    })),
  };
};

const buildCategoriasClaras = (optionCount: number, seedHue: number): PaletteDefinition => {
  const spacing = 360 / Math.max(optionCount, 6);
  return {
    baseHue: seedHue,
    cellActive: { l: 0.952, c: 0.05, h: seedHue },
    checkboxOn: { l: 0.74, c: 0.15, h: (seedHue + 30) % 360 },
    optionColors: Array.from({ length: optionCount }, (_, index) => ({
      l: 0.9,
      c: 0.11,
      h: (seedHue + index * spacing) % 360,
    })),
  };
};

const buildAltaDistincion = (optionCount: number, seedHue: number): PaletteDefinition => {
  const spacing = 360 / Math.max(optionCount, 6);
  return {
    baseHue: seedHue,
    cellActive: { l: 0.948, c: 0.055, h: seedHue },
    checkboxOn: { l: 0.7, c: 0.17, h: (seedHue + 12) % 360 },
    optionColors: Array.from({ length: optionCount }, (_, index) => ({
      l: 0.88,
      c: 0.12,
      h: (seedHue + index * spacing) % 360,
    })),
  };
};

const buildDefinition = (preset: PalettePresetId, optionCount: number, seedHue: number): PaletteDefinition => {
  switch (preset) {
    case 'pastel-neutro':
      return buildPastelNeutro(optionCount, seedHue);
    case 'monocromatica-suave':
      return buildMonocromatica(optionCount, seedHue);
    case 'alta-distincion':
      return buildAltaDistincion(optionCount, seedHue);
    case 'categorias-claras':
    default:
      return buildCategoriasClaras(optionCount, seedHue);
  }
};

export const buildPalettePreset = (
  preset: PalettePresetId,
  { optionCount = 6, seedHue }: BuildPaletteOptions = {},
): PaletteTokens => {
  const normalizedCount = Math.max(0, Math.floor(optionCount));
  const normalizedHue = seedHue !== undefined ? ((seedHue % 360) + 360) % 360 : 210;

  const definition = buildDefinition(preset, normalizedCount, normalizedHue);
  const minDelta = PRESET_MIN_DELTA[preset];

  const bgBase = '#ffffff';
  const borderBase = ensureAccessibleBackground({ l: 0.86, c: 0.01, h: definition.baseHue }, 'dark');

  const adjustedOptions = enforceMinimumDelta(definition.optionColors, minDelta);

  const cellActive = ensureAccessibleBackground(definition.cellActive, 'dark');
  const checkboxOn = ensureAccessibleBackground(definition.checkboxOn, 'auto');
  const optionTokens = enforceTokenDelta(
    adjustedOptions.map((color) => ensureAccessibleBackground(color, 'auto')),
    minDelta,
    preset !== 'monocromatica-suave',
  );

  const tokens: PaletteTokens = {
    '--bg-base': bgBase,
    '--text-default': DARK_TEXT,
    '--border-muted': borderBase.background,
    '--cell-active': cellActive.background,
    '--cell-active-text': cellActive.text,
    '--checkbox-on': checkboxOn.background,
    '--checkbox-on-text': checkboxOn.text,
  };

  const bgRgb = hexToSrgb(bgBase);
  const borderRgb = hexToSrgb(tokens['--border-muted']);
  if (contrastRatio(bgRgb, borderRgb) < MIN_BORDER_CONTRAST) {
    const borderDarker = ensureAccessibleBackground({ ...definition.cellActive, l: 0.85, c: 0.02, h: definition.baseHue }, 'dark');
    tokens['--border-muted'] = borderDarker.background;
  }

  optionTokens.forEach((token, index) => {
    tokens[`--option-${index + 1}`] = token.background;
    tokens[`--option-${index + 1}-text`] = token.text;
  });

  return tokens;
};

export const generateOptionPalette = (
  count: number,
  preset: PalettePresetId = 'categorias-claras',
  options: BuildPaletteOptions = {},
): string[] => {
  const tokens = buildPalettePreset(preset, { ...options, optionCount: count });
  const values: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    const key = `--option-${index}`;
    const token = tokens[key];
    if (token) {
      values.push(token);
    }
  }
  return values;
};

export const paletteInternals = {
  contrastRatio,
  hexToSrgb,
  oklchDeltaE,
  hexToOklch,
  PRESET_MIN_DELTA,
};

export default buildPalettePreset;