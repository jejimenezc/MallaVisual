# Fase 4b (fix) — Corrección del bug de “Nuevo proyecto” con malla parcialmente heredada  
### Prompt para agente — Proyecto MallaVisual

Tu tarea en esta fase es **localizar y corregir** un bug específico que afecta al flujo de creación de nuevos proyectos en MallaVisual, respetando la arquitectura de firmas (signatures) y el sistema de autosave ya refactorizado en fases anteriores.

## 0. Contexto resumido (asunciones obligatorias)

- Estás trabajando sobre el repositorio **MallaVisual**, en una rama donde ya se ejecutaron las fases previas de refactorización del sistema de detección de cambios mediante **firmas**.
- El **MallaEditorScreen** usa autosave basado en una clave única de almacenamiento y rehidrata mediante `loadDraft` cuando no recibe `initialMalla`.
- `App.tsx` gestiona flujos de proyecto y borra manualmente la clave de autosave en `localStorage`.

## 1. Descripción del bug
Al crear un **Nuevo proyecto** desde el **MallaEditorScreen**, sin cerrar antes el proyecto activo, el nuevo proyecto hereda parcialmente la malla del anterior (grid, piezas, valores, tema).  
Este bug no ocurre cuando el nuevo proyecto se crea desde otra pantalla.

## 2. Hipótesis de origen
El bug proviene de la interacción entre:  
1) el borrado manual del autosave en `App.tsx`, y  
2) el `flushAutoSave()` que se ejecuta al desmontar el `MallaEditorScreen`, el cual **vuelve a escribir** el draft del proyecto anterior.

## 3. Objetivo de la fase
Implementar un **fix preciso y testeable** que impida herencias de malla entre proyectos, sin romper el sistema de firmas ni flujos existentes (autosave, reapertura, cierre).

## 4. Restricciones
- No romper ni desactivar la lógica de firmas.
- Mantener una API clara entre `App.tsx` y el autosave.
- Minimizar el impacto del cambio.
- Mantener compatibilidad con flujos actuales.
- El cambio debe ser acotado y reversible.

## 5. Trabajo solicitado

### 5.1 Auditoría del flujo “Nuevo proyecto”
Revisar en `App.tsx`:
- Asignación de `projectId` y `projectName`.
- Momento en que se borra la clave del autosave.
- Momento en que se dispara el unmount del `MallaEditorScreen`.

### 5.2 Auditoría del autosave de la malla
Revisar:
- Uso de `loadDraft`, `autoSave`, `flushAutoSave`.
- Confirmar que el `flushAutoSave` del proyecto A sobrescribe el borrado que hace `App.tsx`.

### 5.3 Diseñar la estrategia del fix

Proponer una de estas estrategias (o combinación):

#### Estrategia A — Namespacing por `projectId`
Cada malla se guarda bajo una clave distinta, evitando colisiones entre proyectos.

#### Estrategia B — Protocolo de reset coordinado
Agregar API como `clearDraft()` en `useProject` para invalidar el draft sin que el unmount posterior lo reactive.

#### Estrategia C — Reordenar flujo
Hacer que el borrado ocurra después del desmontaje del `MallaEditorScreen`.

Debe seleccionarse la estrategia más segura y coherente con las firmas.

### 5.4 Implementación
- Modificar solo lo necesario.
- Documentar claramente el origen del bug y el motivo del fix.
- No introducir flags ad‑hoc que rompan la estabilidad del sistema.

### 5.5 Validación manual
Comprobar:

1. **Caso 1 – Reproducción del bug original (debe desaparecer).**  
2. **Caso 2 – Nuevo proyecto desde otro screen.**  
3. **Caso 3 – Reapertura con autosave.**  
4. **Caso 4 – Cerrar proyecto y abrir otro.**

---

## 6. Entregables
- Implementación del fix.  
- Comentarios en el código explicando causa raíz y estrategia.  
- Commit aislado.  
- Validación manual completa.

---

**Objetivo final:**  
Evitar que un nuevo proyecto herede cualquier estado de malla del proyecto anterior, preservando la arquitectura refactorizada y la estabilidad del autosave basado en firmas.
