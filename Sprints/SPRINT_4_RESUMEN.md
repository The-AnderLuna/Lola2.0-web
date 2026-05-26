# 👤 Resumen Sprint 4 — Lola 2.0: Portal del Cliente

Hemos finalizado con éxito el Sprint 4, construyendo un portal de cliente completamente funcional con autenticación sin contraseña (OTP por WhatsApp), panel de reservas en tiempo real, cancelación autónoma y gestión del perfil propio.

---

## 🎯 Objetivos Logrados

### 1. Autenticación Segura con OTP por WhatsApp (Zero-Trust)
- **Pantalla `/mis-citas`:** Flujo de login en dos pasos: primero el cliente ingresa su número de WhatsApp registrado; si existe en la BD, recibe un código OTP de 6 dígitos directamente en su WhatsApp.
- **OTP Generado Server-Side:** El código de 6 dígitos se genera exclusivamente en el servidor Next.js, se persiste en la tabla `codigos_otp` de Supabase con expiración de 10 minutos, y jamás viaja al navegador del cliente (ni en la respuesta JSON ni en el DOM). Diseño Zero-Trust por construcción.
- **Integración con n8n + Evolution API:** El servidor hace un `POST` al webhook de n8n (`/webhook/OTP`) enviando solo `{ telefono, codigo }`. n8n recibe los datos, extrae el número y el código, y los envía al cliente vía WhatsApp usando la Evolution API (`Mile-Rifas`). El código nunca pasa por el frontend.
- **Flujo de Verificación:** El cliente digita los 6 dígitos en inputs individuales con navegación automática. Al completar el último dígito, se verifica automáticamente contra la BD. Si es correcto y no ha expirado, se crea una cookie `HttpOnly` (`lola_client_session`) con el `clienteId` y se redirige al portal.
- **Sesión con Cookie `HttpOnly`:** Las cookies de sesión están marcadas `HttpOnly` y `SameSite=Strict`, haciéndolas inaccesibles desde JavaScript del navegador y protegidas contra XSS y CSRF.
- **Tabla `codigos_otp` en Supabase:** Creada con campos `telefono`, `codigo`, `expires_at`, `usado` y `created_at`.

### 2. Dashboard del Cliente (`/portal`)
- **Saludo personalizado:** Muestra `Hola, [Nombre]` con el nombre correctamente formateado (capitalización automática, sin importar cómo esté guardado en BD).
- **Agrupación de Servicios (Paquete):** Si la cita activa tiene múltiples servicios vinculados bajo el mismo `grupo_id` y estado `PRE_AGENDADA`, el portal los presenta agrupados como un "Paquete de Servicios" en una sola tarjeta, con el listado de servicios incluidos, duración total sumada y precio total consolidado.
- **Cita Activa Destacada:** La reserva más próxima se presenta en una tarjeta de primer nivel con detalles completos: fecha, horario, especialista e inversión.
- **Countdown en Tiempo Real:** Para citas en estado `PRE_AGENDADA`, un banner ámbar muestra un contador regresivo que actualiza cada segundo usando `setInterval`. Al llegar a cero, el banner cambia a estado de expiración y actualiza el estado en la UI sin refrescar la página.
- **Cancelación Autónoma:** Botón "Liberar Cupo" disponible solo en citas `PRE_AGENDADA`. Llama a `/api/citas/cancelar` que actualiza el estado a `CANCELADA` en Supabase de forma inmediata, liberando el bloqueo temporal del cupo.
- **Otras Reservas y Historial:** Reservas adicionales o del mismo grupo se muestran en una sección secundaria. El historial de visitas pasadas/canceladas se presenta en un acordeón colapsable con contador de visitas.

### 3. Mi Perfil (`/portal/perfil`)
- **Vista y edición de datos:** El cliente puede ver y actualizar su nombre, correo electrónico, cédula y fecha de nacimiento directamente desde el portal, sin necesidad de contactar a Mile.
- **Actualización en BD:** Los cambios se persisten vía API en la tabla `clientes` de Supabase usando `RepositorioClientes.actualizarPerfil()`.

