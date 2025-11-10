// src/components/CellContextMenu.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { InputType } from '../types/curricular';
import '../styles/CellContextMenu.css';

export interface CellContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: InputType | undefined) => void;
  onClose: () => void;
}

type MenuItem = {
  label: string;
  value: InputType | undefined;
  icon?: string; // puedes reemplazar por <Icon /> si usas un lib
  danger?: boolean;
};

const ITEMS: MenuItem[] = [
  { label: 'Texto estático', value: 'staticText', icon: '📄' },
  { label: 'Texto libre', value: 'text', icon: '✏️' },
  { label: '☑️ Checkbox', value: 'checkbox' },
  { label: 'Lista desplegable', value: 'select', icon: '▾' },
  { label: 'Número', value: 'number', icon: '#' },
  { label: 'Campo calculado', value: 'calculated', icon: '∑' },
  { label: 'Borrar campo', value: undefined, icon: '🗑️', danger: true },
];


export const CellContextMenu: React.FC<CellContextMenuProps> = ({
  x,
  y,
  onSelect,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  // Evita que el menú se salga del viewport
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { innerWidth, innerHeight } = window;
    const rect = el.getBoundingClientRect();
    let top = y;
    let left = x;

    if (left + rect.width > innerWidth) left = Math.max(8, innerWidth - rect.width - 8);
    if (top + rect.height > innerHeight) top = Math.max(8, innerHeight - rect.height - 8);
    setPos({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar con Escape y clic fuera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  // Foco inicial al primer ítem
  useEffect(() => {
    firstItemRef.current?.focus();
  }, []);

  const handleItem = (value: InputType | undefined) => {
    onSelect(value);
    onClose();
  };

  const onMenuKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // navegación simple con flechas
    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    const idx = buttons.findIndex((b) => b === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = buttons[(idx + 1) % buttons.length] ?? buttons[0];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = buttons[(idx - 1 + buttons.length) % buttons.length] ?? buttons[buttons.length - 1];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      buttons[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="cell-context-menu"
      role="menu"
      aria-label="Acciones de celda"
      style={{ top: pos.top, left: pos.left }}
      onKeyDown={onMenuKeyDown}
    >
      {ITEMS.map((item, i) => (
        <React.Fragment key={item.label}>
          {item.danger && <div className="cell-context-menu-separator" role="separator" />}
          <button
            ref={i === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            className={`cell-context-menu-item${item.danger ? ' danger' : ''}`}
            title={item.label}
            onClick={() => handleItem(item.value)}
          >
            {item.icon ? <span className="icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
