📘 README — Proyecto Mallas Curriculares






🎯 Descripción del proyecto

Mallas Curriculares es una aplicación web que permite construir, organizar y visualizar mallas curriculares universitarias a partir de bloques visuales interactivos.

Cada bloque curricular consiste en una grilla 10x10 de celdas configurables que pueden:

Definirse como activas o inactivas

Contener diferentes tipos de entrada (texto libre, texto estático, checkbox, lista desplegable, etc.)

Agruparse visualmente (fusión estilo Excel)

Reutilizarse como piezas curriculares dentro de una macro-grilla (malla completa)

El proyecto se inspira en la flexibilidad de Excel, pero orientado a una interfaz web moderna, modular y escalable.

✨ Características principales

Editor de plantilla (bloque lógico 10x10 con controles y fusiones visuales).

Editor de malla (macro-grilla para organizar múltiples bloques).

Piezas curriculares: derivadas de un bloque maestro, con dos modalidades:

Referenciadas (se actualizan si el maestro cambia).

Snapshots (copia estática e independiente).

Panel contextual con acciones de edición (combinar, separar, configurar celdas).

Persistencia en JSON (guardar y cargar diseños de bloques y mallas).

Modo vista para representación no editable.

🛠️ Stack tecnológico

React
 (con Vite)

TypeScript

CSS modular

Persistencia en JSON

(Futuro) Integración con base de datos y backend

🚀 Instalación y uso

Clonar el repositorio:

git clone https://github.com/jejimenezc/MallaVisual.git
cd MallaVisual

Instalar dependencias:

npm install


Ejecutar en desarrollo:

npm run dev


Compilar para producción:

npm run build

## Estructura de carpetas (alto nivel)

```
src/
  components/        # UI reutilizable (StatusBar, etc.)
  screens/           # Páginas (HomeScreen, BlockEditor, Repo, MeshEditor)
  hooks/             # Hooks compartidos (useUnsavedGuard, etc.)
  state/             # Estado/selector(es) si aplica
  lib/               # Utilidades puras
public/
```

## Rutas y navegación (visión)
- Escritorio (HomeScreen)
- Diseño de bloque (BlockEditor)
- Repositorio de bloques (RepositoryScreen)
- Diseño de malla (MeshEditor)

> Botón **“→ Malla”** y **NavTabs** deben compartir el *mismo guard* de navegación.

## Estados y persistencia
- **Proyecto actual** (único) vs **proyectos recientes** (lista en LocalStorage).
- **Bloque maestro** vs **Pieza referenciada** vs **Snapshot**.
- **Edición efímera**: editar en memoria y **Actualizar repositorio** para propagar.

## Convenciones de commits
Usa Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

## Glosario de términos
Consulta **GLOSSARY.md** (fuente oficial de terminología).

📘 Terminología oficial

Este proyecto mantiene un GLOSSARY.md
 con las definiciones técnicas de los términos clave:

Bloque curricular lógico

Bloque curricular visual

Bloque maestro

Pieza curricular (referenciada / snapshot)

Macro-grilla, macro-celda

…y más

⚠️ Todos los commits, issues, PRs y documentación deben usar la terminología oficial definida en el glosario.

Para interacciones con IA (Codex, GPT-5, etc.), indicar siempre:
“Usa la terminología definida en GLOSSARY.md”

📍 Estado actual

✅ Base de proyecto creada con React + Vite

✅ Editor de bloque (activación, fusión, tipos de entrada básicos)

✅ Panel contextual inicial

✅ Persistencia con JSON (guardar/cargar)

🔄 En progreso: consolidación de editor de malla y gestión de bloques maestros

📅 Roadmap (fases previstas)

Consolidar editor de plantilla (tipos de entrada, panel contextual avanzado).

Completar editor de malla curricular (macro-grilla).

Persistencia avanzada (import/export múltiple, histórico de versiones).

Vista “solo lectura” (presentación de mallas sin edición).

Integración con base de datos (guardar mallas y bloques en servidor).

Colaboración multiusuario en tiempo real.

🤝 Contribuciones

Revisa primero el archivo GLOSSARY.md
 antes de proponer cambios.

Abre un issue describiendo el problema o la nueva funcionalidad.

Envía tu Pull Request asegurando consistencia con la terminología.

📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.