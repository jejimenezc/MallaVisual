// src/state/ui-layout.ts
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JSX } from 'react';

interface UILayoutContextValue {
  showHeader: boolean;
  toggleHeader: () => void;
  showChrome: boolean;
  toggleChrome: () => void;
}

const UILayoutContext = createContext<UILayoutContextValue | undefined>(undefined);

export function UILayoutProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [showChrome, setShowChrome] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ui.showHeader');
      if (stored !== null) {
        setShowChrome(stored === 'true');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('ui.showHeader', String(showChrome));
    } catch {
      /* ignore */
    }
  }, [showChrome]);

  const toggleHeader = () => {
    setShowChrome((prev) => !prev);
  };

  const toggleChrome = () => {
    setShowChrome((prev) => !prev);
  };

  const showHeader = showChrome;

  return (
    <UILayoutContext.Provider
      value={{ showHeader, toggleHeader, showChrome, toggleChrome }}
    >
      {children}
    </UILayoutContext.Provider>
  );
}

export function useUILayout(): UILayoutContextValue {
  const context = useContext(UILayoutContext);
  if (!context) {
    throw new Error('useUILayout must be used within a UILayoutProvider');
  }
  return context;
}