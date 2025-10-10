// src/components/AppHeader.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from '../App.module.css';

export function AppHeader(): JSX.Element {
  return (
    <header className={styles.appHeader}>
      <h1 className={styles.headerTitle}>Mallas Curriculares</h1>
    </header>
  );
}