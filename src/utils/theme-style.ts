// src/utils/theme-style.ts

import type { ProjectThemeTokens } from './project-theme.ts';

const TOKEN_KEY_PATTERN = /^--[a-zA-Z0-9-_]+$/;

export const filterThemeTokenEntries = (
  tokens: ProjectThemeTokens | null | undefined,
): Array<[string, string]> => {
  if (!tokens) return [];
  return Object.entries(tokens).filter(([key, value]) => {
    if (!TOKEN_KEY_PATTERN.test(key)) return false;
    const trimmed = value?.trim();
    return Boolean(trimmed);
  }) as Array<[string, string]>;
};

export const buildThemeStyleObject = (
  tokens: ProjectThemeTokens | null | undefined,
): Record<string, string> => {
  const style: Record<string, string> = {};
  filterThemeTokenEntries(tokens).forEach(([key, value]) => {
    style[key] = value.trim();
  });
  return style;
};