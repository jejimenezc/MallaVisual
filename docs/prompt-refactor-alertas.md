# Prompt para Agente – Refactorización Progresiva de Alertas y Confirmaciones

## Rol del agente
Tu tarea es diseñar e implementar una **refactorización progresiva y segura** del sistema de alertas y confirmaciones de una app React existente (MallaVisual), reemplazando `window.alert` y `window.confirm` por componentes propios (toasts y modal de confirmación), **sin romper los flujos actuales**, especialmente los relacionados con **validaciones** y **persistencia entre Screens**.

## Contexto actual
- La App está escrita en **React + TypeScript**.
- Actualmente usa **APIs nativas del navegador**:
  - `window.alert` para feedback inmediato.
  - `window.confirm` para confirmaciones críticas.
- Un intento previo de refactorización rompió la App, debido a:
  - Diferencia entre confirmaciones sincrónicas y nuevas confirmaciones asincrónicas.
  - Dependencias con validaciones y persistencia entre Screens.

El objetivo es repetir el esfuerzo con una **estrategia incremental**, que permita:
- Integrar la nueva UI sin romper flujos.
- Mantener un fallback temporal.
- Poder revertir fácilmente si algo falla.

---

## Objetivo general
Migrar completamente las alertas/confirmaciones nativas hacia:

1. **Sistema de Toasts**:
   - No bloqueante.
   - Consistente, estilizado.
   - Variantes (success, error, info).

2. **Sistema global de Confirmación**:
   - Modal centralizado.
   - API basada en `Promise<boolean>`: `confirm` recibe opciones.

La migración debe ser **progresiva** y apoyarse en una **capa de compatibilidad**.

---

## Restricciones y prioridades
1. No romper flujos críticos (edición, borrado, navegación, persistencia).
2. Refactorización progresiva, PRs pequeños, revertibles.
3. Crear una capa de compatibilidad que permita coexistencia entre:
   - confirmaciones sincrónicas (legacy)
   - confirmaciones asincrónicas (nuevas)
4. Transparencia para QA: cada fase debe venir con casos de prueba manuales.
5. Código limpio, sin duplicar lógica de negocio.

---

## Arquitectura propuesta

### 1. Capa de compatibilidad
Crear `src/ui/alerts.ts` como fachada única hacia los nuevos providers. La capa inicial puede exponer `showAlert`/`askConfirm` para mantener firmas, pero deben delegar en toasts o el modal global, nunca en APIs nativas. Más adelante se agrega `confirmAsync(options): Promise<boolean>` y `promptAsync(options): Promise<string | null>` como contratos definitivos.

**Ninguna parte de la App debe seguir llamando directo a `window.alert` / `window.confirm`; los wrappers deben encapsular la transición.**

---

### 2. Nuevos componentes
Crear:

- `ToastContext.tsx`  
- `ToastProvider`  
- `useToast`  
- `Toast.css`

- `ConfirmContext.tsx`  
- `ConfirmProvider`  
- `useConfirm`  
- `ConfirmModal.css`

Envolver la App en:

```tsx
<ToastProvider>
  <ConfirmProvider>
    <App />
  </ConfirmProvider>
</ToastProvider>
```

---

## Plan de trabajo por fases

### Fase 0 — Inventario y clasificación
Localizar cada uso de alert/confirm y clasificarlos según criticidad.  
**Entregable:** tabla markdown con inventario.

---

### Fase 1 — Capa de compatibilidad (sin cambios funcionales)
1. Implementar `alerts.ts`.
2. Reemplazar todas las llamadas directas a APIs nativas por wrappers.

**Entregable:** PR pequeño + checklist de QA.

---

### Fase 2 — Implementar ToastContext y ConfirmContext
Crear proveedores, hooks y estilos.  
Añadir botones de prueba en modo dev.

**Entregable:** PR + instrucciones de testeo.

---

### Fase 3 — Extender capa de compatibilidad con APIs asincrónicas (modo mixto)
Agregar:

```ts
export async function confirmAsync(options): Promise<boolean>
```

Con fallback a alertas/confirm nativos si no hay contexto disponible.

**Entregable:** PR + mini doc de cómo usar confirmAsync.

---

### Fase 4 — Migración progresiva por Screen
Migrar Screen por Screen:

- Reemplazar `askConfirm` por `await confirmAsync`.
- Cambiar funciones a `async` cuando corresponda.
- Reemplazar alertas por toasts vía `useToast` o wrappers.

**Caso especial:** utilitarios sin hooks como `proceed-to-malla.tsx`  
→ Deben recibir `confirm` y `toast` **inyectados como dependencias** desde el componente que los llama.

**Entregable:** PR por Screen + checklist de QA detallado.

---

### Fase 5 — Limpieza final
- Retirar fallback a APIs nativas.
- Eliminar el método sincrónico `askConfirm`.
- Asegurar que todo el código usa confirmaciones asincrónicas + toasts.

**Entregable:** PR de limpieza + doc final de API.

---

## Lo que debe entregar el agente
1. Afinar este plan según el código real.
2. Implementar Fases 1–3.
3. Diseñar y ejecutar la migración de Fase 4 (refactor funcional).
4. Documentar riesgos, cambios y casos de prueba manuales.
5. Mantener siempre la App operativa durante todo el proceso.

El objetivo principal es **una migración segura, reversible y progresiva** del sistema de alertas y confirmaciones.
