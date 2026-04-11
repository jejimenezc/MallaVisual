# Politica de Publicacion Canonica, Sesiones y Derivaciones

Fecha de acuerdo inicial: 2026-04-10
Actualizacion de esquema: 2026-04-11
Estado: vigente para planificar `PR-1.6` bajo el modelo por sesion

## Objetivo

Definir una politica simple y trazable para distinguir:

- exportaciones directas desde un proyecto activo;
- publicacion canonica congelada;
- derivaciones versionadas emitidas desde una publicacion canonica.

La politica busca evitar UUID ficticios, recursividad de snapshots y ambiguedad entre "exportar", "emitir" y "publicar".

Ademas, esta actualizacion introduce un modelo de sesion visible para el usuario:

- `Sesion de diseno`
- `Sesion de certificacion`

## Definiciones

### Proyecto activo

Fuente editable y mutable de trabajo.

Desde aqui se pueden generar salidas directas, pero esas salidas no se consideran automaticamente una publicacion canonica.

### Sesion de diseno

Estado normal de trabajo.

La app mantiene todas las capacidades de edicion y visualizacion habituales, pero no expone una fuente canonica congelada dentro del panel de salidas.

### Sesion de certificacion

Declaracion explicita de intencion de emitir una observacion certificada.

La app entra en un contexto de lectura y preparacion de instrumentos, pero la publicacion canonica aun no existe hasta que se produce la primera salida.

### Sesion certificada materializada

Estado que nace en el instante en que la primera salida dentro de la sesion de certificacion gatilla la creacion efectiva del snapshot.

Desde ese momento, todas las salidas hermanas de la misma sesion usan el mismo UUID de certificacion.

### Publicacion canonica

Artefacto congelado, versionado y trazable representado por un `snapshot json`.

La publicacion canonica nace solo cuando existe el `snapshot json`.

En el nuevo esquema, el snapshot no se materializa al activar la sesion de certificacion, sino al emitir la primera salida de esa sesion.

### Derivacion versionada

Salida emitida desde una publicacion canonica abierta en viewer.

Estas derivaciones pueden ser web o documentales, pero no alteran el snapshot de origen.

## Reglas de identidad y trazabilidad

1. No se generan UUID ni hashes ficticios para publicaciones que no existen como `snapshot json`.
2. Un `pdf`, `html` o impresion emitidos en sesion de diseno son exportaciones directas, no publicaciones canonicas.
3. La identidad canonica nace solo con el `snapshot json`.
4. La primera salida emitida durante una sesion de certificacion materializa el snapshot y fija el UUID de la sesion.
5. Todas las salidas subsiguientes dentro de esa misma sesion de certificacion son hermanas y reutilizan el mismo UUID.
6. Las derivaciones emitidas desde un snapshot abierto deben tratarse como "derivado de publicacion canonica".
7. No se reescribe retroactivamente la identidad de exportaciones directas cuando despues se crea un snapshot canonico.

## Regla de no edicion

Un `snapshot json` abierto nunca reabre edicion.

El proyecto editable y el snapshot publicado son artefactos distintos y deben mantener fronteras claras.

## Regla de no recursividad

Desde un `snapshot json` abierto:

- si se permiten derivaciones web;
- si se permiten derivaciones documentales;
- no se permite generar un nuevo `snapshot json`.

Esto evita cadenas de publicacion sobre publicacion y mantiene una unica fuente canonica por emision.

## Politica de salidas

### Desde proyecto activo en sesion de diseno

Se permiten:

- salidas web directas;
- salidas documentales directas;
- preparar el paso a sesion de certificacion.

No se expone la descarga del `snapshot json` como salida directa del panel.

Las salidas emitidas aqui deben marcarse como `Version de trabajo` o `Version no trazable`.

### Desde proyecto activo en sesion de certificacion

Se permiten:

- modo presentacion;
- modo documento;
- emisiones web;
- emisiones documentales;
- emitir acta de datos certificada.

La app debe entrar automaticamente al viewer en modo presentacion al activar esta sesion.

La primera emision de cualquier formato debe:

- crear el snapshot oficial;
- fijar el UUID de sesion;
- conservar ese UUID para las salidas hermanas posteriores.

### Desde snapshot abierto

Se permiten:

- modo presentacion;
- modo documento;
- derivaciones web versionadas;
- derivaciones documentales versionadas.

No se permite:

- generar un nuevo `snapshot json`;
- volver a edicion.

## UX acordada

1. El usuario alterna entre `Sesion de diseno` y `Sesion de certificacion` mediante un toggle visible y transversal.
2. La `Sesion de certificacion` es una declaracion de intencion y no materializa todavia el snapshot.
3. `Respaldo de lectura` deja de ser el concepto central.
4. En sesion de certificacion, la opcion JSON debe presentarse como `Acta de datos certificada`.
5. La descarga del JSON no debe burocratizar el flujo ni ser requisito visible previo para emitir otros formatos.
6. La apertura de un snapshot publicado debe ser un flujo explicito y de primer nivel dentro de la UX de publicacion.
7. Un snapshot abierto entra automaticamente en contexto de certificacion para emitir nuevas copias certificadas.

## Persistencia de la sesion de certificacion

Recomendacion vigente para la primera implementacion:

1. La sesion de certificacion debe persistir mientras el proyecto activo siga siendo el mismo dentro de la misma ventana.
2. Navegar a Escritorio, Repositorio o volver al editor no debe destruir por si mismo la sesion mientras no se vuelva a `Sesion de diseno`.
3. Si la ventana se cierra por error, se recomienda intentar recuperar la sesion usando persistencia local acotada por proyecto.
4. Si al reabrir la app se detecta una sesion de certificacion activa asociada al mismo proyecto y ya materializada, se puede restaurar su UUID y su contexto de viewer.
5. Si la sesion estaba solo en estado pendiente y nunca emitio una primera salida, no es obligatorio restaurarla como sesion viva.

## Termino de sesion

Recomendacion vigente para la primera implementacion:

1. Volver a `Sesion de diseno` destruye el UUID de la sesion actual.
2. Ese retorno debe ser tratado como un reset de certificacion.
3. Conviene alertar solo si ya existe un UUID materializado en la sesion actual.
4. No hace falta alertar al salir de una sesion de certificacion pendiente sin emision efectiva.

## Etiquetas y marcas de trazabilidad

Las salidas deben diferenciar visualmente su estatus.

Estados minimos:

- `Version no trazable` o `Version de trabajo` para exportaciones directas en sesion de diseno;
- `Copia oficial` con UUID de sesion para emisiones dentro de sesion de certificacion;
- `Derivado de <hash o identificador>` para salidas emitidas desde snapshot abierto.

Estas marcas deben dejar un punto de insercion futuro para:

- logotipo de MallaVisual;
- logotipo institucional del usuario.

La primera implementacion puede ser editorial y discreta; no necesita partir como marca de agua agresiva.

## Alcance tecnico sugerido para PR-1.6

### PR-1.6a

Ajuste de UX sin funcionalidad:

- introducir el toggle `Sesion de diseno | Sesion de certificacion` en la barra de estado;
- reordenar la barra de estado para acomodar estado de guardado, schema y sesion;
- actualizar copy visible de paneles y acciones para distinguir `En diseno` y `En certificacion`;
- ocultar `snapshot json` en sesion de diseno;
- mostrar `Acta de datos certificada` en sesion de certificacion sin cambiar aun la logica de lazy snapshot.

### PR-1.6b

Flujo canonico y derivaciones:

- implementar el lazy snapshot al primer emitido de la sesion;
- memorizar UUID de sesion mientras el toggle permanezca en `Certificar`;
- resetear UUID al volver a `Disenar`;
- abrir viewer en modo presentacion al entrar a certificacion;
- compatibilizar snapshot abierto con el mismo esquema de sesion certificada;
- bloquear generacion de nuevo snapshot desde snapshot abierto.

### PR-1.6c

Marcas de trazabilidad en salidas:

- `Version no trazable` o `Version de trabajo` en sesion de diseno;
- `Copia oficial` + UUID de sesion en sesion de certificacion;
- `Derivado de ...` para snapshot abierto;
- punto de insercion para logotipo futuro;
- sin romper paridad viewer/export ni sincronizacion editorial.

## Fuera de alcance por ahora

- firma criptografica fuerte;
- historial remoto de publicaciones;
- multiples snapshots canonicos administrados por backend;
- soporte real de logotipos institucionales;
- reapertura de edicion desde snapshot.
