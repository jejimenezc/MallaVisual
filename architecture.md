# Arquitectura

## Visión general
- Aplicación SPA construida con **React 19**, **TypeScript** y empaquetada con **Vite**. La raíz se monta en `src/main.tsx`, donde se inicializa `BrowserRouter` y el `UILayoutProvider` que controla el cromado global.【F:src/main.tsx†L1-L14】
- `src/App.tsx` compone el resto de providers de dominio (`AppCommandsProvider`, `ProceedToMallaProvider`) y orquesta las rutas principales.【F:src/App.tsx†L1007-L1089】【F:src/state/app-commands.tsx†L1-L73】【F:src/state/proceed-to-malla.tsx†L1-L120】
- El diseño global (`AppLayout`) reúne cabecera (`AppHeader`), barra de menús (`GlobalMenuBar`), tabs contextuales (`NavTabs`) y barra de estado (`StatusBar`) antes de renderizar el área principal de pantallas.【F:src/App.tsx†L209-L310】【F:src/components/AppHeader.tsx†L1-L120】【F:src/components/GlobalMenuBar/GlobalMenuBar.tsx†L1-L200】【F:src/components/NavTabs.tsx†L1-L160】【F:src/components/StatusBar/StatusBar.tsx†L1-L120】

## Ruteo y pantallas
La navegación se resuelve con React Router y expone cinco rutas de trabajo：【F:src/App.tsx†L1044-L1089】
- `/` → `HomeScreen`: tablero de arranque con proyectos recientes y acciones de importación/creación.【F:src/screens/HomeScreen.tsx†L1-L160】
- `/block/design` → `BlockEditorScreen`: edición de estructura lógica del bloque curricular.
- `/block/style` → `BlockEditorScreen` en modo vista para revisar estilos publicados.
- `/blocks` → `BlockRepositoryScreen`: biblioteca local de bloques maestros importados o publicados.【F:src/screens/BlockRepositoryScreen.tsx†L1-L200】
- `/malla/design` → `MallaEditorScreen`: constructor de la macro-grilla con piezas referenciadas o snapshots.【F:src/screens/MallaEditorScreen.tsx†L1-L200】

`ProceedToMallaProvider` centraliza la lógica de guards entre el editor de bloques y la malla, asegurando confirmaciones cuando existen cambios sin publicar.【F:src/state/proceed-to-malla.tsx†L12-L120】

## Capas funcionales
- **Pantallas (`src/screens/`)**: orquestan la UI de alto nivel, combinan componentes y manejan side-effects específicos de cada flujo (p. ej. undo/redo y zoom en `MallaEditorScreen`, guardado del maestro en `BlockEditorScreen`).【F:src/screens/BlockEditorScreen.tsx†L1-L200】【F:src/screens/MallaEditorScreen.tsx†L360-L460】
- **Componentes (`src/components/`)**: piezas reutilizables como grids (`TemplateGrid`, `TemplateCell`), formularios de configuración de celdas, snapshot visuales y elementos de cromado (Header, Button, NavTabs, StatusBar).【F:src/components/TemplateGrid.tsx†L1-L200】【F:src/components/BlockSnapshot.tsx†L1-L200】
- **Layout (`src/layout/TwoPaneLayout.tsx`)**: divide la interfaz en panel izquierdo/derecho consistente para pantallas maestras.【F:src/layout/TwoPaneLayout.tsx†L1-L120】
- **Estado compartido (`src/state/`)**: contexts para comandos globales (`undo`/`redo`), guards de navegación y visibilidad de la interfaz.【F:src/state/app-commands.tsx†L1-L84】【F:src/state/ui-layout.tsx†L1-L70】
- **Core/Persistencia (`src/core/persistence/`)**: `PersistenceService` abstrae LocalStorage para proyectos, autosave y repositorio de bloques, además de proveer hooks React para consumirlo.【F:src/core/persistence/PersistenceService.ts†L1-L200】【F:src/core/persistence/hooks.ts†L1-L70】
- **Utilidades (`src/utils/`)**: lógica pura para E/S (`block-io`, `malla-io`), sincronización de maestros con repositorio (`malla-sync`), recortes de grillas (`block-active`), nombres de archivo y tests asociados.【F:src/utils/malla-io.ts†L1-L200】【F:src/utils/malla-sync.ts†L1-L89】【F:src/utils/block-active.ts†L1-L160】
- **Tipos (`src/types/`)**: definiciones compartidas del dominio curricular (bloques, piezas, visual).【F:src/types/curricular.ts†L1-L120】【F:src/types/visual.ts†L1-L120】

## Modelo de dominio
- **Bloque curricular**: `BlockTemplateCell` describe cada celda (estado activo, tipo de control, fusiones, estilo) dentro de una matriz 10×10 (`BlockTemplate`).【F:src/types/curricular.ts†L4-L50】
- **Estilo visual**: `VisualTemplate` almacena estilos por clave `row-col` con soporte para tamaño de fuente granular, padding y colores condicionales.【F:src/types/visual.ts†L1-L34】
- **BlockContent**: representación unificada utilizada para comparar/publicar borradores (`template`, `visual`, `aspect`).【F:src/utils/block-content.ts†L1-L120】
- **Proyecto de malla (`MallaExport`)**: incluye maestros normalizados, piezas colocadas, valores de celda, piezas flotantes y repositorio serializado para exportación/importación.【F:src/utils/malla-io.ts†L11-L64】
- **Metadatos de repositorio**: identificadores amigables `projectId:uuid` y timestamps (`BlockMetadata`) garantizan trazabilidad y migraciones desde versiones legadas.【F:src/types/block.ts†L1-L40】【F:src/utils/malla-io.ts†L66-L160】

