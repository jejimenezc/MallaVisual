// src/components/AppHeader.tsx
import React from 'react';
import type { JSX } from 'react';
import logoMallaVisual from '../assets/icons/logoMallaVisual.png';
import styles from '../App.module.css';

export function AppHeader(): JSX.Element {
  return (
    <header className={styles.appHeader}>
      <div className={styles.brandIdentity}>
        <img
          alt="MallaVisual logo"
          className={styles.brandLogo}
          src={logoMallaVisual}
        />
        <div className={styles.brandContent}>
          <span className={styles.brandName}>
            <span className={styles.brandMalla}>Malla</span>
            <span className={styles.brandVisual}>Visual</span>
          </span>
          <p className={styles.brandTagline}>
            The Simple Visual Grid for Curriculum Design — a <em>Proxytype</em>{' '}
            product
          </p>
        </div>
      </div>
    </header>
  );
}