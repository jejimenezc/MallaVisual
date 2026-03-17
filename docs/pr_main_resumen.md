# PR a main: viewer, snapshot y print

## Base de comparación

- `main` en `430db961`
- Rama fuente: `feat-Viewer_y_Print-IntegracionFinal`
- Head evaluado: `f5339b77`
- Diferencia: `76 commits ahead of main`
- Diff agregado: `21 archivos`, `7817 inserciones`, `28 eliminaciones`

## Resumen ejecutivo

Este PR consolida el flujo de publicación de mallas sobre un snapshot versionado y agrega un viewer dedicado para revisar el resultado publicado con controles de apariencia. Sobre esa misma base se integra un sistema de print preview e impresión real que comparte lógica de layout y soporta paginación multipágina.

Además, el flujo de publicación deja atrás la confirmación anterior y pasa a un modal de salidas más claro, conectado con preview, publicación e impresión. El conjunto se cierra con ajustes de labels, copy, políticas editoriales y estados de barra de estado para dejar la feature en condición de merge hacia `main`.

## Cambios principales

### Snapshot de malla

- Se incorpora export/import de snapshot v1 como contrato específico para contenido publicable.
- El snapshot pasa a incluir las bandas visibles de encabezados y métricas, de modo que viewer y print trabajen con una representación consistente.
- Se agregan tipos y utilidades dedicadas para serializar, reconstruir y validar el snapshot fuera del editor principal.

### Viewer

- Se agrega la nueva pantalla `MallaViewerScreen` como modo de visualización del snapshot publicado.
- El viewer incorpora controles de apariencia desacoplados de los datos del snapshot.
- Se ajustan header, labels, scroll del viewport, acentos visuales y modos de interacción para alinear el comportamiento con el editor sin mezclar responsabilidades.

### Print preview e impresión

- Se agrega un modo de print preview reutilizando la estructura lateral del viewer.
- La configuración de impresión pasa a manejar defaults por sesión y concentra opciones editoriales y de escala.
- Se introduce una arquitectura de paginación vertical y 2D basada en tiles reutilizable entre preview e impresión.
- El resolver protege cortes sobre ejes X/Y y líneas curriculares para evitar divisiones visualmente incorrectas.
- La impresión real se emite desde un documento aislado, reduciendo dependencias con el DOM principal de la aplicación.

### Flujo de publicación

- Se habilita un atajo desde el editor hacia preview/publicación.
- El confirm legacy se reemplaza por `PublishModal`, orientado a salidas concretas en vez de confirmaciones bloqueantes.
- Desde el flujo de publicación se puede entrar directamente a print preview.
- Se refinan estados visuales, acciones disponibles y copy del modal para dejar más claro el destino de cada salida.

### Pulido final

- Se corrigen y uniforman labels en español entre editor, viewer y print preview.
- Se ajustan page numbers y editorial policy para mantener consistencia en la salida impresa.
- La status bar incorpora estado de espera y destaque cuando el snapshot publicado proviene de una fuente externa.

## Archivos / áreas impactadas

- `src/screens/MallaViewerScreen.tsx` y `src/screens/MallaViewerScreen.module.css`: nueva pantalla de viewer, layout visual, controles de apariencia y estilos específicos del modo de visualización/publicación.
- `src/utils/malla-snapshot.ts` y `src/utils/malla-snapshot.test.ts`: pipeline de snapshot de malla, serialización del contenido publicable y cobertura de roundtrip/casos borde.
- `src/utils/viewer-print.ts` y `src/utils/viewer-print.test.ts`: motor de layout y paginación compartido entre preview e impresión, con cobertura fuerte sobre cortes, conteos y páginas derivadas.
- `src/utils/viewer-theme.ts` y `src/utils/viewer-theme.test.ts`: contrato y normalización del tema visual del viewer, separado del payload del snapshot.
- `src/components/PublishModal.tsx` y `src/components/PublishModal.module.css`: nuevo modal de salidas para publicación, preview e impresión, con copy y estados visuales revisados.
- `src/App.tsx`: orquestación del flujo entre editor, viewer, publicación y print preview.
- `src/components/GlobalMenuBar/GlobalMenuBar.tsx`: integración de entradas y controles relacionados con publicación/preview.
- `src/components/StatusBar/StatusBar.tsx` y `src/components/StatusBar/StatusBar.module.css`: nuevos estados de espera y destaque para snapshots externos/publicados.
- `src/types/malla-snapshot.ts`: definición del contrato tipado del snapshot publicable.
- `src/types/viewer-theme.ts`: definición del contrato tipado para apariencia del viewer.

## Cambios técnicos relevantes

- `malla-snapshot`
  - Introduce el contrato para serializar una malla publicable fuera del estado vivo del editor.
  - Amplía el payload para incluir bandas visibles de encabezados y métricas, de modo que viewer y print no dependan de recalcular esa información desde el editor.

- `viewer-theme`
  - Separa los datos del snapshot de la apariencia aplicada al visualizarlo.
  - Permite ajustar presentación sin alterar la representación publicada de la malla.

- `viewer-print`
  - Centraliza un resolver compartido entre print preview e impresión real.
  - Deriva tiles y páginas lineales a partir de una grilla de paginación 2D.
  - Usa medición física en `px/mm` para calibrar preview y salida impresa sobre el navegador real.

- Flujo UI de `PublishModal`
  - Sustituye la confirmación bloqueante por un modal orientado a acciones de salida.
  - Integra en un solo punto las transiciones entre publicación, preview y print preview.

Estas piezas deben entenderse como interfaces técnicas relevantes del PR, no como documentación exhaustiva de APIs públicas.

## Riesgos y focos de revisión

- Posibles regresiones visuales entre editor, viewer y print preview.
- Casos borde de paginación multipágina en layouts simultáneamente anchos y altos.
- Diferencias entre el print preview y la impresión real del navegador.
- Compatibilidad del snapshot cuando faltan metadatos visibles o contenido opcional.
- Navegación desde publicación hacia preview/print y retorno al editor sin pérdida de contexto.

## Pruebas recomendadas

### Automatizadas

- Ejecutar `npm test`.
- Ejecutar `npm run typecheck`.
- Revisar especialmente la cobertura agregada en:
  - `src/utils/malla-snapshot.test.ts`
  - `src/utils/viewer-print.test.ts`
  - `src/utils/viewer-theme.test.ts`

### Manuales

- Publicar una malla y abrir el viewer desde el flujo principal.
- Cambiar apariencia en viewer y validar header, bandas y controles visuales.
- Abrir print preview y validar escenarios de una sola página y multipágina.
- Probar impresión real del navegador y comparar contra el preview.
- Validar políticas editoriales y numeración de páginas en distintos layouts.
- Probar snapshots con metadata vacía o mínima.
- Verificar status bar en espera y con snapshot externo/publicado.

## Texto breve sugerido para la descripción del PR

Este PR lleva a `main` el flujo completo de snapshot, viewer y print para mallas publicadas. La rama agrega un snapshot versionado para contenido publicable, una pantalla dedicada de viewer con controles de apariencia, un sistema de print preview e impresión con paginación vertical/2D compartida, y reemplaza la confirmación antigua de publicación por un modal de salidas más claro.

- Snapshot publicable v1 con bandas visibles de encabezados y métricas.
- Nuevo `MallaViewerScreen` con apariencia desacoplada del payload publicado.
- Print preview e impresión real con resolver compartido, calibración física y protección de cortes.
- Nuevo `PublishModal` integrado con publicación, preview e impresión.
- Verificación sugerida: `npm test`, `npm run typecheck` y revisión manual de viewer/preview/print.
