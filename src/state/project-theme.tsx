// src/state/project-theme.tsx

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import {
  createDefaultProjectTheme,
  type ProjectTheme,
} from '../utils/malla-io.ts';
import { filterThemeTokenEntries } from '../utils/theme-style.ts';

interface ProjectThemeContextValue {
  theme: ProjectTheme;
  isActive: boolean;
}

const defaultValue: ProjectThemeContextValue = {
  theme: createDefaultProjectTheme(),
  isActive: false,
};

const ProjectThemeContext = createContext<ProjectThemeContextValue>(defaultValue);

const STYLE_SELECTOR = 'style[data-project-theme]';

const toCssText = (entries: Array<[string, string]>) => {
  if (entries.length === 0) return '';
  const lines = entries.map(([key, value]) => `  ${key}: ${value.trim()};`);
  return `[data-theme="project"] {\n${lines.join('\n')}\n}`;
};

const ensureRootElement = () => {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root') ?? document.body ?? null;
};

const ensureStyleElement = () => {
  if (typeof document === 'undefined') return null;
  let style = document.head.querySelector<HTMLStyleElement>(STYLE_SELECTOR);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-project-theme', 'true');
    document.head.appendChild(style);
  }
  return style;
};

const removeStyleElement = () => {
  if (typeof document === 'undefined') return;
  const existing = document.head.querySelector<HTMLStyleElement>(STYLE_SELECTOR);
  existing?.remove();
};

interface ProviderProps {
  theme: ProjectTheme;
  active: boolean;
  children: React.ReactNode;
}

export const ProjectThemeProvider: React.FC<ProviderProps> = ({
  theme,
  active,
  children,
}) => {
  const normalized = useMemo(() => theme ?? createDefaultProjectTheme(), [theme]);
  const value = useMemo(
    () => ({
      theme: normalized,
      isActive: active,
    }),
    [normalized, active],
  );

  useEffect(() => {
    const root = ensureRootElement();
    if (!root) return undefined;

    if (!active) {
      root.removeAttribute('data-theme');
      removeStyleElement();
      return undefined;
    }

    root.setAttribute('data-theme', 'project');
    const entries = filterThemeTokenEntries(normalized.tokens);
    if (entries.length === 0) {
      removeStyleElement();
      return undefined;
    }

    const style = ensureStyleElement();
    if (style) {
      style.textContent = toCssText(entries);
    }

    return () => {
      root.removeAttribute('data-theme');
      removeStyleElement();
    };
  }, [normalized, active]);

  return <ProjectThemeContext.Provider value={value}>{children}</ProjectThemeContext.Provider>;
};

export const useProjectTheme = () => useContext(ProjectThemeContext);
