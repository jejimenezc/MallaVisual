# Roadmap Operativo y Protocolo de PRs

Este documento es la fuente de verdad para ejecutar el roadmap del proyecto fase a fase y PR a PR. Su objetivo es mantener contexto compartido, evitar saltos de alcance y dejar evidencia minima suficiente para validar cada iteracion sin volver pesado el proceso.

## Estado actual

| Campo | Valor |
| --- | --- |
| Fase actual | Fase 1 - Endurecimiento de publicacion externa |
| Hito actual | Alcanzar "producto maduro y publicable" |
| Proximo PR recomendado | `PR-1.6a-support-b alinear viewer de presentacion con WYSIWYG editorial` |
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
| PR-0.2f | validated | Extraer logica de franjas, encabezados y metricas de `MallaEditorScreen`. | `MallaEditorScreen` mas corta y con una frontera clara para configuracion de bandas superiores, edicion de encabezados y wiring del meta-panel relacionado. |
| PR-0.3 | validated | Reemplazar prompts nativos y unificar confirmaciones. | UX base consistente para flujos de confirmacion y renombrado. |
| PR-0.2f-support | validated | Corregir duplicacion de metricas y excluir placeholders de salidas de publicacion. | La configuracion de metricas debe conservar referencias al duplicar y las publicaciones no deben mostrar textos placeholder como contenido final. |
| PR-0.2g | validated | Agregar toggle ver/ocultar por fila en metricas. | Las metricas deben poder ocultarse o mostrarse por fila desde el popover, conservando configuracion y simetria UX con encabezados. |
| PR-0.4 | validated | Endurecer checklist de release local y CI. | `lint` incorporado al criterio de calidad y documentacion de release actualizada. |

**Hito desbloqueado al validar la fase:** "producto local maduro".

- Validado: 2026-04-01 - PR/commit: tests confirmados localmente tras `chore: prepare PR-0.1 lint cleanup` - Nota: desbloquea PR-0.2a.
- Validado: 2026-04-02 - PR/commit: `9fc0987`, `b962cfd`, `c18bb40`, `16b800c` - Nota: `PR-0.2a` cierra el desacople principal de `App` y `BlockEditorScreen`; quedan follow-ups funcionales chicos y un desacople pendiente como `PR-0.2b`.
- Review: 2026-04-02 - Resultado: `validated` - Evidencia: `lint`/`typecheck` ok, pruebas manuales satisfactorias sobre nombres importados, viewer/publicacion y renombre local; sin hallazgos bloqueantes restantes dentro del alcance del support.
- Validado: 2026-04-02 - PR/commit: `dcddc25` - Nota: `PR-0.2-support` corrige nombres importados, renombre local no publicado y alcance por proyecto de configuracion de viewer/publicacion; desbloquea `PR-0.2c`.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2c` - Nota: `PR-0.2c` corrige la reapertura de pseudoproyectos en editor de bloques y preserva el nombre local del bloque no publicado al cambiar de proyecto o rehidratar; desbloquea `PR-0.2b`.
- Validado: 2026-04-02 - PR/commit: `f39f938`, `6939621`, `966e131` + fixes de review sobre viewer/publicacion - Nota: `PR-0.2b` completa un nuevo recorte de desacople en `App`, `MallaViewerScreen` y `MallaEditorScreen`, y corrige la fuente activa de salida documental para publicaciones externas; desbloquea follow-ups de UX del viewer y definiciones de publicacion.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2d` - Nota: `PR-0.2d` habilita scroll vertical limpio en el panel lateral del viewer con indicadores interactivos; desbloquea `PR-0.2e`.
- Validado: 2026-04-02 - PR/commit: cierre local de `PR-0.2e` - Nota: `PR-0.2e` retrae por defecto el panel lateral al abrir publicaciones externas y deja el viewer menos confuso desde el primer frame; desbloquea `PR-0.3`.
- Validado: 2026-04-03 - PR/commit: `9042c98`, `4eb380d` - Nota: `PR-0.2f` completa la extraccion de bandas de `MallaEditorScreen` con una segunda pasada que separa layout, datos y coordinacion UI; desbloquea `PR-0.3`.
- Validado: 2026-04-03 - PR/commit: `f40b250` + cierre local de review final - Nota: `PR-0.3` migra el renombrado y la eliminacion de proyectos recientes en `HomeScreen` a `promptAsync` y `confirmAsync`, y deja la documentacion alineada; desbloquea `PR-0.4`.
- Validado: 2026-04-04 - PR/commit: cierre local de `PR-0.2f-support` - Nota: `PR-0.2f-support` corrige la duplicacion de metricas, elimina placeholders editoriales de las salidas publicadas y sincroniza encabezados largos entre viewer y documento; desbloquea `PR-0.4`.
- Validado: 2026-04-04 - PR/commit: cierre local de `PR-0.2g` - Nota: `PR-0.2g` agrega visibilidad por fila en metricas, conserva la configuracion al ocultar/mostrar y alinea editor, viewer y publicacion; deja como follow-up evaluar un limite ergonomico alto para la cantidad de metricas si la UI empieza a degradarse; desbloquea `PR-0.4`.
- Validado: 2026-04-04 - PR/commit: cierre local de `PR-0.4` - Nota: `PR-0.4` incorpora `lint` al workflow de CI y al checklist de release local, alineando roadmap, QA, README y template de PR; cierra la Fase 0.

