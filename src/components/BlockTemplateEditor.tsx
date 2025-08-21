// src/components/BlockTemplateEditor.tsx

import { useState, useEffect, useRef } from 'react';
import { BlockTemplate, BlockTemplateCell } from '../types/curricular';
import { CellContextMenu } from './CellContextMenu';
import { TemplateGrid } from './TemplateGrid';
import './BlockTemplateEditor.css';
import type { EditorSidebarState } from '../types/panel';

interface Props {
  template: BlockTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<BlockTemplate>>;
  /** Publica al padre el estado necesario para el ContextSidebarPanel */
  onSidebarStateChange?: (state: EditorSidebarState) => void;
}

export const BlockTemplateEditor: React.FC<Props> = ({
  template,
  setTemplate,
  onSidebarStateChange,
}) => {
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);

  // ↪️ Durante "borrar tipo" debemos ignorar escrituras de forms (p.ej. cleanup de SelectConfigForm)
  const ignoreUpdatesRef = useRef<Set<string>>(new Set());
  const coordKey = (row: number, col: number) => `${row}-${col}`;

  // Selección por arrastre (independiente de active)
  const rectFrom = (a: { row: number; col: number }, b: { row: number; col: number }) => {
    const minRow = Math.min(a.row, b.row);
    const maxRow = Math.max(a.row, b.row);
    const minCol = Math.min(a.col, b.col);
    const maxCol = Math.max(a.col, b.col);
    const out: { row: number; col: number }[] = [];
    for (let r = minRow; r <= maxRow; r++) for (let c = minCol; c <= maxCol; c++) out.push({ row: r, col: c });
    return out;
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    const cell = { row, col };
    setStartCell(cell);
    setSelectedCells([cell]);
    setContextMenu(null);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !startCell) return;
    setSelectedCells(rectFrom(startCell, { row, col }));
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setStartCell(null);
  };

  // Combinar (reglas que ya venimos usando)
  const onCombine = () => {
    if (selectedCells.length < 2) return;

    // Máximo 1 celda configurada (type definido)
    const configuredCount = selectedCells.reduce((acc, { row, col }) => acc + (template[row][col].type ? 1 : 0), 0);
    if (configuredCount > 1) {
      window.alert('No se puede combinar: la selección contiene 2 o más celdas ya configuradas.');
      return;
    }

    // base: esquina superior izquierda
    const base = selectedCells.reduce((acc, cur) => {
      if (cur.row < acc.row) return cur;
      if (cur.row === acc.row && cur.col < acc.col) return cur;
      return acc;
    }, selectedCells[0]);

    setTemplate((prev) => {
      const next = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
      const baseK = coordKey(base.row, base.col);

      // Activar todo el grupo (visibilidad en Vista)
      selectedCells.forEach(({ row, col }) => {
        next[row][col] = { ...next[row][col], active: true };
      });

      // Marcar mergedWith para miembros
      selectedCells.forEach(({ row, col }) => {
        if (row === base.row && col === base.col) {
          delete (next[row][col] as BlockTemplateCell).mergedWith;
        } else {
          (next[row][col] as BlockTemplateCell).mergedWith = baseK;
        }
      });

      return next;
    });
  };

  const onSeparate = () => {
    if (selectedCells.length === 0) return;
    const selectedSet = new Set(selectedCells.map(({ row, col }) => coordKey(row, col)));

    setTemplate((prev) => {
      const next = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;

      // Quitar mergedWith de seleccionadas
      selectedCells.forEach(({ row, col }) => {
        delete (next[row][col] as BlockTemplateCell).mergedWith;
      });

      // Quitar mergedWith de celdas que apunten a una base seleccionada
      next.forEach((r, rIdx) =>
        r.forEach((c, cIdx) => {
          const mw = (c as BlockTemplateCell).mergedWith;
          if (mw && selectedSet.has(mw)) {
            delete (next[rIdx][cIdx] as BlockTemplateCell).mergedWith;
          }
        })
      );

      return next;
    });
  };

  // ✅ onUpdateCell con “ignorar durante borrar”
  const onUpdateCell = (partialUpdate: Partial<BlockTemplateCell>, coord: { row: number; col: number }) => {
    const k = coordKey(coord.row, coord.col);
    if (ignoreUpdatesRef.current.has(k)) {
      // Estamos en un ciclo de "borrar": ignoramos escrituras de forms (p. ej. cleanup del Select)
      return;
    }
    setTemplate((prev) => {
      const next = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
      Object.assign(next[coord.row][coord.col], partialUpdate);
      return next;
    });
  };

  // Menú contextual: asignar tipo / borrar tipo
  const handleSetInputType = (type: string | undefined) => {
    if (!contextMenu) return;
    const { row, col } = contextMenu;
    const k = coordKey(row, col);

    if (type === undefined) {
      // 🗑️ BORRAR: 1) ignorar escrituras de forms mientras desmontan  2) limpiar campos  3) reactivar escrituras
      ignoreUpdatesRef.current.add(k);

      setTemplate((prev) => {
        const updated = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
        updated[row][col] = {
          ...updated[row][col],
          type: undefined,
          label: '',
          placeholder: undefined,
          dropdownOptions: undefined,
          decimalDigits: undefined,
          expression: undefined,
        };
        return updated;
      });

      // Permite que el cleanup de los forms ocurra sin reescribir (siguiente tick)
      setTimeout(() => {
        ignoreUpdatesRef.current.delete(k);
      }, 0);
    } else {
      // Asignar nuevo tipo y activar celda, limpiando propiedades previas
      setTemplate((prev) => {
        const updated = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
        updated[row][col] = {
          ...updated[row][col],
          type: type as any,
          active: true,
          label: '',
          placeholder: type === 'text' || type === 'number' ? '' : undefined,
          dropdownOptions: type === 'select' ? [] : undefined,
          decimalDigits: type === 'number' ? 0 : undefined,
          expression: undefined,
        };

        return updated;
      });

      // Selección única a esa celda (opcional, como veníamos haciendo)
      setTimeout(() => {
        setSelectedCells([{ row, col }]);
      }, 0);
    }

    setContextMenu(null);
  };

  // Publicar estado al Sidebar
  useEffect(() => {
    if (!onSidebarStateChange) return;

    const selectedCount = selectedCells.length;
    const selectedCoord = selectedCount === 1 ? selectedCells[0] : undefined;
    const selectedCell =
      selectedCoord ? template[selectedCoord.row]?.[selectedCoord.col] ?? null : null;

    // Regla de combinar: >=2 y como máx 1 celda con type definido
    const configuredCount = selectedCells.reduce((acc, { row, col }) => acc + (template[row][col].type ? 1 : 0), 0);
    const canCombine = selectedCount >= 2 && configuredCount <= 1;
    const canSeparate = selectedCount >= 1;

    const combineDisabledReason =
      selectedCount >= 2 && configuredCount > 1
        ? 'No se puede combinar: la selección contiene 2 o más celdas ya configuradas.'
        : undefined;

    const state: EditorSidebarState = {
      selectedCount,
      canCombine,
      canSeparate,
      selectedCell,
      selectedCoord,
      combineDisabledReason,
      handlers: { onCombine, onSeparate, onUpdateCell },
    };

    onSidebarStateChange(state);
  }, [selectedCells, template, onSidebarStateChange]);

  return (
    <div
      className="block-template-editor"
      onKeyDown={(e) => e.key === 'Escape' && setSelectedCells([])}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.template-grid') === null) {
          setSelectedCells([]);
          setContextMenu(null);
        }
      }}
    >
      <TemplateGrid
        template={template}
        selectedCells={selectedCells}
        onClick={(e, row, col) => {
          e.preventDefault();
          if (!template[row][col].active) {
            setTemplate((prev) => {
              const updated = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
              updated[row][col] = { ...updated[row][col], active: true };
              return updated;
            });
            setContextMenu({ x: e.clientX, y: e.clientY, row, col });
          } else {
            setTemplate((prev) => {
              const updated = prev.map((r) => r.map((c) => ({ ...c }))) as BlockTemplate;
              updated[row][col] = { ...updated[row][col], active: false };
              return updated;
            });
          }
        }}
        onContextMenu={(e, row, col) => {
          e.preventDefault();
          if (!template[row][col].active) return;
          setContextMenu({ x: e.clientX, y: e.clientY, row, col });
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {contextMenu && (
        <CellContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onSelect={handleSetInputType}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
