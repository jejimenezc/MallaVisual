# Checklist QA por Screen

## BlockRepositoryScreen
- Importación de bloque desde archivo JSON con nombre inferido.
- Prevención de eliminación cuando el bloque está en uso en la malla (mensaje de error).
- Confirmación destructiva antes de eliminar bloque no usado.
- Renombrado de bloque con validación de nombre vacío.
- Exportación del bloque seleccionado mantiene el nombre propuesto.

## HomeScreen
- Apertura de selector de archivo para cargar proyecto.
- Manejo de archivo inválido mostrando notificación de error.
- Renombrado de proyecto con propagación a la lista.
- Eliminación de proyecto distinto al actual.
- Apertura de proyecto existente desde la tabla de recientes.