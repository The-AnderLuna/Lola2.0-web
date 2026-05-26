# 🏃 Plan de Sprints — Lola 2.0 + Web Milé Almanza Estética

> Cada sprint = una unidad de trabajo entregable y funcional.
> Al terminar cada sprint, algo real debe poder verse o probarse.

---

## 📊 Vista General

| Sprint | Nombre | Entregable |
|---|---|---|
| **0** | Setup & Fundación | Proyecto corriendo en local y Vercel |
| **1** | Base de Datos & Dominio | Todas las tablas creadas, entidades y repositorios |
| **2** | Web Pública — Booking | Flujo completo de agendamiento funcional |
| **3** | Pagos & WhatsApp | Pantalla de pago con mensajes predefinidos |
| **4** | Portal del Cliente | Login, mis citas, countdown, cancelación |
| **5** | Dashboard de Mile | Control total: bot, CRM, servicios, staff, finanzas |
| **6** | Lola 2.0 en n8n | Orquestador, contexto real, memoria PostgreSQL |
| **7** | Automatizaciones | CRON expiración, recordatorios 24h |
| **8** | Polish & Deploy | SEO, performance, testing, producción |

---

## 🏁 Sprint 0 — Setup & Fundación

**Objetivo:** Tener el proyecto corriendo localmente y en Vercel con todo conectado.

### Tareas:
- [ ] Crear proyecto Next.js 14 con App Router y TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Instalar y configurar Supabase CLI
- [ ] Self-hostear Supabase en el VPS con Docker
- [ ] Conectar Next.js con Supabase (variables de entorno)
- [ ] Crear repositorio en GitHub
- [ ] Conectar GitHub con Vercel (auto-deploy en cada push)
- [ ] Apuntar el dominio existente a Vercel
- [ ] Verificar HTTPS automático en el dominio
- [ ] Crear estructura base de carpetas (`nucleo/`, `adaptadores/`, `components/`, etc.)
- [ ] Configurar ESLint + Prettier con reglas del equipo

**✅ Definición de hecho:** La URL `milealmanza.com` carga una página en blanco de Next.js desde Vercel, conectada a Supabase en el VPS.

---

## 🗄️ Sprint 1 — Base de Datos & Dominio

**Objetivo:** Toda la estructura de datos creada y las capas de dominio en código.

### Tareas BD (Supabase/PostgreSQL):
- [ ] Crear tabla `configuracion`
- [ ] Crear tabla `profesionales`
- [ ] Crear tabla `horarios`
- [ ] Crear tabla `servicios`
- [ ] Crear tabla `clientes`
- [ ] Crear tabla `citas` (con `estado`, `created_at`, `expires_at`, `grupo_id`)
- [ ] Crear tabla `pagos`
- [ ] Crear tabla `tratamientos`
- [ ] Configurar Row Level Security (RLS) en Supabase
- [ ] Generar tipos TypeScript automáticos con Supabase CLI (`database.types.ts`)
- [ ] Migrar datos del Excel actual a Supabase (servicios, horarios, config)

### Tareas de Dominio (código):
- [ ] Crear entidad `Cita` con sus métodos (`estaVencida()`, `puedeSerCancelada()`)
- [ ] Crear enum `EstadoCita` con todos los estados
- [ ] Crear entidad `Servicio`
- [ ] Crear entidad `Profesional`
- [ ] Crear entidad `SlotDisponible`
- [ ] Crear `RepositorioCitas` (Supabase)
- [ ] Crear `RepositorioServicios` (Supabase)
- [ ] Crear `RepositorioProfesionales` (Supabase)
- [ ] Crear `RepositorioClientes` (Supabase)
- [ ] Crear `RepositorioConfiguracion` (Supabase)
- [ ] Crear `AdaptadorCalendarioGoogle` (lee disponibilidad real)
- [ ] Crear `ServicioDisponibilidad` (combina Google Calendar + pre-agendas)
- [ ] Crear `ServicioPreAgenda` (crea, cancela, expira)

**✅ Definición de hecho:** Puedo correr queries contra Supabase desde código TypeScript y obtener datos reales migrados del Excel.

---

## 🌐 Sprint 2 — Web Pública: Flujo de Booking

**Objetivo:** Una clienta puede entrar a la web y completar todo el flujo de pre-agendamiento.

### Tareas:
- [ ] **Landing page** (`/`): Hero, catálogo de servicios, CTA "Agendar"
- [ ] **Catálogo de servicios** (`/servicios`): Grid por categoría, precios desde BD
- [ ] **Paso 1 — Servicio** (`/agendar`): Selección de categoría y servicio específico
- [ ] **Paso 2 — Profesional** (`/agendar/profesional`):
  - Muestra opciones según el responsable del servicio (Mile / Staff / Compartido)
  - Escalable: renderiza todas las camillas activas desde BD