### Fase 1 - Endurecimiento de publicacion externa
Objetivo: pasar de maduro local a publicable externamente.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-1.1 | validated | Baseline de accesibilidad para menus, overlays y navegacion. | Navegacion por teclado y ARIA minima defendible. |
| PR-1.1-support-a | validated | Suprimir el menu Editar del GlobalMenuBar y dejar undo/redo solo en herramientas de edicion locales. | Menubar alineado con el contexto real de cada pantalla, sin mezclar navegacion global con acciones de edicion. |
| PR-1.1-support-b | validated | Corregir copy contextual de confirmaciones al intentar ir a la malla con bloque publicado desactualizado. | Los modales de navegacion deben nombrar acciones coherentes con la pantalla actual y no prometer un destino distinto al real. |
| PR-1.2 | validated | Mejorar senales visuales de piezas referenciadas vs snapshot. | Estado de piezas legible en UX normal. |
| PR-1.3 | validated | Ampliar cobertura de flujos de viewer y publicacion. | Regresiones importantes cubiertas por pruebas. |
| PR-1.4 | validated | Formalizar contrato estable de snapshot publicable. | Publicacion versionable y menos fragil ante cambios futuros. |
| PR-1.4-support-a | validated | Endurecer validacion minima de import para proyecto y bloque. | Importaciones con tipado mas robusto y validaciones minimas de seguridad sin elevar proyecto/bloque a contratos publicos. |
| PR-1.5 | validated | Definir perfil documental versionado para publicaciones y reglas de override local. | La publicacion debe poder expresar una salida documental canonica sin heredar configuraciones del proyecto activo. |
| PR-1.6a | validated | Introducir la sesion `Disenar | Certificar` y reordenar la UX base sin cambiar aun el flujo canonico. | La barra de estado y los paneles deben distinguir `Diseno` vs `Certificacion`, ocultando JSON en diseno y exponiendo `Acta de datos certificada` solo en certificacion. |
| PR-1.6a-support-a | validated | Alinear las salidas web de publicaciones externas con la apariencia congelada del snapshot. | `html-web` y derivados de snapshots abiertos deben respetar titulo, encabezado y pie configurados en `snapshot.appearance`. |
| PR-1.6a-support-b | in-progress | Alinear el viewer de presentacion con WYSIWYG editorial. | El modo presentacion debe previsualizar los elementos editoriales activos antes de emitir, con simetria respecto del modo documental. |
| PR-1.6b | planned | Implementar el lazy snapshot y la identidad de sesion certificada. | La primera emision en certificacion debe materializar el snapshot, fijar un UUID de sesion y reutilizarlo hasta volver a diseno, incluyendo compatibilidad con snapshots abiertos. |
| PR-1.6c | planned | Agregar marcas de trazabilidad en las salidas publicadas. | Las salidas deben distinguir entre version de trabajo, copia oficial con UUID y derivado versionado sin romper la paridad con el viewer. |

**Hito desbloqueado al validar la fase:** "producto maduro y publicable".

