# Pruebas manuales de Toast y Confirm Modal

Estas pruebas usan los flujos reales de la aplicación y no dependen de controles temporales.

## Preparación
1. Ejecuta `npm install` si es la primera vez.
2. Inicia la app con `npm run dev` y abre la URL indicada.

## Mostrar toast
1. Importa un archivo de proyecto corrupto o renómbralo temporalmente para que falle la lectura.
2. Verifica que aparezca un toast de error en la parte superior derecha con el mensaje "Archivo inválido".
3. Comprueba que el toast desaparezca solo tras unos segundos o al pulsar la **x**.

## Confirmar o cancelar modal
1. Con un proyecto cargado y cambios sin publicar, intenta **Cerrar proyecto**.
2. Verifica que se muestre un modal centrado con título "Cerrar proyecto sin guardar" y botones "Cerrar sin guardar" y "Seguir editando".
3. Pulsa **Cerrar sin guardar**:
   - El modal debe cerrarse.
   - El proyecto debe cerrar y regresar al inicio.
4. Repite la prueba pulsando **Seguir editando** o la tecla **Escape** para cerrar:
   - El modal debe cerrarse.
   - Debes permanecer en el proyecto actual sin perder cambios.
5. Opcional: prueba la tecla **Enter** dentro del modal; debe comportarse como confirmar.