export type SequenceCounterStyle = 'arabic' | 'roman' | 'alpha-lower' | 'alpha-upper';

const toRoman = (value: number): string => {
  if (!Number.isInteger(value) || value <= 0) {
    return String(value);
  }

  const romanMap: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remainder = value;
  let result = '';
  for (const [arabic, roman] of romanMap) {
    while (remainder >= arabic) {
      result += roman;
      remainder -= arabic;
    }
  }
  return result;
};

const toAlpha = (value: number, uppercase: boolean): string => {
  if (!Number.isInteger(value) || value <= 0) {
    return String(value);
  }
  const base = uppercase ? 65 : 97;
  let remainder = value;
  let result = '';

  while (remainder > 0) {
    remainder -= 1;
    const digit = remainder % 26;
    result = String.fromCharCode(base + digit) + result;
    remainder = Math.floor(remainder / 26);
  }

  return result;
};

export const formatSequenceCounter = (value: number, style: SequenceCounterStyle): string => {
  if (style === 'roman') {
    return toRoman(value);
  }
  if (style === 'alpha-lower') {
    return toAlpha(value, false);
  }
  if (style === 'alpha-upper') {
    return toAlpha(value, true);
  }
  return String(value);
};

