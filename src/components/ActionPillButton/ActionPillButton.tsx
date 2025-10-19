// src/components/ActionPillButton/ActionPillButton.tsx
import React from 'react';
import type { JSX } from 'react';
import styles from './ActionPillButton.module.css';

export type ActionPillButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ActionPillButton({
  type = 'button',
  className,
  children,
  ...props
}: ActionPillButtonProps): JSX.Element {
  const classes = [styles.button, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}