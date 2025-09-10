## Resumen
<!-- Explica el problema y la solución propuesta, con contexto. -->

## Cambios clave
- [ ] (Breve lista de cambios funcionales y técnicos)

## Evidencia UI
<!-- Adjunta 1-3 capturas o GIFs: antes/después -->

## Pruebas realizadas
- [ ] Navegación Home → Block Editor → Malla Editor
- [ ] Persistencia: guardar JSON, recargar, editar bloque, volver a Malla
- [ ] Tipos de entrada: texto/checkbox/select (vista + edición)
- [ ] Combinar/Separar celdas sin pérdidas
- [ ] Sin errores/warnings relevantes en consola
- [ ] Responsive básico (desktop/tablet)

## Impacto en datos
- [ ] No cambia el formato de export/import
- [ ] Cambia el formato (especifica migración/notas)

## Riesgos y mitigación
- Riesgos:
- Rollback: `git revert <sha>` / tag previo: `vX.Y.Z`

## Checklist de calidad
- [ ] CI verde (build, typecheck, tests)
- [ ] Lint sin errores
- [ ] Docs/README/CHANGELOG actualizados si aplica
- [ ] Sin secretos en diff
- [ ] Accesibilidad básica (labels, focus)
