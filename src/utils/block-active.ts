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

// --- NUEVO: expande bounds a merges vigentes del maestro (Optimizado con BFS) ---
export const expandBoundsToMerges = (
  template: BlockTemplate,
  b: ActiveBounds
): ActiveBounds => {
  const rowsN = template.length;
  const colsN = template[0]?.length ?? 0;
  const keyOf = (r: number, c: number) => `${r}-${c}`;

  // Set de celdas ya visitadas para evitar ciclos y re-procesamiento
  const visited = new Set<string>();

  // Cola para BFS
  const queue: Array<{ r: number; c: number }> = [];

  // 1. Inicializar la cola con todas las celdas dentro de los bounds originales
  for (let r = b.minRow; r <= b.maxRow; r++) {
    for (let c = b.minCol; c <= b.maxCol; c++) {
      const key = keyOf(r, c);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ r, c });
      }
    }
  }

  let minRow = b.minRow, minCol = b.minCol, maxRow = b.maxRow, maxCol = b.maxCol;

  // Helper para procesar un miembro y agregarlo a la cola si es nuevo
  const addMember = (r: number, c: number) => {
    const key = keyOf(r, c);
    if (!visited.has(key)) {
      visited.add(key);
      queue.push({ r, c });

      // Actualizar bounds dinámicamente
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
    }
  };

  // 2. Procesar la cola (BFS)
  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    const cell = template[r]?.[c];
    if (!cell) continue;

    // Identificar el "base" del grupo al que pertenece esta celda
    let baseR = r, baseC = c;
    if (cell.mergedWith) {
      const [rs, cs] = cell.mergedWith.split('-');
      baseR = Number(rs);
      baseC = Number(cs);
    } else {
      // Si no tiene mergedWith, podría ser una base o una celda independiente.
      // Verificamos si es base de alguien más (esto es costoso si escaneamos todo, 
      // pero aquí solo necesitamos saber si "pertenece" a un grupo).
      // En la estructura actual, si es base, sus miembros apuntan a él.
      // Si es miembro, apunta a la base.
      // La optimización clave es: si ya procesamos la base, procesamos sus miembros.
      // Pero, ¿cómo encontramos los miembros de una base sin escanear?
      // Lamentablemente, la estructura de datos es "celda -> base", no "base -> miembros".
      // Para hacerlo O(1), necesitaríamos un índice inverso.
      // Sin índice inverso, aún tenemos que buscar.
      // PERO, podemos optimizar: solo buscamos si NO hemos visitado ya este grupo.
    }

    const baseKey = keyOf(baseR, baseC);

    // Si esta celda es parte de un grupo (es base o miembro), necesitamos asegurar
    // que TODOS los miembros del grupo estén en la cola.
    // Como no tenemos índice inverso, la primera vez que encontramos un grupo,
    // debemos escanear la grilla para encontrar a todos sus hermanos.
    // Para evitar re-escanear, usamos un cache de "grupos procesados".

    // NOTA: Para mantener la compatibilidad estricta con la lógica anterior sin cambiar
    // la estructura de datos (BlockTemplate), el escaneo es inevitable al menos una vez por grupo.
    // Sin embargo, podemos limitar el escaneo a "solo cuando encontramos un nuevo grupo".

    // Hack de optimización: Si la celda ya fue totalmente procesada como parte de un grupo, saltar.
    // Pero `visited` es por celda.

    // Vamos a implementar la búsqueda de miembros "bajo demanda" y cachearla.
    // O mejor, simplemente agregamos la base y dejamos que el loop procese.

    // Si la celda actual apunta a una base, agregamos la base a la cola.
    if (baseR !== r || baseC !== c) {
      addMember(baseR, baseC);
    }

    // El problema real: encontrar celdas que apuntan a (baseR, baseC).
    // Esto requiere escanear. PERO, solo necesitamos hacerlo UNA VEZ por base única.
    // Usaremos un Set estático para bases ya expandidas en esta llamada.
  }

  // --- RE-IMPLEMENTACIÓN CON CACHE DE BASES ---
  // El BFS anterior tiene el problema de que encontrar "hijos" es costoso.
  // Vamos a hacerlo híbrido:
  // 1. Recolectar todas las "bases" involucradas en los bounds iniciales.
  // 2. Para cada base nueva, escanear la grilla UNA VEZ buscando sus miembros.
  // 3. Expandir bounds con esos miembros.
  // 4. Repetir si los nuevos miembros traen nuevas bases (raro en este modelo, pues es 1 nivel de profundidad, pero posible si hubiera cadenas).

  // En el modelo actual (mergedWith apunta a base), la profundidad es 1.
  // Así que el algoritmo es:
  // 1. Identificar bases de todas las celdas en bounds.
  // 2. Buscar todos los miembros de esas bases en toda la grilla.
  // 3. Calcular bounds finales.

  const basesToExpand = new Set<string>();

  // Paso 1: Encontrar bases iniciales
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = template[r]?.[c];
      if (!cell) continue;
      if (cell.mergedWith) {
        basesToExpand.add(cell.mergedWith);
      } else {
        // Podría ser base. Lo agregamos por si acaso (si no tiene hijos, no pasa nada)
        basesToExpand.add(keyOf(r, c));
      }
    }
  }

  // Paso 2: Escanear la grilla UNA VEZ para encontrar miembros de estas bases.
  // Esto reduce la complejidad de O(K * N^2) a O(N^2) donde K es iteraciones de expansión.
  // Sigue siendo O(N^2) en el peor caso (toda la grilla), pero solo una pasada.

  // Optimización adicional: Si no hay merges en absoluto, esto es O(1) (ya cubierto por bounds iniciales).
  // Pero no sabemos si hay merges sin mirar.

  // Escaneo único
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < colsN; c++) {
      const cell = template[r][c];
      if (!cell) continue;

      let myBase = keyOf(r, c);
      if (cell.mergedWith) {
        myBase = cell.mergedWith;
      } else {
        // Si no tiene mergedWith, es su propia base.
        // Pero solo nos importa si esta "base" está en nuestra lista de interés.
        // (Es decir, si alguien en los bounds originales apuntaba a esta celda,
        // O si esta celda estaba en los bounds originales).
      }

      if (basesToExpand.has(myBase)) {
        // Esta celda pertenece a un grupo de interés. Expandir bounds.
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }
    }
  }

  // NOTA: El algoritmo original hacía un `while(changed)` que podía iterar muchas veces.
  // En el modelo de datos actual, `mergedWith` es directo a la base (no hay cadenas A->B->C).
  // Por lo tanto, una sola pasada es suficiente para encontrar todos los "hermanos".
  // EXCEPCIÓN: Si al expandir bounds "tocamos" accidentalmente OTRO grupo que no estaba en los bounds originales
  // pero que ahora se solapa con el nuevo rectángulo?
  // El requerimiento es "expandir bounds para incluir grupos COMPLETOS de cualquier celda tocada".
  // Si el nuevo rectángulo toca un grupo nuevo, ¿debemos incluirlo también?
  // La implementación anterior SÍ lo hacía (al iterar `while(changed)`).
  // Si el rectángulo crece y toca una esquina de otro grupo, ese grupo se "activa" y el rectángulo crece más.

  // Para soportar ese comportamiento "contagioso" (efecto avalancha) de manera eficiente:
  // Necesitamos un enfoque de componentes conectados real.

  // Volvemos al BFS, pero optimizado:
  // Construimos un mapa "Base -> [Miembros]" al vuelo o pre-calculado?
  // Pre-calcular es lo mejor para O(1).
  // Como no podemos cambiar la firma de la función para recibir cache, lo calculamos localmente.
  // Costo: O(N^2) una vez.

  const groups = new Map<string, Array<{ r: number, c: number }>>();

  // Construir índice inverso (O(Cells))
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < colsN; c++) {
      const cell = template[r][c];
      if (!cell) continue;
      let baseKey = keyOf(r, c);
      if (cell.mergedWith) baseKey = cell.mergedWith;

      // Solo nos importa agrupar si hay merges. Si cada celda es isla, esto es overhead.
      // Pero asumimos que hay merges.
      if (!groups.has(baseKey)) {
        groups.set(baseKey, []);
      }
      groups.get(baseKey)!.push({ r, c });
    }
  }

  // Ahora BFS sobre los grupos
  const processedBases = new Set<string>();
  const q: string[] = [];

  // Inicializar con grupos tocados por bounds iniciales
  // Esto es O(BoundsArea)
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = template[r][c];
      let base = keyOf(r, c);
      if (cell?.mergedWith) base = cell.mergedWith;

      if (!processedBases.has(base)) {
        processedBases.add(base);
        q.push(base);
      }
    }
  }

  while (q.length > 0) {
    const base = q.shift()!;
    const members = groups.get(base);
    if (!members) continue;

    for (const m of members) {
      // Expandir bounds
      let changed = false;
      if (m.r < minRow) { minRow = m.r; changed = true; }
      if (m.r > maxRow) { maxRow = m.r; changed = true; }
      if (m.c < minCol) { minCol = m.c; changed = true; }
      if (m.c > maxCol) { maxCol = m.c; changed = true; }

      // Si los bounds cambiaron, verificar si "tocamos" nuevos grupos en el área expandida
      // Esto es lo complicado: detectar colisiones con nuevos grupos sin re-escanear todo.
      // Pero espera, si expandimos el rectángulo, solo necesitamos chequear las celdas NUEVAS
      // que entraron en el rectángulo.
      // PERO, en este loop estamos iterando miembros de un grupo.
      // El "rectángulo" es una abstracción final.
      // La lógica original era: "Si el rectángulo de selección toca CUALQUIER parte de un grupo, dame TODO el grupo".
      // Y recursivamente: "Si al crecer el rectángulo toco otro grupo, dame ese también".

      // Con el índice `groups`, podemos hacer esto:
      // El rectángulo actual es [minRow, maxRow] x [minCol, maxCol].
      // Si este rectángulo intersecta con el BoundingBox de otro grupo, ¿debemos fusionarlo?
      // La lógica original iteraba celda por celda dentro del rectángulo actual.

      // Enfoque correcto y robusto:
      // 1. Empezamos con el rectángulo actual.
      // 2. Iteramos sobre todas las celdas de ese rectángulo.
      // 3. Identificamos sus bases.
      // 4. Si encontramos una base no procesada, agregamos sus miembros al rectángulo (expandiéndolo).
      // 5. Si el rectángulo crece, debemos procesar las NUEVAS celdas que ahora están dentro.
    }
  }

  // Implementación iterativa eficiente del "Efecto Avalancha"
  // Usamos un stack de "áreas a escanear".
  // Al principio, escaneamos el área inicial.
  // Si encontramos un grupo, expandimos el área total.
  // Las "nuevas áreas" (la diferencia entre el viejo y nuevo rectángulo) se agregan al stack para ser escaneadas.

  // Reiniciamos bounds para el algoritmo final
  minRow = b.minRow; maxRow = b.maxRow; minCol = b.minCol; maxCol = b.maxCol;

  const processedBasesFinal = new Set<string>();
  // Stack de rectángulos sucios por revisar: [minR, maxR, minC, maxC]
  const dirtyRects: Array<[number, number, number, number]> = [[minRow, maxRow, minCol, maxCol]];

  while (dirtyRects.length > 0) {
    const [r1, r2, c1, c2] = dirtyRects.pop()!;

    // Clamp a limites reales
    const startR = Math.max(0, r1);
    const endR = Math.min(rowsN - 1, r2);
    const startC = Math.max(0, c1);
    const endC = Math.min(colsN - 1, c2);

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const cell = template[r][c];
        if (!cell) continue;

        let base = keyOf(r, c);
        if (cell.mergedWith) base = cell.mergedWith;

        if (processedBasesFinal.has(base)) continue;
        processedBasesFinal.add(base);

        // Encontramos un grupo nuevo dentro del área sucia.
        // Obtenemos todos sus miembros (usando el índice `groups` construido arriba)
        const members = groups.get(base);
        if (!members) continue;

        // Calcular el bounding box de este grupo
        let gMinR = rowsN, gMaxR = -1, gMinC = colsN, gMaxC = -1;
        for (const m of members) {
          if (m.r < gMinR) gMinR = m.r;
          if (m.r > gMaxR) gMaxR = m.r;
          if (m.c < gMinC) gMinC = m.c;
          if (m.c > gMaxC) gMaxC = m.c;
        }

        // Si este grupo está TOTALMENTE contenido en los bounds actuales, no expande nada.
        // Pero si se sale, expande los bounds globales y genera nuevas áreas sucias.

        const oldMinRow = minRow, oldMaxRow = maxRow, oldMinCol = minCol, oldMaxCol = maxCol;

        let expanded = false;
        if (gMinR < minRow) { minRow = gMinR; expanded = true; }
        if (gMaxR > maxRow) { maxRow = gMaxR; expanded = true; }
        if (gMinC < minCol) { minCol = gMinC; expanded = true; }
        if (gMaxC > maxCol) { maxCol = gMaxC; expanded = true; }

        if (expanded) {
          // Agregar las franjas nuevas a dirtyRects
          // Para simplificar, agregamos todo el nuevo bounding box del grupo, 
          // o mejor, agregamos las diferencias.
          // Simplificación: agregamos el bounding box del grupo que acabamos de procesar
          // para asegurar que revisamos si ese grupo "toca" a otros en su extensión.
          // Pero espera, ya tenemos los miembros del grupo.
          // Lo que importa es el ÁREA GEOMÉTRICA que ahora abarcamos y antes no.

          // Estrategia simple: agregar el bounding box del grupo entero como dirty,
          // PERO solo procesar lo que no hayamos procesado.
          // Como usamos `processedBasesFinal`, no repetiremos grupos.
          // Así que podemos simplemente agregar el rect del grupo a dirty.
          dirtyRects.push([gMinR, gMaxR, gMinC, gMaxC]);

          // Además, si el bounds global creció, técnicamente deberíamos revisar
          // el área vacía entre el viejo bounds y el nuevo.
          // Ejemplo: Bounds viejos [0,1]x[0,1]. Grupo nuevo en [0,3]x[0,3].
          // Bounds nuevos [0,3]x[0,3].
          // El área [0,3]x[0,3] contiene celdas que NO estaban en [0,1]x[0,1] ni en el grupo nuevo?
          // Sí, podría haber celdas "en medio" que ahora quedan atrapadas.
          // Por tanto, debemos agregar TODO el nuevo bounds global a dirty?
          // Eso sería seguro pero podría ser redundante.
          // Agreguemos el nuevo bounds global a dirty. Se procesará rápido porque los grupos ya estarán en `processedBasesFinal`.
          dirtyRects.push([minRow, maxRow, minCol, maxCol]);
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
