0) Posibles targets de la paleta de color y
criterios básicos
El formato del bloque maestro, en términos de color, depende de tres parámetros seleccionables por
el usuario:
a) color de fondo de una celda activa (o de una combinación de celdas);
b) color de fondo condicional de una celda activa (o de una combinación), en el caso de checkboxes;
y
c) color de fondo condicional de una celda activa (o de una combinación) de tipo TextArea,
dependiente de una selección en un listbox configurado en otra celda activa del mismo bloque.

Los siguientes criterios puede servir para la construcción de paletas alternativas:

en general, escalas de colores claros que permitan contraste con los textos (labels e inputs en
textboxes).
en general, colores distinguibles en pantalla.
escalas de colores más intensos o contrastantes con 1 para los casos b (checkboxes activos que
se destacan)
escalas de colores claros, pero distinguibles o contrastantes con 1, para los casos c.
todo lo que el usuario no toca en términos de color, permanece con color por defecto.
Enfoque práctico para equilibrar legibilidad, diferenciación y contraste y una guía de
implementación paso a paso pensando en tu app (GlobalMenuBar + editores + publicación).

1) Idea clave: de “colores sueltos” a “roles
de color”
Antes que colecciones de hex aleatorios, define roles semánticos y deja que cada proyecto asigne
una paleta a esos roles. Así, los editores muestran sugerencias y “quick picks” consistentes; si la
persona quiere, puede seguir usando el selector RGB de siempre.

Roles mínimos (fondo claro por defecto):

● --bg-base: blanco del lienzo (malla).
● --text-default: texto normal (negro/gris muy oscuro).
● --border-muted: contornos sutiles.
● --cell-active: fondo claro para celdas activas (caso a).
● --cell-active-text: texto sobre --cell-active.
● --checkbox-on: fondo/realce de checkbox activo (caso b), más intenso.
● --checkbox-on-text: texto/ícono sobre ese fondo.
● --option-N: fondos claros para N categorías (caso c).
● --option-N-text: texto sobre cada opción.
Todo lo no tocado permanece blanco (--bg-base), tal como pides.
2) Criterios de color (cómo “equilibrar”)
Trabaja en OKLCH/OKLab (o LCH) porque:

● Mantiene la perceptualidad (lo que “se ve” como diferencia real).
● Es fácil controlar tres cosas: luminosidad (L) , cromaticidad (C) y hue (H).
Reglas prácticas:

● Legibilidad (texto vs. fondo) : apunta a contraste WCAG AA.
○ Texto normal: ≥ 4.5:1 con su fondo.
○ Texto grande (≥18 px o semibold ≥14 px): ≥ 3:.
● Diferenciación (entre tipos) :
○ Para fondos de categorías (caso c): separa los hues de forma casi equidistante.
○ Garantiza diferencia perceptual (ΔE_oklab) entre opciones; como regla simple, apunta
a ΔE ≥ 0.08–0.10 entre colores vecinos (evita “parecer iguales”).
● Contraste (destacados) :
○ checkbox-on debe ser más vivo: mayor C y menor o mayor L según contraste con
texto.
● Paletas claras :
○ Usa L altos (p. ej., 0.92–0.97) para fondos de celdas, así el texto oscuro contrasta
bien.
○ Para checkbox-on, usa C medio-alto (vivo) con L medio (0.7–0.8) o L alto si usarás
texto oscuro u oscuro si usarás texto claro; lo definimos automáticamente (ver §
“autocorrección de contraste”).
3) Construcción de paletas (lo que verá el
usuario)
Ofrece en GlobalMenuBar > “Paleta del proyecto” una lista corta pero sólida:

● Pastel Neutro (predet.): 1–2 hues suaves (celeste/verde), cell-active en L 0.95, C baja;
checkbox-on en misma familia pero con C mayor; option-N con 4–6 tonos suaves (hues
espaciados).
● Monocromática Suave : un solo hue con steps de C y L (útil si quieren estética muy limpia).
● Categorías Claras : 6–8 hues bien separados (por ej. 20°, 70°, 140°, 200°, 260°, 320°) todos
con L ~0.94 y C baja para fondos, y acento “checkbox-on” aparte.
● Alta Distinción : similar a “Categorías Claras” pero con C ligeramente superior (igual cuidando
texto).
Cada opción se muestra con un preview : mini-grid con texto de ejemplo, check activo/inactivo y 4– 6
opciones de “lista”.

4) Mapeo de los casos (a, b, c)
● (a) Fondo de celda activa → --cell-active (pastel claro, L ~0.94–0.97, C baja). Texto
sobre este fondo usa --cell-active-text (generalmente #111 o #222).
● (b) Checkbox activo → --checkbox-on (mismo hue base que la paleta o un acento
definido), con C media-alta; --checkbox-on-text decide automáticamente negro/blanco
según contraste.
● (c) Listbox condiciona el fondo de otra celda → --option-1 ... --option-k (k =
cantidad de opciones); todos claros (L altos), hues equiespaciados, C baja a media-baja; el
texto usa --option-N-text (auto negro/blanco).
Si la persona usuaria no activa paleta, sigues con los selectores RGB actuales. Si la
activa, la UI prioriza “quick picks” por rol (con los tokens) cuando se activa “pintar con
paleta” para un control; si no mantiene opciones de personalización.
5) Autocorrección de contraste (para que
“nunca quede mal”)
Implementa una pequeña función de “auto text color” por rol:

