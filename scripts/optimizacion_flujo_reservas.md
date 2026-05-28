# Optimización del Flujo de Reservas (Manejo de Estados y Recargas)

Este documento detalla las soluciones técnicas implementadas para estabilizar el flujo de reservas (Paso 0 al Paso 4) frente a recargas accidentales (F5) o navegación agresiva por parte del usuario, asegurando una Experiencia de Usuario (UX) premium sin parpadeos ni pérdida de datos.

---

## 🛑 1. Problema de Parpadeo ("Flicker") en Pantalla de Reglas
**El Problema:** Al recargar la página en los pasos 3 o 4, el estado inicial de React (`rulesAccepted: false`) hacía que el componente mostrara las reglas de cancelación por 1 frame antes de que el `useEffect` tuviera tiempo de leer el `sessionStorage` y saltar al paso correcto.
**La Solución:** 
- Se implementó un estado global `isHydrated` (booleano) inicializado en `false`.
- El componente retorna un Spinner de carga (`Loader2`) mientras `!isHydrated`.
- Al finalizar de leer todas las variables del `sessionStorage` (reglas, paso, carrito, cliente), se ejecuta `setIsHydrated(true)`, permitiendo a React renderizar directamente el paso correcto sin mostrar las reglas.

## 🛡️ 2. Guardia de Seguridad (Step Guards) demasiado agresivo
**El Problema:** Existía un `useEffect` con un `setTimeout` de 100ms configurado al montar el componente (con dependencias `[]`) que verificaba si el usuario estaba en los pasos 3 o 4 sin tener servicios o fecha seleccionados. Al recargar la página, las variables del closure capturaban los estados iniciales (vacíos) antes de la hidratación, por lo que el guardia empujaba al usuario obligatoriamente al Paso 1 o 2.
**La Solución:** 
- El `useEffect` se reescribió para depender de `[isHydrated, step, selectedServices, selectedDate, selectedTime]`.
- Ahora el guardia incluye un `if (!isHydrated) return;`, de modo que solo realiza su validación estricta cuando los datos reales del usuario han sido cargados.

## 👻 3. El Bug de los "Cupos Fantasma" al cambiar de día
**El Problema:** Cuando el usuario elegía una hora en el calendario, se emitía un bloqueo en base de datos (`POST /api/bloqueo-temporal`) y se guardaba el `bloqueoId`. Si el usuario cambiaba a un día diferente, la interfaz borraba la hora visualmente (`setSelectedTime(null)`), pero el candado en la BD no se liberaba hasta pasados 10 minutos. Al regresar al día original, la hora aparecía como bloqueada.
**La Solución:** 
- Se interceptó la función `handleSelectDate`. 
- Ahora, si existe un `bloqueoId` activo y el usuario cambia de fecha, se dispara inmediatamente una petición `DELETE /api/bloqueo-temporal?id={bloqueoId}`.
- Posteriormente, se limpia el `bloqueoId` tanto del estado de React como del `sessionStorage`.

## 💾 4. Supervivencia del Bloqueo al recargar el Paso 4
**El Problema:** Si el usuario llegaba al Paso 4 (con su candado creado) y recargaba la página, un evento `beforeunload` (que envía un `DELETE` al cerrar la página) y un `useEffect` de limpieza en el montaje (`orphanedLock`) destruían el candado en la base de datos de manera inmediata. Como resultado, el botón de "Pre-agendar Cita" quedaba inhabilitado (sin `bloqueoId`).
**La Solución:** 
- Se eliminó la limpieza agresiva `beforeunload` para permitir que el candado sobreviva a una simple recarga (delegando la expiración a los 10 minutos naturales del servidor).
- Se añadieron el `bloqueoId` y `lockExpiresAt` al `sessionStorage` (`lola_lock_id` y `lola_lock_expires_at`).
- En la fase de hidratación, si los tiempos son válidos, el candado se recupera y el botón vuelve a estar vivo tras una recarga.

## 🔗 5. Error de Checkout Silencioso por falta de UUIDs (`lockedCitas`)
**El Problema:** Al hacer el bloqueo temporal, el backend devuelve los IDs físicos (UUIDs) de los registros creados en la tabla `citas`. Estos se guardaban en la variable de estado `lockedCitas`. Al recargar el Paso 4, esta variable volvía a estar vacía (`[]`). Cuando el usuario clickeaba "Pre-agendar Cita", el código no encontraba los UUIDs, y terminaba enviando los nombres genéricos de los servicios (ej. `depilacion_axilas`) al endpoint de checkout. El servidor intentaba hacer un `UPDATE citas WHERE id IN ('depilacion_axilas')` lo cual fallaba.
**La Solución:** 
- Se comenzó a guardar todo el arreglo `lockedCitas` dentro del `sessionStorage` bajo la clave `lola_locked_citas`.
- Durante la hidratación, se restaura este array hacia la RAM.
- Esto garantiza que el botón de checkout siempre tenga los UUIDs exactos para confirmar la reserva en la base de datos, ¡incluso si el usuario reinició su navegador estando a punto de pagar!