## Persistencia y sincronización
- **Autosave**: `PersistenceService.autoSave` guarda con debounce tanto en LocalStorage (borrador rápido) como en el repositorio de proyectos persistentes; `StatusBar` muestra el estado en vivo (idle/saving/error).【F:src/core/persistence/PersistenceService.ts†L35-L120】【F:src/components/StatusBar/StatusBar.tsx†L15-L70】
- **Repositorio de bloques**: almacenado en `block-repo` con normalización de metadatos, eventos de sincronización (`block-repo-updated`) y utilidades de import/export en formato JSON (`BlockExport`).【F:src/utils/block-repo.ts†L1-L160】
- **Proyectos recientes**: `createLocalStorageProjectRepository` gestiona múltiples proyectos con nombre y fecha para el Home y el menú global.【F:src/utils/master-repo.ts†L60-L140】
- **Sincronización maestro↔repositorio**: `prepareMallaProjectState` combina mallas importadas con el repositorio actual reutilizando IDs cuando los contenidos coinciden y remapeando piezas referenciadas y snapshots.【F:src/App.tsx†L63-L198】【F:src/utils/malla-sync.ts†L1-L89】

## Editor de bloques
- `BlockEditorScreen` administra el borrador activo, publica en el repositorio y mantiene el “dirty state” comparando contra la versión publicada (`blockContentEquals`).【F:src/screens/BlockEditorScreen.tsx†L1-L160】【F:src/App.tsx†L318-L396】
- `BlockTemplateEditor` habilita selección por arrastre, fusiones, asignación de tipos mediante menú contextual y sincroniza formularios específicos por tipo de control.【F:src/components/BlockTemplateEditor.tsx†L1-L200】
- El panel lateral (`ContextSidebarPanel`) y `FormatStylePanel` comparten el estado reportado por el editor para mostrar formularios contextuales y estilos globales.【F:src/components/ContextSidebarPanel.tsx†L1-L200】【F:src/components/FormatStylePanel.tsx†L1-L200】
- Publicar un bloque genera/actualiza metadatos (`BlockMetadata`), guarda en el repositorio y sincroniza la malla si el bloque está en uso.【F:src/App.tsx†L680-L780】【F:src/screens/MallaEditorScreen.tsx†L200-L360】

## Editor de malla
- `MallaEditorScreen` recorta el bloque maestro a los límites activos (`getActiveBounds`, `cropTemplate`) y permite colocar piezas referenciadas o snapshots en una grilla ajustable.【F:src/screens/MallaEditorScreen.tsx†L1-L200】【F:src/utils/block-active.ts†L1-L160】
- Incluye historial con undo/redo (`useAppCommand`), zoom continuo, vista previa de tamaños por aspecto y panel de maestros disponibles alimentado desde el repositorio local.【F:src/screens/MallaEditorScreen.tsx†L360-L460】【F:src/screens/MallaEditorScreen.tsx†L460-L560】
- Autosave dedicado (`useProject` con `storageKey` propio) conserva avances aunque no exista proyecto persistente, y `prepareMallaProjectState` reconstruye piezas al importar proyectos externos.【F:src/screens/MallaEditorScreen.tsx†L200-L360】【F:src/App.tsx†L63-L198】

## Menús y comandos globales
- `GlobalMenuBar` expone acciones de archivo (nuevo, abrir, exportar, cerrar), biblioteca (importar maestros) y edición (undo/redo vía `AppCommandsProvider`).【F:src/components/GlobalMenuBar/GlobalMenuBar.tsx†L1-L200】
- `StatusBar` muestra nombre del proyecto activo, versión de esquema (block/malla) y accesos rápidos para saltar entre editor/malla o alternar el cromado.【F:src/components/StatusBar/StatusBar.tsx†L1-L120】
- `NavTabs` refleja el estado del guard `ProceedToMalla` para compartir confirmaciones entre tabs y el botón rápido “Ir a Malla”.【F:src/components/NavTabs.tsx†L1-L160】【F:src/state/proceed-to-malla.tsx†L12-L120】

## Estilos y assets
- Estilos globales en `src/styles/` (variables CSS, normalizaciones) y CSS Modules por componente (`.module.css`). Componentes visuales clave (`BlockSnapshot`, `ActionPillButton`) consumen assets bajo `src/assets/` para iconografía.【F:src/styles/global.css†L1-L120】【F:src/components/ActionPillButton/ActionPillButton.tsx†L1-L120】

## Pruebas y utilidades de desarrollo
- Pruebas unitarias basadas en **Vitest** cubren utilidades críticas (`block-io`, `malla-io`, `block-repo`, cálculos de celdas y clonación), ejecutables con `npm test`.【F:package.json†L8-L24】【F:src/utils/block-io.test.ts†L1-L200】【F:src/utils/malla-io.test.ts†L1-L200】
- Scripts complementarios: `npm run lint`, `npm run typecheck` y `npm run build` para pipelines de CI/CD.【F:package.json†L8-L24】