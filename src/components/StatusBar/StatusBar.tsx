// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  children?: React.ReactNode;
}

export function StatusBar({ children }: StatusBarProps): JSX.Element {
  return <div className={styles.statusBar}>{children}</div>;
}

export interface StatusBarSlotProps {
  children?: React.ReactNode;
}

export function StatusBarProject({ children }: StatusBarSlotProps): JSX.Element {
  return <div className={styles.project}>{children}</div>;
}

export function StatusBarScreen({ children }: StatusBarSlotProps): JSX.Element {
  return <div className={styles.screen}>{children}</div>;
}

export function StatusBarIndicators({ children }: StatusBarSlotProps): JSX.Element {
  return <div className={styles.indicators}>{children}</div>;
}