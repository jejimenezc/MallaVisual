// src/utils/block-active.ts
import type { BlockTemplate, BlockTemplateCell } from '../types/curricular.ts';
import type { VisualTemplate } from '../types/visual.ts';
import { collectSelectControls } from './selectControls.ts';

export interface ActiveBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  rows: number;
  cols: number;
}

/** Utilidad: "r-c" */
const keyOf = (r: number, c: number) => `${r}-${c}`;

/** ¿La coord está dentro de una matriz? */
const insideMatrix = (tpl: BlockTemplate, r: number, c: number) =>
  r >= 0 && r < tpl.length && c >= 0 && c < (tpl[0]?.length ?? 0);

/** ¿Esta celda es base de un merge (alguien la referencia)? */
const isBaseCell = (tpl: BlockTemplate, r: number, c: number) => {
  const baseKey = keyOf(r, c);
  return tpl.some(row => row.some(cell => cell?.mergedWith === baseKey));
};

/** Devuelve el "base" (r,c) del grupo al que pertenece la celda (o null si no hay grupo) */
const baseOf = (tpl: BlockTemplate, r: number, c: number): { r: number; c: number } | null => {
  const cell = tpl[r][c];
  if (!cell) return null;

  if (cell.mergedWith) {
    // Miembro: parsear base
    const [rs, cs] = cell.mergedWith.split('-');
    const br = Number(rs), bc = Number(cs);
    if (insideMatrix(tpl, br, bc)) return { r: br, c: bc };
    return null;
  }
  // ¿Es base?
  if (isBaseCell(tpl, r, c)) return { r, c };
  return null;
};

/** Recolecta TODOS los miembros (incluye base) del grupo cuyo base es (br,bc) */
const groupMembersOfBase = (tpl: BlockTemplate, br: number, bc: number): Array<{ r: number; c: number }> => {
  const baseKey = keyOf(br, bc);
  const members: Array<{ r: number; c: number }> = [{ r: br, c: bc }];
  tpl.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      if (cell?.mergedWith === baseKey) members.push({ r: rIdx, c: cIdx });
    });
  });
  return members;
};

/**
 * NUEVO: límites activos que SIEMPRE incluyen grupos completos.
 * Recorre celdas activas y, si pertenecen a un grupo (base o miembro),
 * expande los límites para abarcar TODO el grupo.
 */
export const getActiveBounds = (template: BlockTemplate): ActiveBounds => {
  const rowsN = template.length;
  const colsN = template[0]?.length ?? 0;

  let minRow = rowsN, minCol = colsN, maxRow = -1, maxCol = -1;

  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < colsN; c++) {
      const cell = template[r][c];
      if (!cell?.active) continue;

      const base = baseOf(template, r, c);
      if (base) {
        // Expandir por TODO el grupo
        const members = groupMembersOfBase(template, base.r, base.c);
        for (const m of members) {
          if (m.r < minRow) minRow = m.r;
          if (m.c < minCol) minCol = m.c;
          if (m.r > maxRow) maxRow = m.r;
          if (m.c > maxCol) maxCol = m.c;
        }
      } else {
        // Celda independiente
        if (r < minRow) minRow = r;
        if (c < minCol) minCol = c;
        if (r > maxRow) maxRow = r;
        if (c > maxCol) maxCol = c;
      }
    }
  }

  // Si no hay activas, devolver algo seguro (1x1 en 0,0)
  if (maxRow < 0 || maxCol < 0) {
    return { minRow: 0, minCol: 0, maxRow: 0, maxCol: 0, rows: 1, cols: 1 };
  }

  return {
    minRow,
    minCol,
    maxRow,
    maxCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
};

/**
 * Recorta el template a ActiveBounds, CLONANDO celdas y rebasando "mergedWith"
 * al nuevo sistema de coordenadas relativo al recorte.
 * Si el base de un merge quedó fuera del recorte, se remueve "mergedWith"
 * (esa celda se trata como independiente dentro del recorte).
 */
export const cropTemplate = (
  template: BlockTemplate,
  b: ActiveBounds
): BlockTemplate => {
  const rows = b.rows;
  const cols = b.cols;

  // Helper: ¿(r,c) global está dentro del recorte?
  const inside = (r: number, c: number) =>
    r >= b.minRow && r <= b.maxRow && c >= b.minCol && c <= b.maxCol;

  // parsea "row-col" -> [r, c]
  const parseKey = (k: string) => {
    const [rs, cs] = k.split('-');
    return [Number(rs), Number(cs)] as const;
  };

  // Helper: rebase de expresiones (rNcM) al nuevo origen del recorte
  const rebaseExpr = (expr: string) =>
    expr.replace(/r(\d+)c(\d+)/g, (_m, rs, cs) => {
      const gr = Number(rs), gc = Number(cs);
      const rr = gr - b.minRow, cc = gc - b.minCol;
      // si la referencia cae fuera del recorte, reemplazamos por 0
      return rr >= 0 && rr < b.rows && cc >= 0 && cc < b.cols ? `r${rr}c${cc}` : '0';
    });
  // Construir el recorte, clonando celdas y rebasando merges
  const result: BlockTemplate = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const src = template[b.minRow + r][b.minCol + c];
      const cloned: BlockTemplateCell = { ...(src as BlockTemplateCell) };

      if (src?.mergedWith) {
        const [br, bc] = parseKey(src.mergedWith); // base global
        if (inside(br, bc)) {
          // Rebase del base a coords relativas del recorte
          cloned.mergedWith = keyOf(br - b.minRow, bc - b.minCol);
        } else {
          // Base quedó fuera: romper combinación para esta celda
          delete cloned.mergedWith;
        }
      }

      // ✅ Rebase de expresiones de campos calculados
      if (src?.expression) {
        cloned.expression = rebaseExpr(src.expression);
      }
      
      return cloned;
    })
  );

  return result;
};

