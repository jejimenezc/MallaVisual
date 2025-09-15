// src/components/AppHeader.tsx
import React from 'react';
import type { JSX } from 'react';
import { useUILayout } from '../state/ui-layout.tsx';
import styles from '../App.module.css';

export function AppHeader(): JSX.Element {
  const { showHeader, toggleHeader } = useUILayout();
  return (
    <header className={styles.appHeader}>
      {showHeader && <h1 className={styles.headerTitle}>Mallas Curriculares</h1>}
      <button className={styles.headerToggle} onClick={toggleHeader}>
        {showHeader ? 'Compactar encabezado' : 'Expandir encabezado'}
      </button>
    </header>
  );
}