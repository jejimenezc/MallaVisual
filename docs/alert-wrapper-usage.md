# Uso de `showAlert` y `askConfirm`

Para mantener la compatibilidad mientras se migran las alertas y confirmaciones nativas, usa la capa de compatibilidad en `src/ui/alerts.ts`.

```ts
import { showAlert, askConfirm } from '../ui/alerts';

showAlert('Mensaje informativo');

const confirmed = askConfirm('¿Deseas continuar?');
if (!confirmed) return;
```

## Reglas rápidas
- No llames directamente a `window.alert` ni `window.confirm`; siempre usa los wrappers.
- Prefiere inyectar o mockear `askConfirm`/`showAlert` en tests en lugar de espiar las APIs nativas.
- Esta API es sincrónica a propósito para no alterar flujos existentes; la versión asíncrona llegará en una fase posterior.

## confirmAsync: guía rápida (modo mixto)

`confirmAsync` es la versión basada en `Promise<boolean>` que intenta usar el `ConfirmProvider` global. Si el contexto no está disponible (por ejemplo, en utilitarios puros o tests sin provider) hace fallback a `window.confirm` conservando el formato.

```ts
import { confirmAsync } from '../ui/alerts';

const confirmed = await confirmAsync({
  title: 'Confirmación de prueba',
  message: '¿Quieres continuar?',
  confirmLabel: 'Sí, continuar',
  cancelLabel: 'Volver',
  variant: 'destructive',
});
```

### Cuándo usar cada wrapper

- **Dentro de React con provider:** usa `await confirmAsync(options)`. Se renderiza el modal global y respeta variantes (`default`, `info`, `destructive`).
- **Fuera de React o sin provider:** `confirmAsync` cae automáticamente a `window.confirm` uniendo `title` + `message`, por lo que sigue funcionando en utilidades o tests legacy.
- **Sin async/await:** `askConfirm` sigue disponible mientras duren las migraciones, pero prioriza el flujo asíncrono para nuevas integraciones.

### Tips de migración

- Centraliza las etiquetas (`confirmLabel`, `cancelLabel`) y títulos por flujo para mantener la consistencia.
- Si necesitas inyectar dependencias en utilitarios, pasa `confirmAsync` como argumento para que puedan usar el modal cuando haya provider disponible.