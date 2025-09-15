// src/state/ui-layout.ts
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JSX } from 'react';

interface UILayoutContextValue {
  showHeader: boolean;
  toggleHeader: () => void;
}

const UILayoutContext = createContext<UILayoutContextValue | undefined>(undefined);

export function UILayoutProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ui.showHeader');
      if (stored !== null) {
        setShowHeader(stored === 'true');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('ui.showHeader', String(showHeader));
    } catch {
      /* ignore */
    }
  }, [showHeader]);

  const toggleHeader = () => {
    setShowHeader((prev) => !prev);
  };

  return (
    <UILayoutContext.Provider value={{ showHeader, toggleHeader }}>
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