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
- **Bug de Cupones sin Límites (Usos Infinitos):** Solucionado a dos niveles. 
  1. La API de validación no leía el ID del cupón correctamente (arreglado en el frontend). 
  2. La tabla `cupones_historial` no existía en la base de datos, lo que causaba que el backend ignorara en silencio las inserciones de historial y permitiera a los clientes usar el mismo cupón repetidamente. Se generó el script SQL para crear la tabla y se fortaleció la API de `checkout` para que cualquier error de Supabase se registre en los logs y no vuelva a fallar en silencio.
- **Validación del Sistema Anti-Fraude:** Se confirmó en producción que la prevención de dobles reservas funciona perfectamente (retornando un error HTTP 403) si un cliente intenta agendar mientras tiene otra cita pendiente de pago.

## 4. Estabilización de Base de Datos y APIs
- **Relaciones de Clientes:** En la tabla `citas`, se implementó correctamente el modelo donde la Amiga se guarda en la tabla `clientes`, y sus citas se ligan a ella mediante `cliente_id`, estableciendo un lazo con la Titular a través del campo `reserva_titular_id`.
- **Limpieza de Logs:** Se eliminaron todos los console.logs intensivos de depuración en producción para dejar un código limpio y eficiente.

## 5. Automatización y Mantenimiento Automático (Cron Jobs)
Para evitar que la base de datos se llene de "basura" por intentos fallidos de reserva (bloqueos temporales abandonados y preagendas expiradas por falta de pago), se habilitaron tareas programadas automáticas directamente en el motor de PostgreSQL:
- **Activación de `pg_cron`**: Se instaló y habilitó la extensión `pg_cron` en la base de datos de producción en Supabase.
- **Job de Liberación Dinámica (`limpieza-locks-frecuente`)**: Configurado para ejecutarse **cada 10 minutos** (`*/10 * * * *`). Llama a la función `cleanup_expired_locks()`, cancelando de forma silenciosa e inmediata en segundo plano cualquier bloqueo temporal (>10 min) o preagenda (>1 hora) que haya expirado sin completarse. Esto independiza la liberación de horarios de las visitas del usuario en la web.
- **Job de Purga Nocturna (`borrado-basura-nocturno`)**: Configurado para ejecutarse **todos los días a las 2:00 AM** (`0 2 * * *`). Realiza un borrado físico (`DELETE`) de todos los registros en estado `CANCELADA_SISTEMA`, asegurando que la tabla `citas` se mantenga ligera, rápida y óptima a largo plazo sin acumulación inútil de datos.

## 6. Optimizaciones en la Experiencia de Usuario (UI/UX) y Modales
- **Corrección del Temporizador de Pre-Agenda:** Se solucionó el bug donde el contador seguía corriendo en segundo plano tras confirmar la reserva, disparando erróneamente la modal de "Tiempo Expirado" en la pantalla de éxito. Ahora el temporizador se limpia automáticamente al concretar la reserva.
- **Mejora en Interfaz de Éxito y "Mis Citas":** En la pantalla final, al elegir abonos que requieren envío de comprobante, el botón ahora lanza el mensaje hacia WhatsApp de forma más clara, y se añadió un botón secundario ("Ir a Mis Citas") para redirigir rápidamente al panel del cliente.
- **Gestión Autónoma de Citas Pendientes (Error 403):** Se afinó el error de reserva duplicada. Si un usuario intenta agendar teniendo ya una reserva en estado "Pendiente de pago", la alerta de error incluye un botón de acceso directo al portal de "Mis Citas", permitiendo al usuario cancelar la cita bloqueante sin requerir atención humana.
- **Corrección de Hydration Mismatch en Dashboard:** Se solucionó un error crítico de hidratación de React en el portal de cliente. Node.js y el navegador usaban diferentes espacios (ej. `\u202f` indivisible vs espacio normal) al formatear las horas (AM/PM). Se normalizó la salida de `toLocaleTimeString`, garantizando renderizado perfecto entre Server y Client.

## Estado Final del Sprint
El flujo "End-to-End" de Reservas Compartidas ahora está **100% funcional**, desde la selección del catálogo hasta la reserva asíncrona concurrente, validación contra bloqueos simultáneos (protección contra doble reserva), y enrutamiento a WhatsApp con los datos consolidados. La base de datos ha quedado blindada con mantenimiento autónomo y el portal de cliente (Dashboard) opera de manera resiliente, sin fallas de hidratación ni modales atascados.

## 7. Flexibilidad de Horarios y Textos Dinámicos
- **Reducción de Buffer de Reserva:** Se redujo el tiempo de anticipación ("buffer") requerido para una cita de 30 minutos a **15 minutos**. Esto optimiza la disponibilidad para clientes de cercanía sin saturar el sistema.
- **Información Dinámica en Calendario:** El recuadro informativo de horarios (Paso 2) ahora consulta la base de datos en tiempo real (tabla `horarios`), en lugar de tener valores fijos. Muestra con precisión el nombre y hora del profesional involucrado de acuerdo con los servicios escogidos y el día específico seleccionado en el calendario (ej: *Horario de atención hoy: Mile de 9:00 AM a 10:00 PM*).
- **Cierre Dinámico del Día:** El front-end inhabilita el botón de "hoy" (o lo muestra sin cupos) si la hora actual supera la hora de cierre parametrizada en la base de datos para ese específico día de la semana.
- **Supabase Realtime (WebSockets):** Se implementaron escuchadores en vivo para las tablas `servicios`, `horarios`, `configuracion`, `dias_bloqueados` y `citas`. Esto permite que cualquier cambio administrativo (como adelantar la hora de cierre, desactivar servicios o bloquear días) o reservas hechas por otros clientes actualicen inmediatamente la disponibilidad en la pantalla de todos los usuarios sin necesidad de recargar la página, logrando prevención de choques en cuestión de milisegundos.
- **Inmunidad al Caché (Cache Busting):** Se implementó un algoritmo avanzado de evasión de caché para el motor en tiempo real. Cuando los "listeners" de Supabase detectan un cambio, el código aplica un retraso táctico de `500ms` para asegurar la confirmación del dato, e inyecta timestamps dinámicos (`?t=Date.now()`) o usa consultas asíncronas directas al SDK para evadir el caché agresivo de Next.js y los navegadores, forzando un refresco visual garantizado.

## 8. Optimizaciones Extra de Interfaz
- **Flujo de Expiración (10 min):** Se corrigió un error de estado en la modal de "Tiempo Expirado". Al hacer clic en "Elegir otra hora", el cliente ahora es retornado automáticamente al calendario (Paso 2) para re-agendar, en lugar de quedarse atascado en el formulario de la reserva vencida.
