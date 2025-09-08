import React from 'react';

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, children, className = '' }) => {
  const classes = ['header', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {title && <h2 className="header-title">{title}</h2>}
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
};