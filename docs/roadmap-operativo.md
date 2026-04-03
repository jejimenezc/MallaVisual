# Roadmap Operativo y Protocolo de PRs

Este documento es la fuente de verdad para ejecutar el roadmap del proyecto fase a fase y PR a PR. Su objetivo es mantener contexto compartido, evitar saltos de alcance y dejar evidencia minima suficiente para validar cada iteracion sin volver pesado el proceso.

## Estado actual

| Campo | Valor |
| --- | --- |
| Fase actual | Fase 0 - Cierre de deuda de release local |
| Hito actual | Alcanzar "producto local maduro" |
| Proximo PR recomendado | `PR-0.2f refactor: extraer logica de franjas, encabezados y metricas de MallaEditorScreen` |
| Seguimiento | Centralizado en este documento |
| Rigor | Moderado |

## Estados permitidos
- `planned`: PR identificado en el roadmap, aun no iniciado.
- `in-progress`: PR en ejecucion activa.
- `blocked`: PR detenido por una dependencia, decision o regresion.
- `review`: implementado y en validacion.
- `validated`: PR aceptado como cerrado para el roadmap.

## Hitos de aceptacion

| Hito | Criterio |
| --- | --- |
| Producto local maduro | Repo verde en `lint` + `test` + `typecheck`, UX base consistente y deuda de release local controlada. |
| Producto maduro y publicable | Ademas del hito anterior, accesibilidad minima defendible, pipeline de release coherente y contratos de publicacion estabilizados. |
| Listo para subir online | Persistencia remota preparada, separacion clara entre edicion/publicacion y operacion remota basica lista. |
| Publicado con colaboracion y persistencia online | Aplicacion desplegada con persistencia remota y colaboracion sobre entidades versionables estables. |

## Fases y PRs

### Fase 0 - Cierre de deuda de release local
Objetivo: pasar de producto local solido a producto local maduro.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-0.1 | validated | Dejar el repo verde en `lint`, `test` y `typecheck`. | Sin errores de lint y sin deuda obvia de higiene que bloquee release local. |
| PR-0.2a | validated | Reducir acoplamiento principal en `App` y `BlockEditorScreen`. | `App` y editor de bloques mas livianos, con hooks extraidos y review cerrada sin hallazgos bloqueantes del refactor. |
| PR-0.2-support | validated | Corregir bugs funcionales detectados en review que no provienen del refactor principal. | Nombres importados y estado de configuracion de viewer/publicacion alineados antes de retomar el desacople pendiente. |
| PR-0.2c | validated | Reabrir pseudoproyectos de bloque en el editor de bloques al abrirlos desde recientes. | Los bloques abiertos como proyecto liviano no deben quedar atrapados en una entrada inconsistente hacia la malla. |
| PR-0.2b | validated | Completar desacople pendiente en `App`, `MallaEditorScreen` y `MallaViewerScreen`. | Menor concentracion de logica restante en `App` y recorte adicional de pantallas criticas. |
| PR-0.2d | validated | Mejorar overflow vertical del panel lateral del viewer con scroll limpio e indicadores visuales. | Paneles laterales utilizables en pantallas medianas sin ensuciar la UI con una segunda barra intrusiva. |
| PR-0.2e | validated | Ocultar por defecto el panel Apariencia base al abrir publicaciones externas. | Las publicaciones abiertas en el viewer deben iniciar con menos confusion visual y con el panel bloqueado retraido. |
| PR-0.2f | review | Extraer logica de franjas, encabezados y metricas de `MallaEditorScreen`. | `MallaEditorScreen` mas corta y con una frontera clara para configuracion de bandas superiores, edicion de encabezados y wiring del meta-panel relacionado. |
| PR-0.3 | planned | Reemplazar prompts nativos y unificar confirmaciones. | UX base consistente para flujos de confirmacion y renombrado. |
| PR-0.4 | planned | Endurecer checklist de release local y CI. | `lint` incorporado al criterio de calidad y documentacion de release actualizada. |

**Hito desbloqueado al validar la fase:** "producto local maduro".

