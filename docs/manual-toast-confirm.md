# Pruebas manuales de Toast y Confirm Modal

Estas pruebas están pensadas para validación rápida en modo `dev` usando los botones temporales agregados al layout.

## Preparación
1. Ejecuta `npm install` si es la primera vez.
2. Inicia la app con `npm run dev` y abre la URL indicada.
3. Asegúrate de que el entorno esté en modo desarrollo (los controles flotantes con la etiqueta "Dev: feedback UI" deben aparecer en la esquina inferior derecha).

## Mostrar toast
1. Haz clic en **"Mostrar toast"** en el panel dev.
2. Verifica que aparezca un toast en la parte superior derecha con el mensaje "Toast de prueba: este mensaje se cierra automáticamente.".
3. Comprueba que el toast desaparezca solo tras unos segundos o al pulsar la **x**.

## Confirmar o cancelar modal
1. Haz clic en **"Abrir confirm modal"** en el panel dev.
2. Verifica que se muestre un modal centrado con título "Confirmación de prueba" y botones "Confirmar" y "Cancelar".
3. Pulsa **Confirmar**:
   - El modal debe cerrarse.
   - Debe aparecer un toast verde indicando "Confirmación aceptada desde el modal.".
4. Repite la prueba pulsando **Cancelar** o la tecla **Escape** para cerrar:
   - El modal debe cerrarse.
   - Debe mostrarse un toast rojo indicando "Confirmación cancelada desde el modal.".
5. Opcional: prueba la tecla **Enter** dentro del modal; debe comportarse como Confirmar.