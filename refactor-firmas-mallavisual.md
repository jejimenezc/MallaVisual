# Refactorización Segura de Firmas en MallaVisual

Este documento describe las especificaciones completas para realizar una refactorización segura del sistema de detección de cambios (“firmas”) en el proyecto **MallaVisual**. El propósito es reemplazar las comparaciones basadas en serialización por un sistema centralizado de firmas memoizadas, aplicando una secuencia estricta, testeable y reversible.

---

## Regla General

La refactorización debe realizarse en fases claras.  
En cada fase, el comportamiento observable de la aplicación debe mantenerse estable antes de avanzar a la siguiente.

---

# FASE 0 — Inventario y Mapa de Impacto

### Objetivo
Levantamiento completo de todos los puntos del repositorio donde se realizan verificaciones de cambio de estado profundo.

### Instrucciones
1. Localizar todos los mecanismos de comparación profunda en el código.
2. Documentar ubicación, propósito y el flujo donde participan.
3. No modificar nada aún.

---

# FASE 1 — Centralizar la Igualdad en un Módulo Único

### Objetivo
Definir un módulo único donde resida toda lógica de comparación entre bloques y sus partes, manteniendo por ahora el mecanismo original.

### Instrucciones
1. Crear un módulo centralizado responsable de evaluar si dos contenidos son equivalentes.
2. Cambiar únicamente un punto del código para que utilice este módulo.
3. Confirmar que no cambia el comportamiento general.

---

# FASE 2 — Migrar Todas las Comparaciones al Nuevo Módulo

### Objetivo
Eliminar completamente las comparaciones profundas dispersas por el código.

### Instrucciones
1. Revisar el inventario de la Fase 0.
2. Sustituir todas las comparaciones manuales por el módulo centralizado.
3. Mantener la implementación interna sin alteraciones funcionales.

---

# FASE 3 — Introducir Firmas Memoizadas

### Objetivo
Agregar memoización dentro del módulo centralizado, sin cambiar su API pública y sin alterar la semántica observable.

### Instrucciones
1. Incorporar almacenamiento en caché por referencia para firmas ya calculadas.
2. Asegurar que la aplicación trata los objetos relevantes como inmutables.
3. No realizar cambios fuera del módulo centralizado.

---

# FASE 4 — Verificación por Flujos

### Objetivo
Verificar manualmente que la sincronización y comportamiento general siguen siendo correctos después de introducir memoización.

### Flujos a verificar
- Edición de bloque maestro y retorno a la malla.
- Alternancia entre maestros distintos.
- Cambio de proyecto y retorno.
- Correcto comportamiento del historial de cambios.

### Instrucciones
1. Realizar pruebas manuales siguiendo los flujos indicados.
2. Agregar temporalmente mecanismos de trazado si ayuda al diagnóstico.
3. Confirmar estabilidad antes de continuar.

---

# FASE 5 — Optimización Opcional de la Firma

### Objetivo
Reemplazar la estrategia interna de firma por un mecanismo más eficiente, sin cambiar el comportamiento externo ni la API pública.

### Instrucciones
1. Optimizar el cálculo de la firma dentro del módulo centralizado.
2. Mantener intacta la estructura de fases previas.
3. Verificar nuevamente los flujos principales.

---

# Criterios de Éxito

- No queda ninguna comparación profunda fuera del módulo centralizado.
- El comportamiento observable permanece estable durante las fases intermedias.
- La memoización reduce trabajo redundante sin alterar resultados.
- La sincronización de la malla funciona correctamente en todos los flujos conocidos.
- La refactorización es reversible y queda encapsulada.

---

# Restricciones

- No modificar la estructura pública de los tipos principales del proyecto.
- No alterar la lógica de navegación ni la lógica de historial.
- No introducir optimizaciones fuera del módulo de firmas.
- Mantener cada fase aislada y verificable.

---

Este documento debe guiar paso a paso el rediseño del sistema de firmas en MallaVisual de forma segura y controlada.
