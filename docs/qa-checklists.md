# Checklist QA por Screen

## Release local minima
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Smoke test manual de Home ? Block Editor ? Malla Editor ? Viewer
- Validar import/export si el PR toca contratos de datos, snapshot o publicación
- Revisar textos visibles modificados si el PR toca copy/UI en español
- Confirmar que el roadmap operativo y docs asociadas quedaron actualizados cuando aplica


## Regresión global (alertas/confirmaciones)
- ConfirmProvider renderiza el modal de confirmación ante cualquier llamada a `confirmAsync` sin recurrir a APIs nativas.
- `promptAsync` abre el prompt modal y normaliza valores vacíos como cancelación.
- Uso de `useToast` sigue mostrando feedback informativo sin bloquear la interacción.
- No se registran advertencias en consola sobre confirmaciones fuera del provider.

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
- Creación de proyecto nuevo mediante modal propio validando nombre no vacío.
