# Profiling PR B

Fecha: 2026-03-22

## Objetivo

Identificar hot paths reales del viewer/publicacion antes de optimizar, con foco en:

- `MallaViewerScreen`
- layout compartido viewer/print
- superficies grandes en mallas grandes

## Metodo

- Fixture: `docs/testing/fixtures/grid-2d.json`
- Script reproducible: `scripts/profile-viewer.ts`
- Runner: `node_modules/.bin/vite-node scripts/profile-viewer.ts`
- Iteraciones: 25

El script mide tres tramos del pipeline:

1. `applyViewerTheme`
2. resolucion de page metrics + content placement
3. pipeline de paginacion compartida:
   `resolveViewerPageEditorialHeights`
   `resolveViewerGridCutGuides`
   `resolveViewerAxisXColumnSegments`
   `resolveViewerAxisYLineSegments`
   `resolveViewerPaginationGridMetrics`
   `resolveViewerPrintedPagesFromPaginationGrid`
   `resolveViewerPaginatedSurfaceLayout`

## Resultado observado

```json
{
  "fixture": "grid-2d",
  "iterations": 25,
  "averageMs": {
    "applyViewerTheme": 1.17,
    "contentPlacement": 0.08,
    "paginationPipeline": 0.46,
    "total": 1.71
  },
  "pages": 15,
  "tiles": 15,
  "scaledSurface": {
    "width": 4584,
    "height": 3664
  }
}
```

## Hot paths intervenidos

- `applyViewerTheme` sigue siendo el tramo mas costoso del pipeline medido. No se reescribio porque no aparecio evidencia suficiente para justificar una intervencion de riesgo en este PR.
- El siguiente costo real esta en la paginacion compartida. Ahi si habia recomputacion redundante en pantalla:
  - `MallaViewerScreen` recalculaba `cutGuides`, `axisXColumnSegments` y `axisYLineSegments` dentro del memo de grid.
  - el preview documental recalculaba por pagina `editorialLayout` y `sliceLayout` en cada render.
  - `ViewerPrintDocument` recalculaba por pagina esos mismos derivados en cada render del documento.

## Cambios aplicados

- Se separaron y memoizaron `cutGuides`, `axisXColumnSegments` y `axisYLineSegments` antes de construir `gridPaginationMetrics`.
- Se precalcularon los modelos de pagina del preview documental (`editorialLayout` + `sliceLayout`) para evitar derivaciones repetidas por tile.
- `ViewerPrintDocument` ahora memoiza los modelos de pagina impresos antes de renderizar la secuencia completa.
- Se memoizo el objeto `classNames` que se pasa al documento de impresion para evitar invalidar renders por identidad.

## Riesgo controlado

- No se tocaron contratos del motor de print ni su algoritmo central.
- No se introdujeron nuevos tipos de layout.
- La paridad preview/print se mantiene apoyada por `src/utils/viewer-print.test.ts` y `src/utils/viewer-export.test.ts`.
