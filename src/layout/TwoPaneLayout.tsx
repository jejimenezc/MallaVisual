import React from 'react';
import './TwoPaneLayout.css';

interface TwoPaneLayoutProps {
  header?: React.ReactNode;     // Encabezado superior (botones, título…)
  left: React.ReactNode;        // Panel izquierdo (grilla)
  right?: React.ReactNode;      // Panel derecho (sidebar)
}

export const TwoPaneLayout: React.FC<TwoPaneLayoutProps> = ({ header, left, right }) => {
  return (
    <div className="screen">
      {header}
      <div className="two-pane">
        <div className="left-pane">{left}</div>
        {right && <div className="right-pane sidebar-panel">{right}</div>}
      </div>
    </div>
  );
};
