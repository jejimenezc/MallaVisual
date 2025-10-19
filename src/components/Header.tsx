import React from 'react';

interface HeaderProps {
  title?: string;
  className?: string;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  className = '',
  left,
  center,
  right,
  children,
}) => {
  const classes = ['header', className].filter(Boolean).join(' ');
  const centerContent = center ?? (title ? <h2 className="header-title">{title}</h2> : null);
  const rightContent = right ?? children;

  return (
    <div className={classes}>
      <div className="header-section header-left">{left}</div>
      <div className="header-section header-center">{centerContent}</div>
      <div className="header-section header-right header-actions">{rightContent}</div>
    </div>
  );
};