- [ ] **Paso 3 — Calendario** (`/agendar/calendario`):
  - Vista mensual con días disponibles/no disponibles
  - Al seleccionar día → muestra horas disponibles en tiempo real
  - Lógica de slots inteligentes (bloques consecutivos)
  - Llama `ServicioDisponibilidad` (Google Calendar + pre-agendas)
- [ ] **Paso 4 — Datos del cliente** (`/agendar/datos`):
  - Formulario: nombre, teléfono, correo, cédula
  - Si el cliente tiene sesión → auto-rellena
- [ ] **Opción "Agregar acompañante"** al final del Paso 4
- [ ] **Barra de progreso** visible en todos los pasos (Paso 1/4, 2/4, etc.)
- [ ] **Resumen de cita** antes de confirmar (servicio, profesional, fecha, precio, abono)

**✅ Definición de hecho:** Una clienta de prueba completa los 4 pasos y la pre-agenda queda guardada en Supabase con estado `PRE_AGENDADA`.

---

## 💳 Sprint 3 — Pagos & WhatsApp

**Objetivo:** Después del booking, el cliente sabe exactamente cómo pagar.

### Tareas:
- [ ] **Pantalla de pago** (`/agendar/pagar`):
  - Muestra 4 métodos: Nequi, Daviplata, Tarjeta, Sistecredito
  - Sistecredito solo aparece si el monto total > $200.000
- [ ] **Nequi / Daviplata**: Muestra número y titular desde `configuracion` en BD (no hardcodeado)
- [ ] **Tarjeta**: Genera y abre link de WhatsApp con mensaje predefinido
- [ ] **Sistecredito**: Genera y abre link de WhatsApp con mensaje predefinido
- [ ] Mensaje predefinido contiene: servicio, fecha, hora, monto total, abono, método elegido
- [ ] Guardar pre-agenda en BD al confirmar (`ServicioPreAgenda.crear()`)

**✅ Definición de hecho:** El cliente termina el flujo y WhatsApp se abre con el mensaje correcto y completo. La cita existe en Supabase.

---

## 👤 Sprint 4 — Portal del Cliente

**Objetivo:** El cliente puede ver y gestionar sus citas con su propia cuenta.

### Tareas:
- [ ] **Auth del cliente**: Login/registro con teléfono o correo (Supabase Auth)
- [ ] **Mi panel** (`/portal`): Resumen de cita activa
- [ ] **Mis citas** (`/portal/mis-citas`): Lista de citas pasadas y próximas
- [ ] **Contador regresivo en tiempo real** para citas `PRE_AGENDADA`:
  - Muestra `⏳ Tu cupo expira en: 47:23`
  - Al llegar a 0 → muestra mensaje de expiración
  - Usa Supabase Realtime para actualizar en vivo
- [ ] **Botón "Cancelar Pre-agenda"** (solo para `PRE_AGENDADA`):
  - Cancela directo en BD
  - Libera cupo automáticamente
- [ ] **Botón "Solicitar Reagendamiento"** (solo para `CONFIRMADA`):
  - Abre WhatsApp con mensaje predefinido
- [ ] **Botón "Solicitar Cancelación"** (solo para `CONFIRMADA`):
  - Abre WhatsApp con mensaje predefinido
- [ ] **Mi perfil** (`/portal/perfil`): Ver y editar datos de facturación

**✅ Definición de hecho:** Un cliente se loguea, ve su cita activa con el countdown en vivo, y puede cancelar o solicitar cambios correctamente.

---

## 🖥️ Sprint 5 — Dashboard de Mile

**Objetivo:** Mile puede administrar todo el negocio desde un panel seguro.

### Tareas Auth:
- [ ] Login de administrador (Supabase Auth con rol `admin`)
- [ ] Middleware que protege todas las rutas `/dashboard/*`

### Módulos del Dashboard:
- [ ] **Resumen del día** (`/dashboard`): Citas de hoy, ingresos, pre-agendas activas
- [ ] **Toggle del bot** en el resumen: muestra estado + botón para activar/desactivar
- [ ] **Gestión de Citas** (`/dashboard/citas`):
  - Lista con filtros por estado, fecha, profesional
  - Ver detalle de cada cita
  - Cambiar estado manualmente (confirmar, cancelar)
  - Ver pre-agendas activas con tiempo restante
- [ ] **CRM — Clientes** (`/dashboard/clientes`):
  - Lista completa con búsqueda
  - Ver historial de citas por cliente
  - Ver/editar datos de facturación
  - Ver estado del bot por cliente (activo/pausado)
  - Botón "Reactivar bot" por cliente
  - Importar Excel actual (CSV → BD)
- [ ] **Catálogo — Servicios** (`/dashboard/servicios`):
  - CRUD completo de servicios
  - Activar/desactivar promociones con fechas
- [ ] **Staff** (`/dashboard/staff`):
  - Agregar/editar/desactivar profesionales
  - Configurar días laborales y horarios por profesional
  - Campo `calendario_id` de Google Calendar
- [ ] **Pagos** (`/dashboard/pagos`):
  - Lista de pagos recibidos
  - Verificar/rechazar comprobantes
  - Resumen financiero: día / semana / mes