- Validado: 2026-04-01 - PR/commit: tests confirmados localmente tras `chore: prepare PR-0.1 lint cleanup` - Nota: desbloquea PR-0.2a.
- Validado: 2026-04-02 - PR/commit: `9fc0987`, `b962cfd`, `c18bb40`, `16b800c` - Nota: `PR-0.2a` cierra el desacople principal de `App` y `BlockEditorScreen`; quedan follow-ups funcionales chicos y un desacople pendiente como `PR-0.2b`.
- Review: 2026-04-02 - Resultado: `validated` - Evidencia: `lint`/`typecheck` ok, pruebas manuales satisfactorias sobre nombres importados, viewer/publicacion y renombre local; sin hallazgos bloqueantes restantes dentro del alcance del support.
- Validado: 2026-04-02 - PR/commit: `dcddc25` - Nota: `PR-0.2-support` corrige nombres importados, renombre local no publicado y alcance por proyecto de configuracion de viewer/publicacion; desbloquea `PR-0.2c`.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2c` - Nota: `PR-0.2c` corrige la reapertura de pseudoproyectos en editor de bloques y preserva el nombre local del bloque no publicado al cambiar de proyecto o rehidratar; desbloquea `PR-0.2b`.
- Validado: 2026-04-02 - PR/commit: `f39f938`, `6939621`, `966e131` + fixes de review sobre viewer/publicacion - Nota: `PR-0.2b` completa un nuevo recorte de desacople en `App`, `MallaViewerScreen` y `MallaEditorScreen`, y corrige la fuente activa de salida documental para publicaciones externas; desbloquea follow-ups de UX del viewer y definiciones de publicacion.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2d` - Nota: `PR-0.2d` habilita scroll vertical limpio en el panel lateral del viewer con indicadores interactivos; desbloquea `PR-0.2e`.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2e` - Nota: `PR-0.2e` retrae por defecto el panel lateral al abrir publicaciones externas y deja el viewer menos confuso desde el primer frame; desbloquea `PR-0.3`.

### Fase 1 - Endurecimiento de publicacion externa
Objetivo: pasar de maduro local a publicable externamente.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-1.1 | planned | Baseline de accesibilidad para menus, overlays y navegacion. | Navegacion por teclado y ARIA minima defendible. |
| PR-1.2 | planned | Mejorar senales visuales de piezas referenciadas vs snapshot. | Estado de piezas legible en UX normal. |
| PR-1.3 | planned | Ampliar cobertura de flujos de viewer y publicacion. | Regresiones importantes cubiertas por pruebas. |
| PR-1.4 | planned | Formalizar contrato estable de snapshot publicable. | Publicacion versionable y menos fragil ante cambios futuros. |
| PR-1.5 | planned | Definir perfil documental versionado para publicaciones y reglas de override local. | La publicacion debe poder expresar una salida documental canonica sin heredar configuraciones del proyecto activo. |
| PR-1.6 | planned | Definir politica de republicacion web/datos desde snapshot abierto en viewer. | Reglas claras sobre cuando un snapshot puede reutilizarse como fuente de salidas web/datos y como se comunica esa capacidad en UX. |

**Hito desbloqueado al validar la fase:** "producto maduro y publicable".

### Fase 2 - Preparacion para capa de dibujo
Objetivo: preparar la arquitectura de overlay sin implementar aun toda la UX.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-2.1 | planned | Introducir contrato geometrico publicado para viewer. | Geometria derivada del snapshot expuesta como contrato estable. |
| PR-2.2 | planned | Reservar esquema de overlay y conectores en snapshot publicado. | Entidad opcional serializable y versionable para dibujo. |
| PR-2.3 | planned | Habilitar render por capas en viewer y export. | Base + overlay preparadas para HTML, print y PDF. |
| PR-2.4 | planned | Definir estrategia de anchors por bloque publicado. | Origenes y destinos estables para conectores futuros. |

### Fase 3 - Capa de dibujo local sobre snapshot
Objetivo: implementar la feature compleja en el contexto correcto, aun local.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-3.1 | planned | Editor local de conectores sobre snapshot publicado. | Flechas editables en modo publicacion. |
| PR-3.2 | planned | Seleccion, edicion y eliminacion de conectores. | Operaciones basicas de overlay resueltas con UX estable. |
| PR-3.3 | planned | Incluir overlay en HTML, print y PDF como opcion. | Salidas con y sin capa de dibujo consistentes. |
| PR-3.4 | planned | Agregar regresiones geometricas y de export con overlay. | Validacion automatica y manual suficiente para la nueva capa. |

### Fase 4 - Preparacion para operacion online
Objetivo: separar el modelo local del futuro backend sin sumar aun colaboracion real.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-4.1 | planned | Separar repositorios local, publicacion y sesion editable. | Fronteras claras entre dominio editable y publicado. |
| PR-4.2 | planned | Abstraer persistencia mediante adapters. | Persistencia local y remota intercambiable por contrato. |
| PR-4.3 | planned | Definir modelo remoto de proyecto y publicacion. | Esquema remoto minimo para operar online. |
| PR-4.4 | planned | Bootstrap de despliegue y observabilidad basica. | Entorno inicial listo para operacion remota. |

**Hito desbloqueado al validar la fase:** "listo para subir online".

### Fase 5 - Online sin colaboracion en tiempo real
Objetivo: publicar y operar remotamente con persistencia antes de concurrencia compleja.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-5.1 | planned | Guardar y cargar proyectos desde backend. | CRUD remoto basico operativo. |
| PR-5.2 | planned | Publicar snapshots y salidas desde backend. | Publicaciones remotas trazables. |
| PR-5.3 | planned | UX de errores remotos y estados de sincronizacion. | Operacion remota clara para el usuario. |
| PR-5.4 | planned | Permisos, validaciones y compatibilidad de version. | Operacion online endurecida. |

### Fase 6 - Colaboracion online
Objetivo: agregar colaboracion sobre entidades ya estabilizadas.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-6.1 | planned | Definir estrategia de concurrencia por entidad. | Modelo claro de locking o merge. |
| PR-6.2 | planned | Presencia y refresco remoto no conflictivo. | Visibilidad multiusuario sin coedicion dura. |
| PR-6.3 | planned | Edicion concurrente controlada. | Colaboracion inicial segura. |
| PR-6.4 | planned | Versionado remoto y resolucion de conflictos. | Historial y recuperacion remota defendibles. |
| PR-6.5 | planned | Overlay colaborativo. | Capa de dibujo compartida y versionada. |

**Hito desbloqueado al validar la fase:** "publicado, con colaboracion y persistencia online".

## Protocolo de ejecucion

### Antes de abrir un PR
1. Identificar el PR objetivo en este roadmap.
2. Confirmar que sus dependencias previas estan en `validated`, o anotar la excepcion en la descripcion del PR.
3. Definir alcance explicito: que entra, que queda fuera y que no se debe mezclar.
4. Verificar si el PR impacta datos, snapshot/publicacion, viewer, print o persistencia.

### Durante el PR
1. Mantener el cambio pequeno, revertible y con un solo objetivo principal.
2. Ejecutar pruebas acordes al riesgo del cambio.
3. Si cambia comportamiento observable, actualizar la documentacion asociada en la misma rama.
4. Si el PR es auxiliar dentro de una fase, etiquetarlo claramente como soporte y mantenerlo dentro de la misma fase.

### Al validar o cerrar un PR
1. Cambiar su estado en este roadmap a `validated`.
2. Registrar fecha de validacion y referencia al PR o commit.
3. Anotar si desbloquea el siguiente PR o si deja deuda acordada.
4. Si la fase queda cerrada, actualizar el hito correspondiente y el "Proximo PR recomendado".

## Evidencia minima por PR
- Resumen del problema y de la solucion.
- Lista breve de cambios clave.
- Pruebas corridas y validacion manual relevante.
- Nota de riesgo si toca export/import, viewer, print o persistencia.
- Impacto en datos cuando aplique.
- Nota de rollback simple si el cambio tiene riesgo operacional.

## Uso del pull request template
El archivo [`.github/pull_request_template.md`](../.github/pull_request_template.md) es el formato estandar de evidencia y cierre. Por defecto, cada PR debe completar:
- `Resumen`
- `Cambios clave`
- `Pruebas realizadas`
- `Impacto en datos`
- `Checklist de calidad`

Ademas, exigir mas evidencia cuando:
- cambie comportamiento visible de UI,
- toque contratos de export/import o snapshot,
- modifique viewer, print o persistencia,
- introduzca una nueva base arquitectonica para fases posteriores.

En esos casos, tambien deben completarse `Evidencia UI` y `Riesgos y mitigacion`.

## Reglas de avance entre fases
- No pasar a una fase nueva si queda un PR previo que bloquea contratos, datos o UX base de la siguiente fase.
- Si aparece una deuda pequena no bloqueante, puede quedar anotada como follow-up dentro de la misma fase.
- Si aparece una deuda que cambia el contrato de la fase siguiente, debe resolverse antes de avanzar.

## Registro de validaciones
Agregar una linea breve debajo del PR validado cuando corresponda usar este documento como bitacora minima de cierre.

Formato sugerido:

`- Validado: YYYY-MM-DD - PR/commit: <referencia> - Nota: <desbloqueo o deuda acordada>.`

Ejemplo:

`- Validado: 2026-04-01 - PR/commit: abc1234 - Nota: desbloquea PR-0.2.`

## Mantenimiento del documento
- Actualizar este archivo al iniciar un PR (`in-progress`) y al cerrarlo (`validated` o `blocked`) cuando el contexto del roadmap cambie.
- Mantener `Working Agreement.md` breve; no duplicar aqui reglas generales de colaboracion.
- Mantener `README.md` como punto de descubrimiento, no como copia del roadmap operativo.
