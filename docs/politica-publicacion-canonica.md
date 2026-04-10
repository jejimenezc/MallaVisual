# Politica de Publicacion Canonica y Derivaciones

Fecha de acuerdo: 2026-04-10
Estado: vigente para planificar `PR-1.6`

## Objetivo

Definir una politica simple y trazable para distinguir:

- exportaciones directas desde un proyecto activo;
- publicacion canonica congelada;
- derivaciones versionadas emitidas desde una publicacion canonica.

La politica busca evitar UUID ficticios, recursividad de snapshots y ambiguedad entre "exportar" y "publicar".

## Definiciones

### Proyecto activo

Fuente editable y mutable de trabajo.

Desde aqui se pueden generar salidas directas, pero esas salidas no se consideran automaticamente una publicacion canonica.

### Publicacion canonica

Artefacto congelado, versionado y trazable representado por un `snapshot json`.

La publicacion canonica nace solo cuando existe el `snapshot json`.

### Derivacion versionada

Salida emitida desde una publicacion canonica abierta en viewer.

Estas derivaciones pueden ser web o documentales, pero no alteran el snapshot de origen.

## Reglas de identidad y trazabilidad

1. No se generan UUID ni hashes ficticios para publicaciones que no existen como `snapshot json`.
2. Un `pdf`, `html` o impresion emitidos directamente desde el proyecto activo son exportaciones directas, no publicaciones canonicas.
3. La identidad canonica nace solo con el `snapshot json`.
4. Las derivaciones emitidas desde un snapshot abierto deben tratarse como "derivado de publicacion canonica".
5. No se reescribe retroactivamente la identidad de exportaciones directas cuando despues se crea un snapshot canonico.

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

### Desde proyecto activo

Se permiten:

- salidas web directas;
- salidas documentales directas;
- generar publicacion oficial.

La accion central de trazabilidad debe ser `Generar publicacion oficial`.

La descarga explicita del `.json` puede mantenerse, pero no debe ser el foco principal del flujo.

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

1. `Generar publicacion oficial` reemplaza semanticamente a `Respaldo de lectura`.
2. Esa accion no debe sentirse como una descarga tecnica de JSON.
3. Tras generar la publicacion oficial, la app debe abrir automaticamente el snapshot en viewer.
4. Desde esa apertura quedan disponibles los paneles para emitir derivaciones versionadas.
5. La apertura de un snapshot publicado debe ser un flujo explicito y de primer nivel dentro de la UX de publicacion.

## Etiquetas y marcas de trazabilidad

Las salidas deben diferenciar visualmente su estatus.

Estados minimos:

- `Version no trazable` o `Version de trabajo` para exportaciones directas desde proyecto activo;
- `Publicacion canonica` para el snapshot oficial;
- `Derivado de <hash o identificador>` para salidas emitidas desde snapshot abierto.

Estas marcas deben dejar un punto de insercion futuro para:

- logotipo de MallaVisual;
- logotipo institucional del usuario.

La primera implementacion puede ser editorial y discreta; no necesita partir como marca de agua agresiva.

## Alcance tecnico sugerido para PR-1.6

### PR-1.6a

Ajuste de UX sin funcionalidad:

- sacar `Generar publicacion oficial` del panel de salidas web;
- darle una posicion transversal y semantica mas central;
- revisar consistencia entre viewer, modal y menu.

### PR-1.6b

Flujo canonico y derivaciones:

- implementar `Generar publicacion oficial`;
- abrir automaticamente el snapshot generado;
- rehabilitar modo presentacion al abrir snapshot;
- habilitar derivaciones web y documentales desde snapshot abierto;
- bloquear generacion de nuevo snapshot desde snapshot abierto;
- introducir modo contextual en modales de publicacion cuando aplique.

### PR-1.6c

Marcas de trazabilidad en salidas:

- `Version no trazable`;
- `Publicacion canonica`;
- `Derivado de ...`;
- sin romper paridad viewer/export ni sincronizacion editorial.

## Fuera de alcance por ahora

- firma criptografica fuerte;
- historial remoto de publicaciones;
- multiples snapshots canonicos administrados por backend;
- soporte real de logotipos institucionales;
- reapertura de edicion desde snapshot.
