# PR a main: cierre de Fase 0

## Base de comparación

- Rama objetivo: `main`
- Alcance: integración completa de la **Fase 0 - Cierre de deuda de release local**
- Hito alcanzado: **"producto local maduro"** según [roadmap-operativo.md](C:/Users/jjimenezc/mallas-app2/docs/roadmap-operativo.md)

## Resumen

Este PR consolida en `main` el trabajo completo de la Fase 0. El objetivo de la fase fue pasar de un producto local sólido, pero todavía no suficientemente endurecido, a una base local madura para seguir avanzando hacia publicación externa.

En términos prácticos, la fase cerró cuatro frentes:

- higiene técnica y criterio de release local (`lint`, `typecheck`, `test`, CI y checklist),
- desacople estructural de `App` y pantallas críticas,
- corrección de inconsistencias funcionales detectadas durante la review de esos refactors,
- unificación de algunos flujos UX base del editor y del viewer para dejar menos deuda antes de entrar a Fase 1.

La integración en `main` no introduce una sola feature grande aislada; integra un conjunto de PRs pequeños ya validados que, en conjunto, dejan el proyecto en un estado más estable, mantenible y predecible para seguir con endurecimiento de publicación externa.

## Cambios clave

- Repo alineado con estándar de release local:
  - `lint` sin errores,
  - `typecheck` verde,
  - `test` verde,
  - CI actualizada para incluir `lint`.

- Desacople estructural de zonas críticas:
  - extracción de workflows desde `App`,
  - extracción del historial del editor de bloques,
  - extracción de lógica relevante de `MallaViewerScreen`,
  - extracción progresiva del subsistema de bandas, encabezados y métricas en `MallaEditorScreen`.

- Correcciones funcionales sobre viewer/publicación:
  - entradas consistentes a `Modo Presentación` y `Modo Documento`,
  - fuente activa correcta al exportar/publicar documento desde una publicación abierta,
  - configuración documental de publicaciones externas separada del proyecto activo,
  - panel lateral del viewer con overflow usable y menos ruido visual,
  - publicaciones externas con panel lateral retraído por defecto.

- Correcciones funcionales sobre bloques y pseudoproyectos:
  - reapertura de pseudoproyectos de bloque en el editor correcto,
  - persistencia del nombre local en bloques no publicados,
  - alineación entre nombre importado, renombre local y navegación posterior.

- Mejoras del subsistema de bandas:
  - duplicación de métricas sin romper referencias internas,
  - placeholders excluidos de salidas publicadas,
  - encabezados largos sincronizados entre viewer y documento con expansión controlada,
  - toggle ver/ocultar por fila en métricas.

- UX base más consistente:
  - migración de prompts/confirmaciones nativas en `HomeScreen`,
  - checklist de QA y release local endurecidos,
  - template de PR alineado con el estándar real de validación.

## Evidencia UI

Sugerencia para adjuntar en el PR:

- Captura del viewer con publicación externa y panel lateral retraído por defecto.
- Captura del panel lateral con overflow vertical limpio e indicadores de desplazamiento.
- Captura o GIF corto de encabezados largos en viewer/documento mostrando expansión controlada.

## Pruebas realizadas

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] Navegación `Home -> Block Editor -> Malla Editor`
- [x] Persistencia: abrir/guardar JSON, cambiar de proyecto, rehidratar y volver a editor/malla
- [x] Flujos de viewer/publicación en `Modo Presentación` y `Modo Documento`
- [x] Pseudoproyectos de bloque: reapertura desde recientes y rehidratación
- [x] Bandas de encabezados y métricas: edición, duplicación, ocultar/mostrar, publicación
- [x] Confirmaciones y prompts migrados en `HomeScreen`
- [x] Sin regresiones funcionales relevantes detectadas en la review acumulada de la fase

## Impacto en datos

- [x] Cambia comportamiento de serialización y normalización en áreas acotadas, con compatibilidad mantenida

Notas:

