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

## Propuesta panel de formato (vista)

### Objetivos
- Clarificar qué opciones afectan al bloque completo vs. controles específicos.
- Mejorar el espaciado, alineación y lectura de íconos, selectores y toggles.
- Optimizar el uso del espacio vertical/horizontal conservando la jerarquía visual.
- Preparar espacio para futuras funciones (p. ej., paletas de color por proyecto).

### Organización recomendada del panel
1. **Cabecera del panel**
   - Título "Formato de bloque" con icono de pincel.
   - Acción secundaria (icono de información) para abrir la guía rápida de estilos.
2. **Sección A — Ajustes globales (bloque completo)**
   - Subtítulo con etiqueta "General".
   - Control: `Relación de aspecto` (dropdown + ícono de bloque) con ayuda contextual (tooltip).
3. **Sección B — Ajustes comunes a todos los controles**
   - Subtítulo "Estilos base".
   - Disposición en dos columnas responsivas (≥320px) con microgrid de 8px entre items.
   - Controles:
     - `Color de fondo`: chip actual + botón "Editar" que abre un popover con selector RGB/HEX.
     - `Alineación`: dropdown con íconos de alineación (left/center/right/justify) dispuestos verticalmente.
     - `Borde visible`: toggle switch alineado a la derecha con etiqueta compacta.
     - `Tamaño de fuente`, `Relleno horizontal`, `Relleno vertical`: botones con valor actual; al pulsar abren slider vertical flotante pegado al borde derecho del panel (popover de 200px de alto, control granular + input numérico).
       - Mostrar hint "Ctrl+arriba/abajo" para ajustes rápidos.
4. **Sección C — Opciones específicas por tipo de control**
   - Subtítulo "Personalización por control" y tabs compactas para navegar tipos (`Checkbox`, `Texto libre`, otros futuros).
   - Contenido del tab `Checkbox`:
     - `Color al marcar`: fila con toggle (activar/desactivar color personalizado) + botón que abre selector de color con estados (normal/hover).
   - Contenido del tab `Texto libre`:
     - `Color según select`: dropdown con etiquetas descriptivas (p. ej., Primario, Secundario, Énfasis) y preview del color.
   - Incluir mensaje vacío para otros tipos: "Este control no requiere opciones adicionales".
5. **Sección D — Herramientas complementarias**
   - Nuevo toggle placeholder "Paleta de color por proyecto" (inactivo). Mostrar leyenda "Próximamente" y breve descripción: "Centraliza colores aprobados para mantener consistencia".

### Comportamiento de sliders verticales emergentes
- Activador: botón chip que muestra el valor actual en px.
- Aparición: popover alineado con el activador, cierre al perder foco o confirmar.
- Elementos internos: slider vertical de 0–100px, input numérico, preset rápidos (p. ej., 0, 4, 8, 16, 24).
- Accesibilidad: soporte para teclado (flechas, PgUp/PgDn) y lector de pantalla (aria-valuenow, aria-orientation="vertical").

### Estilo visual y spacing
- Grid base de 4px; secciones separadas por 16px y líneas divisoras sutiles (color `var(--divider)` con 30% de opacidad).
- Íconos alineados mediante flex containers, con labels de 12px en mayúsculas suaves.
- Checkbox y toggles con alineación vertical centrada respecto al texto.
- Tooltips con delay de 300ms para evitar ruido.

### Consideraciones de implementación de la propuesta panel de formato (vista)
- Reutilizar componentes existentes (`ColorPickerPopover`, `Slider`, `Toggle`) encapsulados en un `FormatSection` que acepte título y descripción opcional.
- Definir constantes de mapeo (p. ej., `GLOBAL_CONTROLS`, `CONTROL_TYPE_CONTROLS`) para alimentar el renderizado condicional.
- Preparar hook `useFormatTabs` para manejar estado del tab activo sin re-montar controles.
- Anticipar futura activación del toggle de paleta: reservar espacio para enlace "Gestionar paletas" dentro del popover.
- Validar que los sliders emergentes no interfieran con scroll: usar `Portal` y backdrop clicable opcional.

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