/** Recorta el visual a ActiveBounds, rebasando claves "r-c" al nuevo origen */
export const cropVisualTemplate = (
  visual: VisualTemplate,
  template: BlockTemplate,
  b: ActiveBounds
): VisualTemplate => {
  const result: VisualTemplate = {};
  const controls = collectSelectControls(template);
  const controlsByName = new Map(controls.map((control) => [control.name, control]));
  const controlsByCoord = new Map(controls.map((control) => [control.coord, control]));
  for (let r = b.minRow; r <= b.maxRow; r++) {
    for (let c = b.minCol; c <= b.maxCol; c++) {
      const key = keyOf(r, c);
      const style = visual[key];
      if (style) {
        const newKey = keyOf(r - b.minRow, c - b.minCol);

        // Clonar para evitar mutar el estilo original
        const cloned = { ...style } as typeof style;

        // ✅ Rebase de coord de selectSource (si está dentro del recorte)
        const src = cloned.conditionalBg?.selectSource;
        if (src) {
          const control =
            (src.controlName ? controlsByName.get(src.controlName) : undefined) ??
            (src.coord ? controlsByCoord.get(src.coord) : undefined);
          if (control) {
            const rr = control.row - b.minRow;
            const cc = control.col - b.minCol;
            if (rr >= 0 && rr < b.rows && cc >= 0 && cc < b.cols) {
              cloned.conditionalBg = {
                ...cloned.conditionalBg,
                selectSource: {
                  controlName: control.name,
                  coord: keyOf(rr, cc),
                  colors: { ...src.colors },
                },
              };
            } else {
              const { selectSource: _selectSource, ...rest } = cloned.conditionalBg!;
              cloned.conditionalBg = Object.keys(rest).length ? rest : undefined;
            }
          } else {
            const { selectSource: _selectSource, ...rest } = cloned.conditionalBg!;
            cloned.conditionalBg = Object.keys(rest).length ? rest : undefined;
          }
        }

        result[newKey] = cloned;
      }
    }
  }
  return result;
};

// --- NUEVO: expande bounds a merges vigentes del maestro ---
export const expandBoundsToMerges = (
  template: BlockTemplate,
  b: ActiveBounds
): ActiveBounds => {
  // Partimos de los bounds dados
  let minRow = b.minRow, minCol = b.minCol, maxRow = b.maxRow, maxCol = b.maxCol;

  const rowsN = template.length;
  const colsN = template[0]?.length ?? 0;
  const keyOf = (r: number, c: number) => `${r}-${c}`;

  const isInside = (r: number, c: number) =>
    r >= 0 && r < rowsN && c >= 0 && c < colsN;

  // Detectar si la celda pertenece a un grupo y traer todos sus miembros
  const groupMembersOf = (r: number, c: number): Array<{ r: number; c: number }> => {
    const cell = template[r][c];
    if (!cell) return [];
    let br = r, bc = c;

    if (cell.mergedWith) {
      const [rs, cs] = cell.mergedWith.split('-');
      br = Number(rs); bc = Number(cs);
    } else {
      // ¿esta celda es base de alguien?
      const baseKey = keyOf(r, c);
      const someRef = template.some(row => row.some(cel => cel?.mergedWith === baseKey));
      if (!someRef) return []; // no pertenece a ningún grupo
    }

    const baseKey = keyOf(br, bc);
    const members: Array<{ r: number; c: number }> = [{ r: br, c: bc }];
    template.forEach((row, rIdx) => {
      row.forEach((cel, cIdx) => {
        if (cel?.mergedWith === baseKey) members.push({ r: rIdx, c: cIdx });
      });
    });
    return members;
  };

  // Expandimos iterativamente hasta estabilizar
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!isInside(r, c)) continue;
        const members = groupMembersOf(r, c);
        if (members.length === 0) continue; // no es grupo

        for (const m of members) {
          if (m.r < minRow) { minRow = m.r; changed = true; }
          if (m.c < minCol) { minCol = m.c; changed = true; }
          if (m.r > maxRow) { maxRow = m.r; changed = true; }
          if (m.c > maxCol) { maxCol = m.c; changed = true; }
        }
      }
    }
  }

  return {
    minRow, minCol, maxRow, maxCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
};