- Se añadieron o ajustaron campos y reglas compatibles en flujos asociados a `metaPanel`, publicaciones y pseudoproyectos.
- Las filas ocultas de métricas ya no forman parte de la salida publicada.
- Los placeholders editoriales de encabezados y métricas ya no se exportan como contenido final.
- No se definió en esta fase un contrato nuevo de publicación incompatible; ese trabajo queda para Fase 1.

## Riesgos y mitigación

Riesgos:

- El PR integra varias PRs pequeñas ya validadas, por lo que el riesgo principal no es una pieza individual sino la suma del cambio acumulado sobre `App`, viewer, bandas y publicación.
- La mayor sensibilidad está en flujos de navegación entre bloque, malla, viewer y publicaciones externas.
- También conviene revisar visualmente viewer/documento por los ajustes en panel lateral, encabezados largos y bandas visibles.

Mitigación:

- La fase se ejecutó en PRs chicas y con validación intermedia.
- Cada recorte relevante pasó por `lint`, `typecheck`, `test` y validación manual focalizada.
- El roadmap operativo registra cierres parciales y follow-ups explícitos para no mezclar deudas pendientes con este merge.

Rollback:

- `git revert <sha>` sobre el merge commit del PR a `main`, o rollback selectivo por commits de Fase 0 si se detecta una regresión localizada.

## Checklist de calidad

- [x] CI verde (`lint`, `build`, `typecheck`, `tests`)
- [x] Lint sin errores
- [x] Docs/README actualizados donde aplicaba
- [x] Sin secretos en diff
- [x] Accesibilidad básica revisada en los cambios de UI tocados durante la fase

## Áreas impactadas

- [src/App.tsx](C:/Users/jjimenezc/mallas-app2/src/App.tsx)
- [src/screens/BlockEditorScreen.tsx](C:/Users/jjimenezc/mallas-app2/src/screens/BlockEditorScreen.tsx)
- [src/screens/MallaEditorScreen.tsx](C:/Users/jjimenezc/mallas-app2/src/screens/MallaEditorScreen.tsx)
- [src/screens/MallaViewerScreen.tsx](C:/Users/jjimenezc/mallas-app2/src/screens/MallaViewerScreen.tsx)
- [src/screens/HomeScreen.tsx](C:/Users/jjimenezc/mallas-app2/src/screens/HomeScreen.tsx)
- [src/state/](C:/Users/jjimenezc/mallas-app2/src/state)
- [src/utils/](C:/Users/jjimenezc/mallas-app2/src/utils)
- [docs/roadmap-operativo.md](C:/Users/jjimenezc/mallas-app2/docs/roadmap-operativo.md)
- [docs/qa-checklists.md](C:/Users/jjimenezc/mallas-app2/docs/qa-checklists.md)
- [README.md](C:/Users/jjimenezc/mallas-app2/README.md)
- [.github/workflows/ci.yml](C:/Users/jjimenezc/mallas-app2/.github/workflows/ci.yml)
- [.github/pull_request_template.md](C:/Users/jjimenezc/mallas-app2/.github/pull_request_template.md)

## Texto breve sugerido para la descripción del PR

Este PR lleva a `main` el cierre completo de la Fase 0 del roadmap. La integración consolida el endurecimiento del release local (`lint`, `typecheck`, `test`, CI y checklist), el desacople principal de `App` y pantallas críticas, una serie de fixes funcionales en viewer/publicación, y mejoras de consistencia UX en bloques, bandas y confirmaciones base.

- Repo alineado con estándar de release local y CI endurecida con `lint`.
- `App`, `MallaViewerScreen`, `MallaEditorScreen` y `BlockEditorScreen` con mejor separación de responsabilidades.
- Viewer/publicación estabilizados para publicaciones externas y salidas documentales.
- Bandas de encabezados/métricas más robustas en editor y publicación.
- `HomeScreen` sin prompts nativos en los flujos principales de renombrado/eliminación.

Validación sugerida: `npm run lint`, `npm run typecheck`, `npm test` y smoke test manual sobre bloque -> malla -> viewer/publicación.