- [ ] **Configuración** (`/dashboard/configuracion`):
  - Datos del negocio
  - Números de pago (Nequi, Daviplata, titular)
  - Recargo de tarjeta
  - Mensaje de bienvenida de Lola

**✅ Definición de hecho:** Mile puede agregar un nuevo Staff, cambiar un precio de servicio y verificar un comprobante desde el Dashboard, sin tocar el Excel ni el código.

---

## 🤖 Sprint 6 — Lola 2.0 en n8n

**Objetivo:** El bot recibe contexto real de Supabase antes de responder.

### Tareas:
- [ ] **Nodo de Checks** al inicio de cada mensaje:
  - Check 1: ¿`bot_activo = false`? → Ignorar
  - Check 2: ¿`bot_pausado_hasta > NOW()`? → Ignorar
- [ ] **Nodo de Contexto** antes del LLM:
  - Consulta Supabase por teléfono
  - Obtiene: pre-agendas activas, estado de pago, citas confirmadas, tratamientos VIP
  - Construye bloque de contexto e inyecta al prompt
- [ ] **Orquestador de Intenciones** (clasificador):
  - Detecta: agendar → redirige web
  - Detecta: pagar → Agente de Cobros
  - Detecta: duda → Agente de Soporte
  - Detecta: humano → pausa bot + notifica Mile
- [ ] **Memoria conversacional** con `Postgres Chat Memory` de n8n (por teléfono)
- [ ] **RAG de servicios**: LLM consulta tabla `servicios` en Supabase en tiempo real
- [ ] **Auto-pausa** al ejecutar `Solicitar_Humano`:
  - `UPDATE clientes SET bot_pausado_hasta = NOW() + '24h'`
- [ ] Actualizar estado de cita a `EN_REVISION` cuando llega comprobante
- [ ] Migrar flujos existentes de n8n para usar la nueva arquitectura

**✅ Definición de hecho:** Lola recibe un mensaje de una cliente con cita en `EN_REVISION` y responde correctamente sin pedir el comprobante de nuevo.

---

## ⏰ Sprint 7 — Automatizaciones

**Objetivo:** El sistema trabaja solo en segundo plano.

### Tareas:
- [ ] **CRON Job — Expiración** (n8n, cada minuto):
  ```sql
  UPDATE citas SET estado = 'CANCELADA_SISTEMA'
  WHERE estado = 'PRE_AGENDADA' AND expires_at < NOW()
  ```
- [ ] **Notificación al cliente cuando expira**: Mensaje WhatsApp automático con link para re-agendar
- [ ] **Recordatorio 24h antes** (n8n, Schedule Trigger):
  - Busca citas `CONFIRMADA` para mañana
  - Manda mensaje: *"Mañana a las [hora] tienes tu cita de [servicio]"*
  - Incluye instrucción: *"Si necesitas reagendar, responde con la palabra: Reagendar"*
- [ ] **Re-engagement 45 días** (n8n, Schedule Trigger diario):
  - Busca clientes sin cita en los últimos 45 días
  - Manda mensaje de *"Te extrañamos"* con link a la web
- [ ] **Recordatorio de cumpleaños** (n8n, Schedule Trigger diario):
  - Busca clientes con cumpleaños hoy
  - Manda mensaje personalizado con descuento

**✅ Definición de hecho:** Una pre-agenda vencida se cancela sola en menos de 2 minutos y la clienta recibe un WhatsApp automático.

---

## ✨ Sprint 8 — Polish & Deploy

**Objetivo:** El sistema está listo para clientes reales.

### Tareas:
- [ ] **SEO**: Meta tags, Open Graph, sitemap, robots.txt
- [ ] **Performance**: Optimizar imágenes, lazy loading, Core Web Vitals
- [ ] **Responsive**: Revisar toda la web en móvil (el 95% de las clientas entran desde el celular)
- [ ] **Testing manual** del flujo completo de booking de principio a fin
- [ ] **Testing del Dashboard** con datos reales
- [ ] **Variables de entorno** revisadas en Vercel (producción)
- [ ] **Supabase en producción**: Backups automáticos configurados en VPS
- [ ] **Monitoring**: Uptime del VPS y alertas si cae
- [ ] **Dominio final**: Verificar que todo funcione en `milealmanza.com`
- [ ] **Capacitar a Mile** en el uso del Dashboard (30 min de demo)

**✅ Definición de hecho:** Una clienta real completa una pre-agenda desde su celular, Mile la confirma desde el Dashboard, y Lola 2.0 responde correctamente con el estado real.

---

## 📌 Reglas del juego
1. **Un sprint a la vez** — No empezar el siguiente hasta que el anterior esté ✅
2. **Siempre deployar** — Cada sprint termina con un deploy en Vercel funcionando
3. **Primero funcional, luego bonito** — El diseño se afina en el Sprint 8
4. **Si surge algo nuevo** — Se agrega al sprint más lógico, no se interrumpe el actual
