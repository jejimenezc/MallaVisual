# Inventario de `window.alert` y `window.confirm`

| Archivo | Descripción | Criticidad | Notas de migración |
| --- | --- | --- | --- |
| `src/components/BlockTemplateEditor.tsx` | Bloquea la combinación de celdas cuando la selección incluye más de una celda ya configurada. | Validación/persistencia | Sustituir por mensaje contextual en el editor (toast o aviso inline) que explique por qué no se puede combinar. |
| `src/state/proceed-to-malla.tsx` | Al intentar ir al diseño de malla sin bloques publicados, muestra alerta informativa y detiene la navegación. | Navegación | Reemplazar por diálogo/modal de guardado que permita publicar directamente o cancelar. |
| `src/state/proceed-to-malla.tsx` | Confirma si se debe publicar o actualizar el bloque antes de navegar cuando hay cambios pendientes. | Navegación | Unificar con flujo de guardado: modal con opciones "Publicar ahora"/"Seguir editando" evitando `window.confirm`. |
| `src/screens/BlockRepositoryScreen.tsx` | Solicita confirmación antes de eliminar un bloque del repositorio. | Acción destructiva | Usar modal de confirmación consistente con el resto de la app, mostrando impacto y nombre del bloque. |
| `src/screens/MallaEditorScreen.tsx` | Alertas que impiden eliminar filas, reducir filas/columnas o agregar piezas cuando hay piezas que bloquean la acción. | Validación/persistencia | Cambiar por avisos inline/toast cerca del control que inició la acción indicando qué pieza bloquea. |
| `src/screens/MallaEditorScreen.tsx` | Al limpiar la malla confirma el borrado total de piezas y datos asociados. | Acción destructiva | Modal de confirmación con resumen del impacto y opción de respaldo antes de borrar. |
| `src/screens/MallaEditorScreen.tsx` | Al duplicar o soltar piezas sin espacio disponible muestra alerta de falta de espacio. | Validación/persistencia | Mostrar aviso no disruptivo (toast) e indicar acciones sugeridas (agregar filas/columnas). |
| `src/screens/BlockEditorScreen.tsx` | Confirma eliminación o reemplazo de controles cuando hay datos en la malla que se perderían. | Acción destructiva | Modal con detalle del control y consecuencias; podría incluir enlace a vista previa de uso. |
| `src/screens/BlockEditorScreen.tsx` | Al guardar en repositorio un bloque en uso, confirma actualización que propagará cambios. | Acción destructiva | Integrar flujo de publicación con modal que explique que se actualizarán instancias en malla. |
| `src/screens/BlockEditorScreen.tsx` | Evita navegar al diseño de malla si el bloque está vacío y alerta al usuario. | Validación/persistencia | Mostrar aviso en la UI con CTA para crear contenido antes de permitir navegación. |
| `src/screens/BlockEditorScreen.tsx` | Confirma publicar/actualizar bloque antes de navegar al diseño de malla cuando hay cambios sin publicar. | Navegación | Usar diálogo de guardado con opciones claras (publicar, seguir editando) en lugar de `confirm`. |
| `src/App.tsx` | Confirma reemplazar o reiniciar el repositorio de bloques al importar/procesar archivos que sobreescriben datos existentes. | Acción destructiva | Modal de confirmación que resuma qué se eliminará y permita cancelar. |
| `src/App.tsx` | Al cerrar proyecto con cambios sin guardar en el bloque actual solicita confirmación para evitar pérdida. | Acción destructiva | Integrar aviso de cambios sin guardar en UI (banner) con opción de guardar antes de cerrar. |
| `src/App.tsx` | Al abrir bloque del repositorio con cambios locales pendientes confirma descarte de cambios. | Acción destructiva | Usar modal de "Descartar cambios" con posibilidad de guardar borrador antes de cargar otro bloque. |
| `src/App.tsx` y `src/screens/HomeScreen.tsx` | Alertas que indican que el archivo importado es inválido. | Información | Reemplazar por mensaje de error en la interfaz (toast o sección de errores) con detalle del problema si es posible. |

## Progreso de migración (fase 4)

- `src/components/BlockTemplateEditor.tsx`: validación de combinación ahora usa toast (`useToast`) en lugar de `window.alert`.
- `src/state/proceed-to-malla.tsx`: bloquea navegación con confirm modal (`confirmAsync` desde provider) y toast informativo cuando no hay bloques publicados.
- `src/App.tsx`: confirmaciones de repositorio, cierre de proyecto y apertura desde repositorio migradas a `confirmAsync`; flujo de importación espera manejadores async para evitar confirmaciones sincrónicas.