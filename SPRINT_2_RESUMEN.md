# Resumen de Sprint 2: Reservas Compartidas y Optimización del Motor de Citas

Durante este segundo sprint, nos enfocamos en habilitar las reservas compartidas (Titular + Amiga), desarrollar un motor de cálculo de disponibilidad avanzado, y perfeccionar el flujo de checkout. A continuación se detallan los hitos y correcciones implementadas:

## 1. Algoritmo "Rompecabezas" de Disponibilidad
- **Sincronización Multi-Profesional:** Se desarrolló la capacidad de agendar múltiples servicios paralelos con diferentes profesionales (ej: Titular con Mile, Amiga con Staff).
- **Cálculo de Superposición (Tetris):** El backend ahora evalúa cada bloque de tiempo disponible tomando en cuenta la duración de cada servicio, los tiempos de "buffer", y los horarios de almuerzo, asegurando que ambos clientes puedan ser atendidos en paralelo en el menor tiempo posible, optimizando las horas del local.
- **Deslizamiento de Bloques:** Se implementó una lógica donde el primer servicio del titular es rígido a la hora seleccionada, pero los servicios de la amiga y servicios subsiguientes pueden "deslizarse" hacia adelante para aprovechar tiempos muertos mientras una profesional se libera de la otra clienta.

## 2. Refinamiento en el Front-End (UI/UX)
- **Desglose de Horarios por Servicio Individual:** Se modificó la interfaz de "Resumen de Reserva" y el mensaje final de WhatsApp para que tanto el cliente titular como su amiga (en reservas compartidas) puedan ver **exactamente a qué hora arranca cada servicio individual** de manera secuencial, en lugar de mostrar únicamente la hora del bloque general.
  - **Fórmula de Consulta Directa:** Se implementó una lógica de mapeo que extrae la hora exacta de la base de datos a partir del objeto `lockedCitas` usando el identificador único `uid` de cada servicio.
  - **Huso Horario Garantizado:** Las horas se formatean usando la zona horaria `America/Bogota` (Colombia) a formato de 12 horas AM/PM, lo que garantiza consistencia absoluta sin importar la configuración regional o uso de VPNs por parte de los clientes.
  - **Integración Visual de la UI:** Se integró un indicador de hora elegante al lado de la duración de cada servicio (`• ⏰ X:XX AM/PM` en tono dorado) que hace transparente la distribución horaria del "Tetris" calculado por el backend.
  - **Mensaje de WhatsApp Estructurado:** Se actualizó el generador de la URL de WhatsApp para desglosar la reserva en líneas individuales ordenadas, detallando el nombre y la hora exacta de inicio de cada servicio asignado a cada persona.
- **Cálculo Estricto del Abono (50%):** Se ajustó el cálculo financiero en el frontend para que el abono requerido para agendar la cita sea siempre estrictamente el 50% del precio total de los servicios, eliminando discrepancias matemáticas previas.

## 3. Corrección de Bugs Críticos de Checkout y Lógica (Hotfixes)
- **Bug de "El horario ya fue tomado" en reservas cruzadas:** Solucionado. Existía una desincronización entre cómo `disponibilidad` y `bloqueo-temporal` armaban el Tetris para reservas compartidas complejas (donde Titular y Amiga cruzaban tiempos con el mismo profesional). `disponibilidad` era flexible y permitía que los primeros servicios "flotaran" para encontrar el encaje perfecto, mientras que `bloqueo-temporal` era rígido con el primer servicio, causando que fallara (error HTTP 409). Se actualizó `bloqueo-temporal` para usar exactamente la misma flexibilidad lógica, pero validando que el grupo en conjunto inicie a la hora solicitada.
- **Bug de Checkout en Reserva Compartida (Citas en Limbo):** Identificado y resuelto un bug crítico donde el frontend no enviaba el identificador interno (`uid`) en el payload de bloqueo. Esto causaba que la API devolviera las citas pre-bloqueadas sin `uid`, impidiendo al frontend hacer match entre los servicios del carrito y las filas de la base de datos. Como resultado, las reservas nunca pasaban a estado `PRE_AGENDADA` y se quedaban atascadas en `BLOQUEO_TEMPORAL`. Al enviar y mapear el `uid` correctamente, todo el flujo se desbloqueó (esto también solucionó que las horas individuales no se mostraran).
- **Bug de Cupones sin Límites (Usos Infinitos):** Solucionado. La API de validación devolvía el ID del cupón bajo la propiedad `cuponId`, pero el checkout intentaba leerlo desde `cuponActivo.id` (que era `undefined`). Esto causaba que los usos no se sumaran a la tabla `cupones` ni se registrara el historial por cliente en `cupones_historial`. Se corrigió el mapeo a `cuponActivo?.cuponId`, restaurando la restricción global de usos y la prevención de "un uso por número de teléfono".

## 4. Estabilización de Base de Datos y APIs
- **Relaciones de Clientes:** En la tabla `citas`, se implementó correctamente el modelo donde la Amiga se guarda en la tabla `clientes`, y sus citas se ligan a ella mediante `cliente_id`, estableciendo un lazo con la Titular a través del campo `reserva_titular_id`.
- **Limpieza de Logs:** Se eliminaron todos los console.logs intensivos de depuración en producción para dejar un código limpio y eficiente.

## Estado Final del Sprint
El flujo "End-to-End" de Reservas Compartidas ahora está **100% funcional**, desde la selección del catálogo hasta la reserva asíncrona concurrente, validación contra bloqueos simultáneos (protección contra doble reserva), y enrutamiento a WhatsApp con los datos consolidados.