- Validado: 2026-04-08 - PR/commit: `299c305`, `735da35` - Nota: `PR-1.1` deja una baseline defendible para menus, overlays y navegacion principal; se abren `PR-1.1-support-a` para simplificar el GlobalMenuBar y `PR-1.1-support-b` para corregir copy contextual de confirmaciones hacia malla.
- Validado: 2026-04-08 - PR/commit: `6d5af4c` - Nota: `PR-1.1-support-a` elimina el menu `Editar` del GlobalMenuBar y deja `undo/redo` solo en herramientas locales; desbloquea `PR-1.1-support-b`.
- Validado: 2026-04-08 - PR/commit: `c60216b` - Nota: `PR-1.1-support-b` corrige el copy contextual del modal al intentar ir a la malla desde Escritorio o Repositorio con bloque publicado desactualizado.
- Validado: 2026-04-08 - PR/commit: `34d3ae6` - Nota: `PR-1.2` distingue mejor piezas referenciadas y snapshots en la malla con bordes suaves e iconos persistentes; desbloquea `PR-1.3`.
- Validado: 2026-04-08 - PR/commit: `89c2638` - Nota: `PR-1.3` amplía la cobertura del workflow de viewer/publicación en helpers puros y quedó validada además con `cmd /c npm test` en local; desbloquea `PR-1.4`.
- Validado: 2026-04-10 - PR/commit: c28e210 - Nota: PR-1.4 formaliza el contrato del snapshot publicable con payloadKind y orden canonico estable; validacion manual sin retrocesos ni comportamientos inesperados; desbloquea PR-1.5.
- Validado: 2026-04-10 - PR/commit: `066deff` - Nota: `PR-1.4-support-a` endurece la validacion minima de import para proyecto y bloque; pruebas manuales y `cmd /c npm test` en verde; deja preparado `PR-1.5`.
- Validado: 2026-04-10 - PR/commit: `7c8fbef`, `4b78bc8` - Nota: `PR-1.5` agrega un perfil documental versionado dentro del snapshot publicable y hace que las salidas documentales respeten ese contrato al reabrir publicaciones; validado ademas con pruebas manuales y `cmd /c npm test`; desbloquea `PR-1.6`.
- Decision: 2026-04-10 - Documento: `docs/politica-publicacion-canonica.md` - Nota: `PR-1.6` se subdivide en `PR-1.6a`, `PR-1.6b` y `PR-1.6c` para separar primero la coherencia UX, luego el flujo canonico y finalmente las marcas de trazabilidad.
- Decision: 2026-04-11 - Documento: `docs/politica-publicacion-canonica.md` - Nota: el esquema de `PR-1.6` se reencuadra en torno a una sesion visible `Disenar | Certificar`, con lazy snapshot, UUID de sesion y compatibilidad explicita con `Abrir publicacion externa`.
- Validado: 2026-04-12 - PR/commit: `de89808`, `1a97573`, `4387c08`, `4b86bf5`, `a2a4e5f`, `416e941`, `ade2cbd` - Nota: `PR-1.6a` deja la UX base de regimenes y certificacion consistente para proyecto activo y publicaciones externas; se abren `PR-1.6a-support-a` para alinear export web externa con `snapshot.appearance` y `PR-1.6a-support-b` para resolver WYSIWYG editorial del modo presentacion.
- Validado: 2026-04-12 - PR/commit: `101b53c` + fix final de navegacion en modal - Nota: `PR-1.6a-support-a` hace que las salidas web desde snapshots abiertos respeten `snapshot.appearance` y preserven el contexto de publicacion al alternar desde el modal; desbloquea `PR-1.6a-support-b`.

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

### Fase 3.5 - Infraestructura de UI bilingue
Objetivo: preparar internacionalizacion de la UI antes de la operacion online, pero solo cuando la UX visible ya este suficientemente estabilizada.

Condicion de entrada:
- No iniciar esta fase mientras sigan cambiando con frecuencia labels, textos de modales, placeholders y mensajes de error en espanol.
- La mayor parte de los flujos principales debe tener copy estable y review ortografica consistente.

| PR | Estado | Objetivo principal | Cierre esperado |
| --- | --- | --- | --- |
| PR-3.5.1 | planned | Introducir infraestructura base de i18n para la UI. | Catalogo de strings, proveedor de locale y reemplazo progresivo de literales sin traducir aun toda la app. |
| PR-3.5.2 | planned | Externalizar los textos visibles principales y habilitar locale en ingles. | Etiquetas y textos de la app listos para alternar entre espanol e ingles sin duplicar logica de pantalla. |

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
5. Si el PR toca textos visibles al usuario en espanol, revisar ortografia, tildes y consistencia terminologica antes de pasarlo a `review`.

### Al validar o cerrar un PR
1. Cambiar su estado en este roadmap a `validated`.
2. Registrar fecha de validacion y referencia al PR o commit.
3. Anotar si desbloquea el siguiente PR o si deja deuda acordada.
4. Si la fase queda cerrada, actualizar el hito correspondiente y el "Proximo PR recomendado".

## Evidencia minima por PR
- Resumen del problema y de la solucion.
- Lista breve de cambios clave.
- Pruebas corridas y validacion manual relevante.
- Revision de copy visible cuando el PR agregue o modifique textos de UI.
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




