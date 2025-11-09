// src/components/CellContextMenu.tsx

import React from 'react';
import type { InputType } from '../types/curricular';
import '../styles/CellContextMenu.css';


export interface CellContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: InputType | undefined) => void;
  onClose: () => void;
}

export const CellContextMenu: React.FC<CellContextMenuProps> = ({ x, y, onSelect, onClose }) => {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState({ top: y, left: x });

  React.useEffect(() => {
    setPosition({ top: y, left: x });
  }, [x, y]);

  React.useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let nextLeft = x;
    let nextTop = y;

    if (nextLeft + rect.width > viewportWidth - margin) {
      nextLeft = Math.max(margin, viewportWidth - rect.width - margin);
    }

    if (nextTop + rect.height > viewportHeight - margin) {
      nextTop = Math.max(margin, y - rect.height);
    }

    if (nextLeft !== position.left || nextTop !== position.top) {
      setPosition({ top: nextTop, left: nextLeft });
    }
  }, [position.left, position.top, x, y]);

  const menuItems: Array<{
    type: InputType | undefined;
    label: string;
    title: string;
    icon: string;
    isDanger?: boolean;
  }> = [
    { type: 'staticText', label: 'Texto estático', title: 'Insertar texto estático', icon: '🔒' },
    { type: 'text', label: 'Texto libre', title: 'Insertar campo de texto', icon: '📝' },
    { type: 'checkbox', label: 'Checkbox', title: 'Insertar casilla de verificación', icon: '☑️' },
    { type: 'select', label: 'Lista desplegable', title: 'Insertar lista desplegable', icon: '🔽' },
    { type: 'number', label: 'Número', title: 'Insertar campo numérico', icon: '🔢' },
    { type: 'calculated', label: 'Campo calculado', title: 'Insertar campo calculado', icon: '🧮' },
    { type: undefined, label: 'Borrar campo', title: 'Borrar campo', icon: '🗑️', isDanger: true },
  ];

  const handleClick = (type: InputType | undefined) => {
    onSelect(type);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="cell-context-menu"
      style={{ top: position.top, left: position.left }}
      onMouseLeave={onClose}
    >
      {menuItems.map(({ type, label, title, icon, isDanger }) => (
        <div
          key={title}
          className={`cell-context-menu-item${isDanger ? ' cell-context-menu-item--danger' : ''}`}
          title={title}
          onClick={() => handleClick(type)}
        >
          <span className="icon" aria-hidden={true}>
            {icon}
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};