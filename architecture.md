# Arquitectura

## Esquema de datos (resumen TypeScript)
```ts
type CellType = 'static' | 'freeText' | 'checkbox' | 'select';
type CellId = `${number},${number}`; // "row,col"

interface CellMeta {
  active: boolean;
  type?: CellType;
  label?: string;
  mergedTo?: CellId; // si es esclava
  span?: { rows: number; cols: number }; // si es master
}

interface Block {
  id: string;
  name: string;
  grid: Record<CellId, CellMeta>;
  updatedAt: number;
}

interface MeshPieceRef { blockId: string; snapshot?: Block }

interface Project {
  id: string;
  name: string;
  repo: Record<string, Block>;
  mesh: MeshPieceRef[]; // simplificado
  updatedAt: number;
}
```

## Flujos principales
1. **Diseñar bloque** → publicar/actualizar en repositorio (maestro).
2. **Construir malla** con piezas referenciadas/snapshot.
3. **Editar efímero** un maestro → “Actualizar repositorio” → propagar.

## Persistencia
- LocalStorage con **autosave con debounce** (500–1000 ms).
- `schemaVersion` en JSON para migraciones.

## UI
- **StatusBar** (3 slots).
- **AppHeader** con *toggle* para maximizar área de trabajo.
- **Guard de navegación único** (hook).
