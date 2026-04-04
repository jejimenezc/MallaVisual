# 📘 Proyecto Mallas Curriculares

Aplicación web para construir, organizar y visualizar mallas curriculares universitarias a partir de bloques visuales interactivos. Está inspirada en la flexibilidad de Excel, pero con una interfaz moderna, modular y preparada para persistencia local.

## Índice rápido
1. [Descripción general](#descripción-general)
2. [Características clave](#características-clave)
3. [Arquitectura en breve](#arquitectura-en-breve)
4. [Requisitos](#requisitos)
5. [Instalación y ejecución](#instalación-y-ejecución)
6. [Scripts disponibles](#scripts-disponibles)
7. [Estructura de carpetas](#estructura-de-carpetas)
8. [Persistencia y datos](#persistencia-y-datos)
9. [Terminología oficial](#terminología-oficial)
10. [Estado actual y roadmap](#estado-actual-y-roadmap)
11. [Documentación relacionada](#documentación-relacionada)
12. [Contribuciones](#contribuciones)

## Descripción general
Cada bloque curricular se edita sobre una grilla 10×10 donde cada celda puede:
- Activarse/desactivarse y combinarse con celdas vecinas.
- Configurarse con diferentes tipos de entrada (texto libre, texto estático, checkbox, lista desplegable, campo numérico o fórmula calculada).
- Ajustar estilos visuales (color, alineación, tipografía, padding, bordes y colores condicionales).

Los bloques publicados alimentan una **malla curricular** (macro-grilla) que admite piezas referenciadas (vivas) o snapshots (copias), con historial undo/redo y zoom continuo.【F:src/components/BlockTemplateEditor.tsx†L1-L200】【F:src/screens/MallaEditorScreen.tsx†L360-L460】

## Características clave
- **Flujo completo de proyectos** con autosave, exportación/importación y listado de recientes desde `HomeScreen`.【F:src/screens/HomeScreen.tsx†L1-L160】【F:src/core/persistence/PersistenceService.ts†L1-L200】
- **Editor de bloques** con menú contextual, panel de formularios específicos y panel de estilo reutilizable.【F:src/components/BlockTemplateEditor.tsx†L1-L200】【F:src/components/ContextSidebarPanel.tsx†L1-L200】【F:src/components/FormatStylePanel.tsx†L1-L200】
- **Repositorio local** de bloques con import/export JSON, renombrado y apertura directa en el editor.【F:src/screens/BlockRepositoryScreen.tsx†L1-L200】
- **Editor de malla** con piezas referenciadas/snapshot, zoom, historial de acciones y sincronización automática cuando cambia un maestro publicado.【F:src/screens/MallaEditorScreen.tsx†L120-L460】【F:src/utils/malla-sync.ts†L1-L89】
- **Cromado global personalizable**: AppHeader, GlobalMenuBar, NavTabs y StatusBar con botón rápido de navegación y toggle para ocultar la interfaz.【F:src/App.tsx†L209-L310】【F:src/components/StatusBar/StatusBar.tsx†L1-L120】

## Arquitectura en breve
- SPA construida con React 19 + Vite + TypeScript.【F:src/main.tsx†L1-L14】【F:package.json†L1-L32】
- Providers globales: `UILayoutProvider` (estado del cromado), `AppCommandsProvider` (undo/redo) y `ProceedToMallaProvider` (guards de navegación).【F:src/main.tsx†L1-L14】【F:src/App.tsx†L1007-L1089】
- Rutas principales: `/`, `/block/design`, `/block/style`, `/blocks`, `/malla/design`. Cada pantalla utiliza `TwoPaneLayout` para separar contenido principal y acciones/contexto.【F:src/App.tsx†L1044-L1089】【F:src/layout/TwoPaneLayout.tsx†L1-L120】
- Persistencia desacoplada mediante `PersistenceService`, que integra autosave, repositorio de proyectos y repositorio de bloques con normalización de metadatos.【F:src/core/persistence/PersistenceService.ts†L1-L200】【F:src/utils/block-repo.ts†L1-L160】

Para una explicación detallada revisa [architecture.md](architecture.md).

## Requisitos
- Node.js ≥ 22.6.0 (verificado en `package.json`).【F:package.json†L12-L14】
- npm (incluido con Node).

## Instalación y ejecución
```bash
git clone https://github.com/jejimenezc/MallaVisual.git
cd MallaVisual
npm install
```

### Desarrollo
```bash
npm run dev
```
La aplicación se sirve en modo Vite con recarga en caliente.

### Build de producción
```bash
npm run build
```
Genera artefactos optimizados en `dist/` listos para despliegue.

### Vista previa del build
```bash
npm run preview
```
Sirve el contenido de `dist/` en un servidor local para validaciones finales.

## Scripts disponibles
| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR. |
| `npm run build` | Compilación de producción. |
| `npm run preview` | Vista previa del build. |
| `npm run lint` | Linter ESLint sobre todo el proyecto. |
| `npm run lint:ts` | Linter específico para archivos TypeScript/TSX. |
| `npm run test` | Suite de pruebas unitarias con Vitest. |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run typecheck` | Verificación estricta de tipos (`tsc --noEmit`). |【F:package.json†L8-L29】


## Checklist de release local
Antes de considerar una iteracion como lista para release local:
1. Ejecuta `npm run lint`.
2. Ejecuta `npm run typecheck`.
3. Ejecuta `npm test`.
4. Ejecuta `npm run build`.
5. Haz un smoke test manual de Home ? Block Editor ? Malla Editor ? Viewer.
6. Si el cambio toca import/export, snapshot o publicacion, valida tambien esos flujos manualmente.

## Estructura de carpetas
```
src/
  components/      # UI reutilizable (grids, formularios, cromado, snapshots)
  screens/         # Pantallas orquestadoras (Home, BlockEditor, BlockRepository, MallaEditor)
  core/            # Servicios y hooks de persistencia
  state/           # Context providers (undo/redo, guards, layout)
  layout/          # Contenedores comunes (TwoPaneLayout)
  utils/           # Lógica pura (import/export, sincronización, cálculos)
  styles/          # CSS global y tokens
  types/           # Tipos compartidos del dominio curricular
```
La distribución completa se describe en [architecture.md](architecture.md) y en [Design Notes.md](Design%20Notes.md) para decisiones UI específicas.

## Persistencia y datos
- **Proyectos**: se guardan en LocalStorage (identificador, nombre, timestamp). `HomeScreen` lista los últimos 10 y `GlobalMenuBar` los expone bajo “Archivo → Recientes”.【F:src/utils/master-repo.ts†L60-L140】【F:src/components/GlobalMenuBar/GlobalMenuBar.tsx†L1-L200】
- **Autosave**: `PersistenceService.autoSave` guarda con debounce borradores del proyecto activo y actualiza el estado mostrado por la StatusBar.【F:src/core/persistence/PersistenceService.ts†L35-L120】【F:src/components/StatusBar/StatusBar.tsx†L15-L70】
- **Repositorio de bloques**: `block-repo` almacena `StoredBlock` con metadatos normalizados (`projectId`, `uuid`, `name`, `updatedAt`). Los eventos `block-repo-updated` mantienen sincronizadas las pantallas sin prop drilling.【F:src/utils/block-repo.ts†L1-L160】【F:src/App.tsx†L247-L310】
- **Exportación/importación**: `block-io.ts` y `malla-io.ts` serializan los esquemas `BlockExport` y `MallaExport` (versión 4) asegurando compatibilidad con repositorios legados y remapeo de piezas al importar.【F:src/utils/block-io.ts†L1-L200】【F:src/utils/malla-io.ts†L1-L200】

## Terminología oficial
La terminología del dominio (Bloque maestro, Pieza referenciada, Snapshot, Macro-grilla, etc.) se mantiene en [GLOSSARY.md](GLOSSARY.md). Todos los commits, issues y documentación deben respetar este glosario.

## Estado actual y roadmap
- ✅ Base técnica con React 19 + Vite + TypeScript.
- ✅ Editor de bloque funcional con panel contextual y estilos visuales.
- ✅ Repositorio local de bloques con import/export.
- ✅ Editor de malla con historial, zoom y sincronización maestro↔pieza.
- ✅ Gestión de proyectos con autosave, exportación e importación.
- 🔄 Pendiente: paletas de color por proyecto, mejoras de accesibilidad de menús, indicadores visuales para piezas referenciadas vs snapshots.【F:'Design Notes.md'†L120-L180】

## Documentación relacionada
- [architecture.md](architecture.md): arquitectura técnica detallada.
- [Design Notes.md](Design%20Notes.md): decisiones UI/UX y roadmap corto.
- [docs/roadmap-operativo.md](docs/roadmap-operativo.md): roadmap operativo, protocolo por fases y seguimiento de PRs.
- [CHANGELOG.md](CHANGELOG.md): evolución histórica del proyecto.
- [GLOSSARY.md](GLOSSARY.md): terminología oficial.
- [Working Agreement.md](Working%20Agreement.md): acuerdos de colaboración (si aplica).

## Contribuciones
1. Revisa el glosario y documentación antes de proponer cambios.
2. Abre un issue describiendo el problema o funcionalidad deseada.
3. Usa Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
4. Incluye pruebas y actualiza documentación relevante al enviar un PR.

Para consultas con IA, recuerda la instrucción: “Usa la terminología definida en GLOSSARY.md”.
