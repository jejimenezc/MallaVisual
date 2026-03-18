# Print Engine Validation

Este documento registra las pruebas manuales clave del pipeline de impresion.

Objetivo:
- Validar estabilidad del layout
- Detectar regresiones visuales
- Asegurar consistencia entre preview y PDF

---

## Entorno de prueba

- Navegador: Chrome / Edge
- Sistema: (opcional)
- Fecha ultima actualizacion: 2026-03-18

---

## Fixtures utilizados

| Nombre | Descripcion | Archivo |
|------|--------|--------|
| small | malla simple 1x1 | /docs/testing/fixtures/small.json |
| vertical-large | muchas filas | /docs/testing/fixtures/large-vertical.json |
| horizontal-large | muchas columnas | /docs/testing/fixtures/large-horizontal.json |
| grid-2d | overflow en ambos ejes | /docs/testing/fixtures/grid-2d.json |

---

## Artefactos generados

| Caso | PDF |
|------|-----|
| small | /docs/testing/artifacts/small-carta.pdf |
| vertical-large | /docs/testing/artifacts/vertical-carta.pdf |
| horizontal-large | /docs/testing/artifacts/horizontal-carta.pdf |
| grid-2d | /docs/testing/artifacts/grid-2d-carta.pdf |

---

## Casos de validacion

### Caso 1 - 1x1 (base)
- Config:
  - carta
  - portrait
  - margins: normal
  - scale: 1

**Esperado:**
- 1 pagina
- sin cortes
- sin espacios en blanco

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- ...

---

### Caso 2 - overflow vertical (axisY)
- Config:
  - carta
  - portrait
  - margins: normal

**Esperado:**
- multiples paginas
- cortes entre filas (row/band pagination)
- sin solapamiento

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- Primera pagina contiene 4 filas de bloques y las demas paginas solo contienen 3 filas de bloques.
- El corte natural de las lineas de bloque no incluye la sombra de los bloques de la ultima fila, por lo que esta sombra se imprime en la pagina siguiente.

---

### Caso 3 - overflow horizontal (axisX)
- Config:
  - carta
  - landscape
  - margins: normal

**Esperado:**
- multiples paginas
- cortes en axisX
- continuidad horizontal correcta

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- Multiples paginas, corte y continuidad horizontal son correctos.
- El renderer local de impresion elimina el reescalamiento detectado previamente en PDF.
- Validados correctamente los casos 6x3, 7x3, 7x4 y 7x5.
- Los casos control 3x3 y 5x3 siguen correctos, sin degradacion del preview ni del PDF.

---

### Caso 4 - grid 2D (axisX + axisY)
- Config:
  - carta
  - landscape
  - margins: normal

**Esperado:**
- pagesX > 1
- pagesY > 1
- recorrido consistente de paginas
- sin paginas en blanco

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- Grid 20x20 validado correctamente con el renderer local de impresion.
- Grid 20x20 con scale 0.75 validado correctamente, sin desincronizacion entre preview y PDF.

---

### Caso 5 - fit-to-width
- Config:
  - carta
  - landscape
  - fit-to-width: ON

**Esperado:**
- pagesX = 1
- ajuste correcto de escala
- sin overflow horizontal

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- fit-to-width se comporta correctamente con grillas small, vertical y 2d.
- 20x20 en fit-to-width, antes problematico, ahora sincroniza correctamente preview y PDF.
- El control de escala en Print Settings se mantiene alineado con el renderer local de impresion.

---

### Caso 6 - politica editorial
- Config:
  - titulo: ON
  - header/footer: ON
  - layout: first-page-only

**Esperado:**
- titulo solo en primera pagina
- header/footer segun politica
- numeracion correcta

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- ...

---

## Invariantes verificadas

- [x] pageCount = pagesX * pagesY
- [x] no paginas en blanco
- [x] tiles no solapados
- [x] continuidad visual entre paginas
- [x] preview consistente con PDF

---

## Issues conocidos

| ID | Descripcion | Estado |
|----|------------|--------|
| #1 | diferencia en escala de PDF respecto de preview, solo en malla large-horizontal, en cualquier fixture de pagina y orientacion | resuelto |

---

## Historial

### 2026-03-18 - PR11
- estabilizacion de impresion
- mejoras en tests
- renderer local de impresion para PDF
- validacion extra de 20x20 con fit-to-width y scale 0.75

Resultado general:
- [x] OK
- [ ] OK con observaciones
- [ ] FAIL

Notas:
- El renderer local de impresion corrige la desincronizacion Preview/PDF sin degradar los casos control 3x3 y 5x3.
