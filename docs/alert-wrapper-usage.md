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