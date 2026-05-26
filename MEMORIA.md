# 🧠 Bitácora de Memoria - Proyecto Lola 2.0

Este archivo sirve como puente de contexto para el asistente Antigravity.

## 📋 Resumen del Proyecto
Estamos construyendo **Lola 2.0**, un sistema de gestión de salones de belleza premium, migrando de un flujo basado en Excel/Chatbot a una Web App robusta con Next.js y Supabase Cloud.

## 🏗️ Estado de la Arquitectura
- **Backend:** Supabase Cloud (PostgreSQL) con RLS (Row Level Security) y restricciones de exclusión (`EXCLUDE`) para evitar traslapes de citas.
- **Frontend:** Next.js 15+ con App Router, TypeScript y TailwindCSS v4. Estética "Luxury-Grade" con modo oscuro.
- **Fuentes de Verdad:** 
    - **Google Calendar:** Para citas confirmadas (lo que Milé ve en su móvil).
    - **Tabla `citas` (Pre-agenda):** Para bloqueos temporales de 10 minutos mientras el cliente paga.
- **Dashboard Administrativo:** Diseñado con 8 módulos clave (Profesionales, Horarios, Servicios, Pagos, Clientes/CRM, Pre-agenda, Tratamientos VIP y Configuración General).

## ✅ Sprints Completados
- **Sprint 0: Setup & Fundación:** Proyecto inicializado en Next.js 16, Supabase Cloud configurado y catálogo de 107 servicios migrado.
- **Sprint 1: Base de Datos & Dominio:** Arquitectura limpia (Nucleo/Adaptadores), entidades definidas y RLS activo.
- **Sprint 2: Web Pública - Booking:** Motor de reservas funcional con UI premium, bloqueo de 10 min, polling de disponibilidad y checkout estructurado vía WhatsApp.
- **Sprint 3: Pagos & WhatsApp:** Validaciones anti-fraude, métodos de pago (Nequi, Daviplata, Tarjeta, SisteCrédito condicional), mensajes estructurados de WhatsApp, copy de marca "Milé Almanza" en toda la web.
- **Sprint 4: Portal del Cliente:** Auth OTP sin contraseña (código 6 dígitos enviado por WhatsApp vía n8n + Evolution API), portal `/portal` con dashboard de citas activas, agrupación de paquetes de servicios, countdown en tiempo real, cancelación autónoma de pre-agendas, y perfil editable. Cookie de sesión HttpOnly como mecanismo de autenticación.

## 🚀 Próximo Sprint (Sprint 5 — Dashboard de Milé)
- **Objetivo:** Panel de administración completo para que Mile opere el negocio sin tocar Excel ni código.
- **Tareas principales:**
    - Login de administradora con contraseña (Supabase Auth, rol `admin`) + middleware para rutas `/admin/*`.
    - Resumen del día: citas de hoy, ingresos estimados, pre-agendas activas y toggle del bot.
    - Gestión de citas: filtros, cambio manual de estado, vista de tiempo restante en pre-agendas.
    - CRM de Clientes: historial, estado del bot, botón de reactivación.
    - CRUD de Servicios con activación de promociones.
    - Verificación de comprobantes de pago (aprobar / rechazar).
    - Configuración general: datos del negocio, números de pago, mensaje de Lola.

## 🛠️ Estado General & Reglas de Oro
1. **Consistencia:** No se permiten traslapes (Garantizado por `gist` index en DB).
2. **UX:** No usar `alert()` nativos; usar modales premium diseñados (Ámbar para expiración, Rosa para conflictos).
3. **Identificación:** Se usa la Cédula/Teléfono como identificador único ("Shadow Registration") para reducir fricción.
4. **Validación:** El tiempo de bloqueo en producción es de **10 minutos**.

---
*Nota para el Asistente: Al leer este archivo, asume que este es el estado actual de la verdad y continúa desde aquí.*