● Dado un fondo (en sRGB pero mejor en OKLCH bajo el capó), calcula luminancia y elige
text entre negro (#111) o blanco (#FFF) para cumplir ≥ 4.5:.
● Si no llega, ajusta ligeramente L del fondo (±2–4 puntos) o C hacia abajo hasta cumplir. Hazlo
en el generador de paleta, no en cada celda; así todo el proyecto queda “limpio”.
● Repite lo mismo para bordes: si border-muted sobre bg-base no alcanza ~ 1.8:1–2.2:
(sutileza legible), ajusta L.
6) Cómo integrarlo en lu arquitectura (sin
Tailwind, React + Vite)
6.1. Modelo de datos del proyecto
Agrega en el “Project Settings”:

{
"theme": {

"paletteId": "categorias-claras",

"seedHue": 200, // opcional, si la paleta lo usa
"generated": { "...": "..." } // colores ya resueltos a hex (tokens)

}

}

● paletteId: una de las paletas que ofreces.
● generated: un objeto plano con tokens CSS (ver abajo). Persistes el resultado para que
export/import funcione y las vistas sean rápidas.
6.2. Tokens CSS a nivel de proyecto

● Cuando el proyecto está abierto, inserta un data-theme="project" en la raíz del área de
trabajo.
● Inyecta CSS variables (por ejemplo, en un <style> o en una hoja CSS generada) con los
tokens:
[data-theme="project"] {

--bg-base: #FFFFFF;
--text-default: #111111;

--border-muted: #E5E7EB;

--cell-active: #F2F7FF;
--cell-active-text: #111111;

--checkbox-on: #2E7BEF;
--checkbox-on-text: #FFFFFF;

--option-1: #F6FAFF;
--option- 1 - text: #111111;

--option-2: #F6FFF8;

--option- 2 - text: #111111;
/* ...hasta k opciones */

}

● Tus componentes usan solo variables. Así, cambiar de paleta no toca la lógica de
componentes.
6.3. Prioridad y “opt-out” por celda

● Si la persona elige un color manual para una celda, guardas ese valor en la celda. En el
render, si hay color manual, úsalo; si no, usa el token del rol.
● La UI de color muestra:
○ Quick picks (tokens de paleta del proyecto).
○ Selector (RGB/hex) como hoy.
7) Generación de paletas (reglas concretas)
7.1. Para cell-active (a)

● Toma el hue base (si aplica). Fija L = 0.94–0.96 , C = 0.03–0.06 (pastel).
● Calcula cell-active-text auto (negro casi siempre).
7.2. Para checkbox-on (b)

● Mismo hue o un hue de acento. L = 0.70–0.80 , C = 0.10–0.16 (vivo pero legible).
● Decide checkbox-on-text (blanco si L < 0.8 y C alto; de lo contrario negro) cumpliendo ≥
4.5:1. Ajusta L si hace falta.
7.3. Para option-N (c)

● Elige N hues equiespaciados (si N=4: 20°, 110°, 200°, 290°; si N=6: ~60° de separación, etc.).
● Fija L = 0.93–0.96 para todos (fondos claros); C = 0.04–0.08 (sutil pero distinguible).
● Asegura ΔE_oklab ≥ 0.08 entre vecinos. Si no, corrige ligeramente C o mueve hue ±5–10°.
● option-N-text auto (negro casi siempre).
7.4. Bordes y tipografía

● border-muted: gris con L cercana a --bg-base pero suficiente para ~2:1 con bg-base.
● text-default: #111 o #222; garantiza ≥ 12:1 con bg-base (gran legibilidad general).
8) UI en GlobalMenuBar
● Entrada simple : “Paleta del proyecto...” (modal para configurar y activar. Esta activación está
conectada con el toggle del FormatStylePanel).
● Editor de paleta (configuración para el proyecto) :
○ Selector de paleta base (Pastel Neutro, Categorías Claras, etc.).
○ Opcional: semilla de color (hue) si la paleta lo usa.
○ “Recalcular paleta” → muestra preview (mini malla con checkbox y opciones).
○ Indicadores de contraste (✔/⚠) por rol.
○ Botón “Aplicar al proyecto”.
● Previsualización en vivo en una mini-grid 10×10 con:
○ 3 – 4 celdas con cell-active.
○ Un checkbox activo.
○ 4 – 6 celdas coloreadas por option-N con texto simulando labels/inputs.
9) Publicación/Export
● Al exportar o publicar la malla, incluye en el payload/JSON los tokens resueltos. Así, la malla
se ve igual en otros contextos (visor “solo lectura”).
10) Compatibilidad y fallback
● Si no hay paleta activa en el proyecto → todo funciona como hoy.
● Si la persona modificó colores manualmente, esos prevalecen sobre los tokens.
11) Validaciones automáticas (sin molestar a
la persona)
● Al generar la paleta, corre un validador :
○ Para cada rol que tenga texto superpuesto, comprueba WCAG y ajusta.
○ Para option-N, comprueba ΔE entre opciones; si N es grande y el espacio de
diferencia se te acaba, repite hues pero alterna patrón de borde (p. ej. borde
punteado vs. sólido) o ligeras variaciones de L para mantener distinguibilidad.
● En la UI, muestra solo un pequeño ícono (✔/⚠); no bloquees la acción salvo que el contraste
sea muy deficiente.
12) Ideas para un Roadmap de
implementación (no exhaustivo, se puede
ampliar o reducir)
Modelo + tokens : añade Project.theme, define lista de tokens y conéctalos a CSS
variables.
Generador (puro): funciones para crear paletas desde parámetros (OKLCH/LCH), + validación
de contraste y ΔE.
UI GlobalMenuBar : selector + preview + aplicar.
Quick picks en los editores: muestran los tokens primero; dejan el selector RGB actual como
“avanzado”.
Persistencia y export : guarda tokens y aplícalos al render publicado.
Pruebas visuales : grids sintéticos para verificar legibilidad en distintos monitores.