# Changelog

Todas las novedades relevantes del proyecto se documentan aquí siguiendo orden cronológico inverso.

## [Unreleased]
- _(sin cambios registrados)_

## [0.1.0] - 2025-10-31
### Added
- Shell completo de la aplicación (`AppLayout`) con cabecera, barra de menús, tabs y barra de estado conectada al autosave.【F:src/App.tsx†L209-L310】【F:src/components/StatusBar/StatusBar.tsx†L1-L120】
- Proveedores de estado global (`AppCommandsProvider`, `ProceedToMallaProvider`, `UILayoutProvider`) para undo/redo, guards de navegación y visibilidad de cromado.【F:src/state/app-commands.tsx†L1-L73】【F:src/state/proceed-to-malla.tsx†L1-L120】【F:src/state/ui-layout.tsx†L1-L70】
- Flujo completo de proyectos con persistencia local (`PersistenceService`), autosave con debounce y exportación/importación de mallas o bloques individuales.【F:src/core/persistence/PersistenceService.ts†L1-L200】【F:src/utils/project-file.ts†L1-L60】
- Editor de bloques 10×10 con soporte de fusiones, menú contextual por celda, formularios específicos por tipo de control y panel de estilos visuales reutilizable.【F:src/components/BlockTemplateEditor.tsx†L1-L200】【F:src/components/FormatStylePanel.tsx†L1-L200】
- Biblioteca local de bloques (`BlockRepositoryScreen`) con importación/exportación, renombrado, apertura directa en el editor y sincronización con el repositorio del proyecto.【F:src/screens/BlockRepositoryScreen.tsx†L1-L200】
- Editor de malla curricular con piezas referenciadas o snapshot, historial undo/redo, zoom continuo y sincronización con maestros publicados.【F:src/screens/MallaEditorScreen.tsx†L360-L460】【F:src/utils/malla-sync.ts†L1-L89】
- Introducción guiada (`IntroOverlay`), botón rápido hacia la malla desde la barra de estado y atajos globales para mostrar/ocultar interfaz.【F:src/components/IntroOverlay.tsx†L1-L160】【F:src/components/StatusBar/StatusBar.tsx†L15-L70】

### Changed
- Normalización del repositorio de bloques y proyectos para garantizar metadatos consistentes (`BlockMetadata`, `ProjectRepository`).【F:src/utils/block-repo.ts†L1-L160】【F:src/utils/master-repo.ts†L60-L140】
- Migración de esquemas `BlockExport`/`MallaExport` para conservar identificadores y permitir sincronizar piezas en importaciones legadas.【F:src/utils/malla-io.ts†L1-L200】

## Historial temprano
La reconstrucción inicial del proyecto se resume en estos hitos:
1. Configuración de `TemplateCell`.
2. Configuración de `TemplateGrid` a partir de `TemplateCell`.
3. Separación de modo edición y modo vista.
4. En modo edición se define la estructura de un bloque curricular (10×10 celdas).
5. En modo vista se define el formato de las celdas activas del bloque curricular.
6. Actualización del esquema de malla a la versión 4 para conservar metadatos en exportaciones/importaciones.