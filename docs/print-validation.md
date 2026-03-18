# Print Engine Validation

Este documento registra las pruebas manuales clave del pipeline de impresión.

Objetivo:
- Validar estabilidad del layout
- Detectar regresiones visuales
- Asegurar consistencia entre preview y PDF

---

## 🔧 Entorno de prueba

- Navegador: Chrome / Edge (especificar versión si es relevante)
- Sistema: (opcional)
- Fecha última actualización: YYYY-MM-DD

---

## 📦 Fixtures utilizados

| Nombre | Descripción | Archivo |
|------|--------|--------|
| small | malla simple 1x1 | /docs/testing/fixtures/small.json |
| vertical-large | muchas filas | /docs/testing/fixtures/large-vertical.json |
| horizontal-large | muchas columnas | /docs/testing/fixtures/large-horizontal.json |
| grid-2d | overflow en ambos ejes | /docs/testing/fixtures/grid-2d.json |

---

## 📄 Artefactos generados

| Caso | PDF |
|------|-----|
| small | /docs/testing/artifacts/small-carta.pdf |
| vertical-large | /docs/testing/artifacts/vertical-carta.pdf |
| horizontal-large | /docs/testing/artifacts/horizontal-carta.pdf |
| grid-2d | /docs/testing/artifacts/grid-2d-carta.pdf |

---

## ✅ Casos de validación

### Caso 1 — 1x1 (base)
- Config:
  - carta
  - portrait
  - margins: normal
  - scale: 1

**Esperado:**
- 1 página
- sin cortes
- sin espacios en blanco

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- ...

---

### Caso 2 — overflow vertical (axisY)
- Config:
  - carta
  - portrait
  - margins: normal

**Esperado:**
- múltiples páginas
- cortes entre filas (row/band pagination)
- sin solapamiento

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- Primera página contiene 4 filas de bloques y las demás páginas solo contienen 3 filas de bloques
- El corte natural de las líneas de bloque no incluye la sombra de los bloques de la última fila, por lo que esta sombra se imprime en la página siguiente.

---

### Caso 3 — overflow horizontal (axisX)
- Config:
  - carta
  - landscape
  - margins: normal

**Esperado:**
- múltiples páginas
- cortes en axisX
- continuidad horizontal correcta

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- Múltiples páginas, corte y continuidad horizontal son correctos.
- Se observan 5 páginas, tal como en el preview.
- No hay repeticiones
- Importante: se observa un cambio anómalo en la escala de la malla impresa (PDF), lo que supone una pérdida significativa de sincronización preview/PDF. La escala en la versión impresa corresponde a una reducción de 30% aprox. respecto del preview.

---

### Caso 4 — grid 2D (axisX + axisY)
- Config:
  - carta
  - landscape
  - margins: normal

**Esperado:**
- pagesX > 1
- pagesY > 1
- recorrido consistente de páginas
- sin páginas en blanco

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- ...

---

### Caso 5 — fit-to-width
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
- fit-to-width se comporta correctamente con grillas small, vertical y 2d
- fit-to-width también ajusta a una única página la grilla large-horizontal, pero este caso reproduce el déficit de escala en PDF, ya observado en la desincronización Print preview vs PDF para el mismo caso de la malla large-horizontal

---

### Caso 6 — política editorial
- Config:
  - título: ON
  - header/footer: ON
  - layout: first-page-only

**Esperado:**
- título solo en primera página
- header/footer según política
- numeración correcta

**Resultado:**
- [x] OK
- [ ] FAIL

Notas:
- ...

---

## 🧪 Invariantes verificadas

- [x] pageCount = pagesX * pagesY
- [x] no páginas en blanco
- [x] tiles no solapados
- [x] continuidad visual entre páginas
- [x] preview consistente con PDF (razonablemente)

---

## ⚠️ Issues conocidos

| ID | Descripción | Estado |
|----|------------|--------|
| #1 | diferencia en escala de PDF respecto de preview, solo en malla large-horizontal, en cualquier fixture de página y orientación | abierto |

---

## 🧭 Historial

### 2026-03-18 — PR11
- estabilización de impresión
- mejoras en tests
- fixes menores

Resultado general:
- [ ] OK
- [x] OK con observaciones
- [ ] FAIL

Notas:
- ...