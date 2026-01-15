# API final de confirmaciones y prompts

`src/ui/alerts.ts` expone las APIs definitivas para confirmaciones y prompts asincrónicos. Ambas dependen del `ConfirmProvider` global, por lo que no realizan fallback a las APIs nativas del navegador.

```ts
import { confirmAsync, promptAsync } from '../ui/alerts';

const confirmed = await confirmAsync({
  title: 'Confirmación de prueba',
  message: '¿Quieres continuar?',
  confirmLabel: 'Sí, continuar',
  cancelLabel: 'Volver',
  variant: 'destructive',
});

const newName = await promptAsync({
  title: 'Renombrar proyecto',
  message: 'Ingresa el nuevo nombre',
  placeholder: 'Nuevo nombre',
});
```

## Reglas rápidas
- No hay soporte para `window.alert` ni `window.confirm`; las llamadas deben pasar por los proveedores (`ToastProvider` + `ConfirmProvider`).
- Usa `useToast` para feedback inmediato y `confirmAsync`/`promptAsync` para decisiones que requieran confirmación o entrada de datos.
- Mockea `confirmAsync`/`promptAsync` en tests en lugar de espiar APIs del navegador.

## Notas de integración
- Si el árbol de React no está envuelto por `ConfirmProvider`, `confirmAsync` y `promptAsync` lanzarán un error explícito para evitar regresiones silenciosas.
- Los textos por defecto (`confirmLabel`, `cancelLabel`) y normalización del prompt se resuelven dentro del provider, manteniendo la consistencia visual y de UX.