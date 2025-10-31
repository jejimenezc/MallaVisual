Este documento resume decisiones de diseño y criterios operativos de la UI/UX de la aplicación.

## Visión general de capas
- **Modelo**: bloque lógico (10×10, tipos de celdas, fusiones), estilos visuales (`VisualTemplate`) y malla curricular con piezas referenciadas o snapshots.【F:src/types/curricular.ts†L1-L120】【F:src/types/visual.ts†L1-L34】
- **Vista**: componentes reutilizables (`TemplateGrid`, `BlockSnapshot`, `ActionPillButton`) y layouts a dos paneles para mantener consistencia entre pantallas.【F:src/components/TemplateGrid.tsx†L1-L200】【F:src/components/BlockSnapshot.tsx†L1-L200】【F:src/layout/TwoPaneLayout.tsx†L1-L120】
- **Control**: cromado global (AppHeader, GlobalMenuBar, NavTabs, StatusBar) más paneles contextuales y menús flotantes que operan sobre la selección activa.【F:src/App.tsx†L209-L310】【F:src/components/GlobalMenuBar/GlobalMenuBar.tsx†L1-L200】【F:src/components/StatusBar/StatusBar.tsx†L1-L120】

## Cromado global y navegación
- El cromado se puede ocultar/mostrar desde la barra de estado para maximizar el espacio de trabajo en monitores pequeños. El estado se persiste en LocalStorage (`ui.showHeader`).【F:src/components/StatusBar/StatusBar.tsx†L15-L70】【F:src/state/ui-layout.tsx†L1-L70】
- `NavTabs` y el botón rápido “Ir a Malla” comparten el guard provisto por `ProceedToMallaProvider`, evitando pérdidas accidentales al cambiar de modo.【F:src/components/NavTabs.tsx†L1-L160】【F:src/state/proceed-to-malla.tsx†L12-L120】
- El menú global replica convenciones de apps de escritorio: `Archivo`, `Proyecto`, `Biblioteca`, `Editar`, etc. Incluye accesos a undo/redo conectados al `AppCommandsProvider` y listados dinámicos de proyectos recientes.【F:src/components/GlobalMenuBar/GlobalMenuBar.tsx†L1-L200】

## Home y gestión de proyectos
- `HomeScreen` presenta dos columnas: recientes (izquierda) y acciones rápidas (derecha). Se prioriza el acceso a proyectos persistidos y a importaciones desde JSON, manteniendo botones grandes y descriptivos.【F:src/screens/HomeScreen.tsx†L1-L160】
- Importar un archivo intenta primero parsear una malla y, si falla, un bloque individual. Esto permite reutilizar la misma interacción para ambos flujos sin confundir al usuario.【F:src/utils/project-file.ts†L1-L60】
- Tras abrir un proyecto, el guardado automático se activa de inmediato y el nombre del proyecto se muestra en la barra de estado.

## Editor de bloques
- El grid de 10×10 soporta selección por arrastre, click extendido y menú contextual con acciones de tipo de entrada (`staticText`, `text`, `checkbox`, `select`, `number`, `calculated`).【F:src/components/BlockTemplateEditor.tsx†L1-L200】
- Combinar celdas requiere que como máximo una celda esté configurada; se alerta si la selección viola la regla. Separar elimina `mergedWith` tanto en la selección como en miembros dependientes.
- Al borrar un tipo, se limpian propiedades dependientes (placeholders, opciones, expresiones) y se usa `ignoreUpdatesRef` para evitar sobrescrituras de los formularios durante el ciclo de desmontaje.【F:src/components/BlockTemplateEditor.tsx†L60-L140】
- El panel lateral (`ContextSidebarPanel`) refleja la selección actual y muestra formularios específicos (texto libre, texto estático, numérico, select, checkbox, calculado). Los formularios escriben directamente sobre el template activo mediante `onUpdateCell` controlado.【F:src/components/ContextSidebarPanel.tsx†L1-L200】
- El `FormatStylePanel` agrupa ajustes visuales globales (color de fondo, alineación, borde, font size granular y paddings) en secciones colapsables para reservar espacio a futuras funciones como paletas por proyecto.【F:src/components/FormatStylePanel.tsx†L1-L200】
- La publicación al repositorio crea/actualiza metadatos (`BlockMetadata`) y sincroniza el borrador con la versión publicada para evitar falsos positivos de dirty state.【F:src/App.tsx†L680-L780】

