# Plan de Implementación: Flujo Aceptar/Rechazar (Tarjeta & SisteCrédito)

Este documento detalla el diseño técnico y los pasos de integración para habilitar el flujo de **Aceptación y Rechazo manual** para citas reservadas con métodos de pago diferidos/manuales (Tarjeta de Crédito y SisteCrédito).

---

## 💎 1. Flujo de Experiencia Premium

Cuando una clienta pre-agenda en la web usando **Tarjeta** o **SisteCrédito**:
1. **Bloqueo Seguro de Espacio:** El espacio se aparta de inmediato en la base de datos con estado `EN_REVISION` para que ningún otro cliente pueda tomar el mismo horario.
2. **Sin Expiración Corta:** A diferencia del estado `PRE_AGENDADA` (que tiene un temporizador de 1 hora antes de ser auto-cancelado por el sistema), las reservas `EN_REVISION` **no expiran automáticamente**, dando tiempo suficiente a la administradora para procesar el crédito o enviar el link de pago Bold/Wompi.
3. **Notificación Interactiva (Telegram):** El sistema (a través de n8n) envía una alerta premium al canal de Telegram de administración con los detalles de la cita y dos botones en línea: `✅ Aprobar Cita` y `❌ Rechazar Cita`.
4. **Gestión Web:** La administradora también puede ver y resolver estas solicitudes desde el módulo de "Gestión de Citas" del Admin Panel.
5. **Notificación al Cliente:** Al aprobarse o rechazarse la cita, se gatilla un mensaje automático por WhatsApp al cliente notificando el estado final con tono de marca.

---

## 🛠️ 2. Cambios en el Código (Next.js)

### Modificación en la API de Checkout

Debemos actualizar el endpoint de checkout para que, cuando el método de pago sea `tarjeta` o `sistecredito`, el estado inicial sea `EN_REVISION` y el campo `expires_at` quede en `null`.

**Archivo a modificar:** `src/app/api/checkout/route.ts`

#### Cambios propuestos:
```typescript
// Define el estado y expiración según el método de pago
const isManualPago = metodoPago === 'tarjeta' || metodoPago === 'sistecredito';
const estadoInicial = isManualPago ? 'EN_REVISION' : 'PRE_AGENDADA';
const expiresAtVal = isManualPago ? null : expiresAt.toISOString();

// 1. En la actualización para Reserva Compartida (Servicios de la Titular):
const { error: err1 } = await supabase.from('citas').update({
  cliente_id: clienteId,
  estado: estadoInicial,
  metodo_pago: metodoPago,
  notas: `Abono Compartida Esperado: $${totalAbono}`,
  expires_at: expiresAtVal,
}).in('id', serviciosTitularIds).eq('grupo_id', bloqueoId);

// 2. En la actualización para Reserva Compartida (Servicios de la Amiga):
if (amigaId && serviciosAmigaIds && serviciosAmigaIds.length > 0) {
  const { error: err2 } = await supabase.from('citas').update({
    cliente_id: amigaId,
    reserva_titular_id: clienteId,
    estado: estadoInicial,
    metodo_pago: metodoPago,
    notas: `Amiga de Titular. Abono Compartida Esperado: $${totalAbono}`,
    expires_at: expiresAtVal,
  }).in('id', serviciosAmigaIds).eq('grupo_id', bloqueoId);
}

// 3. En el Modo Tradicional (1 sola persona):
const { error: errCitas } = await supabase.from('citas').update({
  cliente_id: clienteId,
  estado: estadoInicial,
  metodo_pago: metodoPago,
  notas: `Total Abono Esperado: $${totalAbono}`,
  expires_at: expiresAtVal,
}).eq('grupo_id', bloqueoId).eq('estado', 'BLOQUEO_TEMPORAL');
```

---

## 🤖 3. Orquestación en n8n & Bot de Telegram

Para no saturar el servidor de Next.js, toda la interacción conversacional se delega al motor de automatización **n8n**:

### Escenario A: Notificación de Solicitud de Reserva
1. **Trigger de Supabase:** Se activa ante un `INSERT` o `UPDATE` en la tabla `citas` donde `estado = 'EN_REVISION'` y `metodo_pago IN ('TARJETA', 'SISTECREDITO')`.
2. **Obtención de Datos:** Obtiene la información del cliente (`clientes`), del profesional (`profesionales`) y el servicio (`servicios`).
3. **Lectura de Configuración:** Obtiene `telegram_bot_token`, `admin_telegram_id` y `telegram_topic_pagos` desde la tabla `configuracion`.
4. **Envío a Telegram:** Realiza un POST al API del bot de Telegram con un formato premium:
   
   ```text
   🚨 *NUEVO AGENDAMIENTO PENDIENTE* 🚨
   
   👤 *Cliente:* {cliente.nombre} ({cliente.telefono})
   💇‍♀️ *Servicio:* {servicio.nombre}
   📅 *Fecha:* {fecha}
   ⏰ *Hora:* {hora}
   💳 *Método:* {metodo_pago}
   💰 *Abono Esperado:* {abono}
   
   _Genera el link de pago y envíaselo por WhatsApp. Luego presiona una acción:_
   ```
   
   *Botones en línea:*
   `✅ Aprobar Cita` (data: `confirmar:{citaId}`) | `❌ Rechazar Cita` (data: `cancelar:{citaId}`)

### Escenario B: Respuesta del Botón de Telegram
1. **Trigger de Callback de Telegram:** Se dispara al presionar uno de los botones en línea.
2. **Actualización de Base de Datos:**
   - Si se selecciona **Aprobar**: `UPDATE citas SET estado = 'CONFIRMADA' WHERE id = {citaId}`.
   - Si se selecciona **Rechazar**: `UPDATE citas SET estado = 'CANCELADA' WHERE id = {citaId}`.
3. **Notificación por WhatsApp al Cliente (Evolution API):**
   - **Cita Aprobada:** *"¡Tu cita ha sido confirmada con éxito! Te esperamos el {fecha} a las {hora}..."*
   - **Cita Rechazada:** *"Hola, lamentamos informarte que tu solicitud de reserva para el {fecha} no pudo ser aprobada..."*
4. **Actualización del Mensaje en Telegram:** Edita el mensaje en Telegram removiendo los botones y mostrando el resultado final: *"✅ Cita aprobada por Milé el {fecha_actual}."*
