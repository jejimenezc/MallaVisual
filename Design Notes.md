Este documento resume decisiones de diseño y criterios operativos de la UI/UX.

## Capas
- **Modelo**: bloque lógico (10×10, tipos de celdas, fusiones), malla (macro-grilla).
- **Vista**: render del grid/bloques y macro-grilla.
- **Control**: panel contextual, menús, NavTabs y botón “→ Malla”.

## Estados
- Proyecto actual y Recientes (LocalStorage).
- Bloque maestro, pieza referenciada, snapshot.
- Selección de celdas, rangos, y fusiones visuales.

## Decisiones (ADRs cortas)
1. **Edición efímera + Actualizar repositorio**: se edita en memoria; al actualizar se **sobrescribe** el maestro y se propagan cambios a piezas referenciadas.
2. **Un solo guard de navegación**: NavTabs y “→ Malla” comparten el mismo flujo de confirmación si hay cambios no guardados.
3. **StatusBar con 3 slots**: contexto (izq.), breadcrumbs (centro), acciones rápidas (der.).
4. **Atajos de teclado**: `?` abre ayuda; `Ctrl+Shift+H` toggléa el AppHeader.

## Roadmap corto UI/UX
- Selección estilo Excel (arrastre, Shift+flechas).
- Combinar/Separar desde menú contextual y panel reutilizable.
- Indicadores para pieza referenciada vs snapshot.

## Modelo lógico vs visual (separados):
BlockTemplateCell: estado lógico (active, type, label, mergedWith…).
VisualTemplate: estilos de vista por baseKey (backgroundColor, textAlign, border, fontSizePx, paddingX/Y).

## Selección/activación (modo edición):
- Un clic alterna active; selección por arrastre independiente de active.
- Combinar: activa todas las celdas del grupo; máx. 1 celda configurada (hint en sidebar si se infringe).
- Merges (edición/vista):
  - La base expande con gridRow/gridColumn; miembros invisibles en edición, no renderizados en vista.
  - Posición de TODAS las celdas anclada (gridRow/Column = row+1/col+1) para evitar autoflow.
- Borrar control (bug fix):
  - Al borrar type, se ignoran actualizaciones en cleanup de forms (set ignoreUpdatesRef) y se limpian label/placeholder/dropdownOptions.
- Texto estático (UX):
  - Se renderiza contenido real dentro de .cell-content.
- En vista, textAlign, fontSizePx, paddingX/Y aplican solo a .cell-content (no al contenedor).
- Fallback de fondo en vista: blanco si celda activa sin backgroundColor visual.
- Paleta de formato:
  - fontSizePx (prioriza sobre enum legacy) y paddingX/Y controlados desde FormatStylePanel.

## Repaso de características funcionales importantes:

⚙️ Características funcionales
- Arquitectura modular — Separación clara entre: Componentes base de la grilla y celdas.
- Formularios de configuración para diferentes tipos de entrada.
- Paneles de interfaz y menús contextuales.
- Pantallas (screens) que orquestan componentes y layouts.
- Editor de bloque curricular (10x10):
  - Permite seleccionar celdas y definir tipo de entrada (texto estático, texto libre, checkbox, lista desplegable).
  - Admite fusión y separación de celdas mediante el CellContextMenu y el panel contextual.
  - Muestra símbolos visuales para identificar tipo de contenido.
- Panel lateral contextual reutilizable — Inicialmente para “combinar” y “separar” celdas, con potencial para configuraciones avanzadas.
- Formularios dinámicos — Configuración en tiempo real:
  - TextConfigForm y StaticTextConfigForm permiten etiquetas sin botón guardar.
  - Sincronización visual inmediata con la grilla.
- Layout en dos paneles (TwoPaneLayout) — Mantiene la zona de trabajo y un área fija para opciones y configuración.
- Soporte para vista no editable — BlockTemplateViewer permite mostrar un bloque sin funciones de edición.