## Editor de malla
- Antes de ingresar a la malla, el bloque maestro se recorta a los límites activos y se expande a fusiones completas (`getActiveBounds`, `expandBoundsToMerges`) para garantizar consistencia visual entre maestro y piezas.【F:src/utils/block-active.ts†L1-L160】【F:src/screens/MallaEditorScreen.tsx†L1-L120】
- Las piezas referenciadas (`CurricularPieceRef`) mantienen un vínculo vivo con el maestro y se actualizan cuando se publica una nueva versión; los snapshots (`CurricularPieceSnapshot`) guardan una copia y opcionalmente recuerdan su origen para “descongelar” en el futuro.【F:src/types/curricular.ts†L52-L110】【F:src/utils/malla-sync.ts†L1-L89】
- El panel lateral de maestros muestra todos los bloques publicados ordenados alfabéticamente, permitiendo arrastrar nuevos ejemplares hacia la grilla o crear piezas flotantes que aún no tienen posición.【F:src/screens/MallaEditorScreen.tsx†L200-L360】
- Historial de acciones: cada mutación relevante (agregar pieza, mover, cambiar tamaño de grilla, convertir a snapshot) se captura en `historyRef`; undo/redo se expone vía `useAppCommand` y atajos `Ctrl+Z`, `Ctrl+Shift+Z` / `Ctrl+Y`.【F:src/screens/MallaEditorScreen.tsx†L360-L460】
- Zoom continuo (0.5×–2×) afecta tanto la grilla como el tablero de piezas libres; se limita para evitar distorsiones y se almacena en estado local del componente.【F:src/screens/MallaEditorScreen.tsx†L120-L200】
- Autosave específico (`storageKey: 'malla-editor-state'`) guarda borradores aunque el usuario no haya creado un proyecto persistente. Al publicar un nuevo maestro, `prepareMallaProjectState` remapea piezas y valores a los nuevos IDs.【F:src/screens/MallaEditorScreen.tsx†L200-L360】【F:src/App.tsx†L63-L198】

## Gestión del repositorio de bloques
- `BlockRepositoryScreen` funciona como biblioteca visual: cada bloque se muestra con `BlockSnapshot` (aspecto proporcional + paddings). Las acciones principales (importar, exportar, renombrar, abrir, eliminar) viven en el panel derecho para mantener consistencia con el layout a dos columnas.【F:src/screens/BlockRepositoryScreen.tsx†L1-L200】
- Importar genera un nuevo UUID si el archivo ya existe en el repositorio, evitando colisiones y preservando la procedencia (`projectId`).【F:src/screens/BlockRepositoryScreen.tsx†L40-L120】
- El repositorio despacha eventos `block-repo-updated` para que editor, malla y menú global se mantengan sincronizados sin necesidad de prop drilling.【F:src/utils/block-repo.ts†L108-L160】【F:src/App.tsx†L247-L310】

## Estados y persistencia
- **Proyecto actual y recientes**: `PersistenceService` guarda proyectos identificados (`projectId`, `projectName`). El último proyecto abierto se recuerda mediante `ACTIVE_PROJECT_ID_STORAGE_KEY` y se restablece al hidratar la app.【F:src/App.tsx†L32-L120】【F:src/core/persistence/PersistenceService.ts†L1-L120】
- **Repositorio de maestros**: se guarda en LocalStorage bajo `block-repo` con payload normalizado (`StoredBlock`). Mallas importadas se sincronizan con el repositorio para remapear piezas y valores automáticamente.【F:src/utils/block-repo.ts†L1-L160】【F:src/utils/malla-sync.ts†L1-L89】
- **Autosave**: tanto el editor de bloque como el de malla usan `useProject` para guardar borradores con debounce. El estado se refleja en la barra de estado (“Guardando…”, “Error al guardar”).【F:src/core/persistence/hooks.ts†L1-L50】【F:src/components/StatusBar/StatusBar.tsx†L15-L70】

## Interacciones y accesibilidad
- Atajos globales: `Ctrl+Shift+H` alterna la cabecera; `?` abre la ayuda contextual (pendiente de implementar contenido). Undo/redo siguen las convenciones de escritorio (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y`).【F:src/components/StatusBar/StatusBar.tsx†L70-L90】【F:src/screens/MallaEditorScreen.tsx†L360-L420】
- Navegación con teclado: menús usan `event.stopPropagation()` para evitar cierres involuntarios y permiten recorrer elementos con flechas (pendiente de mejoras de accesibilidad ARIA).
- Feedback inmediato: acciones destructivas (eliminar bloque, descartar cambios) muestran `window.confirm`/`window.alert` para dejar claro el impacto.【F:src/screens/BlockRepositoryScreen.tsx†L120-L200】【F:src/state/proceed-to-malla.tsx†L24-L80】
- Tooltips y labels compactos mantienen contraste y legibilidad (12 px mínimo, uppercase suave) según la guía de spacing de 4 px.

## Roadmap corto UI/UX
- Completar selección estilo Excel (arrastre + Shift+flechas) en el editor de bloque.
- Integrar control granular de paletas por proyecto en el `FormatStylePanel` (toggle ya reservado en la UI).
- Añadir indicadores visibles para distinguir piezas referenciadas vs snapshots dentro de la malla.
- Mejorar accesibilidad de `GlobalMenuBar` con navegación por teclado y roles ARIA apropiados.
- Centralizar ayudas contextuales en un panel unificado accesible desde `?`.