### 4. Seguridad del Flujo Completo
- **Cookie de sesión** verificada en cada carga del portal. Si no existe o el cliente no está en BD, redirige a `/mis-citas`.
- **Cierre de sesión** disponible en el header del portal, borra la cookie vía API.
- **Código OTP de un solo uso:** Se marca como `usado = true` en cuanto se verifica con éxito, impidiendo reutilización.

---

## 🔗 Infraestructura n8n Conectada

### Flujo `CODIGO OTP` (ID: `y3AKvllUX1HsogNK`) — ACTIVO ✅
El flujo fue construido y publicado en producción con los siguientes nodos:
1. **Webhook (`POST /webhook/OTP`):** Recibe `{ telefono, codigo }` desde Next.js.
2. **Limpiar Variables (Set):** Extrae `numero_usuario` y `Codigo OTP` del cuerpo del request.
3. **WA Pago Aprobado (HTTP Request):** Envía el mensaje de WhatsApp al número del cliente vía Evolution API con el texto: _"Código de verificación: {codigo}"_.

> **URL de Producción:** `https://bot-milena-n8n.wfebss.easypanel.host/webhook/OTP`
> *(No usar la URL `/webhook-test/OTP` en producción — solo responde cuando el editor de n8n está activo y en modo escucha manual.)*

---

## 🗣️ Decisiones Técnicas

### OTP vía n8n en lugar de llamada directa a Evolution API
**Decisión:** En lugar de que Next.js llame directamente a la Evolution API para enviar el WhatsApp, el servidor envía el código OTP al webhook de n8n que orquesta el envío.

**Razón:** Esta arquitectura desacopla la lógica de envío de mensajes de la aplicación web. Si en el futuro se cambia el proveedor de WhatsApp (de Evolution API a otra solución), solo se modifica el flujo en n8n sin tocar el código de Next.js. Además, n8n centraliza el log de envíos y permite agregar reintentos o condiciones (ej. validar si el número es válido antes de enviar) sin desplegar nuevas versiones de la web.

### Supabase Auth descartado — Sesión manual con Cookie HttpOnly
**Decisión:** No se usó Supabase Auth (el sistema de autenticación nativo de Supabase con JWT tokens) para la sesión del cliente. En su lugar, se implementó un sistema manual con cookie `HttpOnly`.

**Razón:** Supabase Auth requiere que el cliente cree una cuenta o haga un magic link, añadiendo fricción. La base de clientes ya existe en la tabla `clientes` (migrada del Excel), y el objetivo era identificar clientas existentes, no crear nuevas cuentas. La cookie `HttpOnly` con el `clienteId` es simple, segura y suficiente para el modelo de autenticación sin contraseña del proyecto.

---

## ✅ Pendientes Menores (Sprint 4.5 o Sprint 5)

| Tarea | Motivo del Aplazamiento |
|---|---|
| Botón "Solicitar Reagendamiento" vía WhatsApp para citas `CONFIRMADA` | ✅ Ya implementado en el Dashboard (usa `getWhatsAppLink`) |
| Enviar recordatorio por WhatsApp cuando expira una pre-agenda | Requiere CRON → Sprint 7 |
| Marcar citas como expiradas en BD desde el servidor (CRON) | Requiere CRON en n8n → Sprint 7 |

---

## 🚀 Próxima Parada: Sprint 5 (Dashboard de Milé)

El siguiente sprint construye el panel de administración que Mile usará día a día para operar el negocio:

1. **Login de Administradora:** Acceso protegido con contraseña (Supabase Auth con rol `admin`) y middleware de protección en todas las rutas `/admin/*`.
2. **Resumen del Día:** Vista diaria con citas de hoy, ingresos estimados, pre-agendas activas y toggle del bot de Lola.
3. **Gestión de Citas:** Lista con filtros por estado/fecha/profesional, cambio manual de estado y vista de pre-agendas con tiempo restante.
4. **CRM de Clientes:** Buscador completo, historial de citas por cliente, estado del bot y botón de reactivación.
5. **Catálogo de Servicios:** CRUD completo de servicios, con activación de promociones.
6. **Verificación de Pagos:** Lista de comprobantes recibidos para aprobar o rechazar.
7. **Configuración General:** Números de pago, recargos, datos del negocio y mensaje de bienvenida de Lola.

---
*Sprint 4 completo. El cliente tiene su propio portal seguro — puede ver, gestionar y cancelar sus citas sin intervención de Mile.*
