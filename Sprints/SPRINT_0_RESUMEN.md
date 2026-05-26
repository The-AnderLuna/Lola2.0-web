# Resumen Sprint 0: Fundación e Infraestructura (Lola 2.0)

## 🎯 Objetivo del Sprint
Migrar la lógica de negocio y los datos operativos desde un sistema basado en múltiples archivos de Excel hacia una arquitectura moderna, escalable y robusta utilizando **Next.js** para el Frontend y **Supabase (PostgreSQL)** para el Backend.

---

## 🗣️ Discusiones y Decisiones Arquitectónicas

1. **Supabase Local (VPS) vs. Supabase Cloud**
   - **Decisión:** Optamos por Supabase Cloud.
   - **Razón:** Evitamos dolores de cabeza administrando servidores, backups y actualizaciones en un VPS. Supabase Cloud se integra perfectamente con servicios de hosting moderno como Vercel y ofrece escalabilidad instantánea.

2. **Limpieza de Datos de Clientes**
   - **Problema:** El Excel original tenía más de 270 contactos, muchos de los cuales eran "basura" (personas que solo cotizaron pero nunca agendaron).
   - **Decisión:** **NO migrar el historial de clientes viejo.**
   - **Razón:** Es una excelente práctica iniciar con una base de datos 100% limpia. En el nuevo sistema, los clientes reales **deberán registrarse en la plataforma web** para poder agendar, lo que garantiza que sus datos (nombre, teléfono, cumpleaños) sean reales y estén actualizados.

3. **Manejo de Tratamientos Multi-Sesión**
   - **Problema:** Procedimientos como Micropigmentación o Packs Faciales (x4, x6) requieren seguimiento de cuántas sesiones lleva el cliente y cuándo le toca la siguiente.
   - **Decisión:** Creación de la tabla `tratamientos_activos`.
   - **Razón:** Permite que el Dashboard del cliente muestre barras de progreso reales (Ej: "Sesión 2 de 4") y calcula automáticamente las fechas ideales de la próxima visita.

---

## 🛠️ Ejecución Técnica

### 1. Entorno de Desarrollo (Frontend)
- Inicialización del proyecto **Next.js 16** (App Router) con TypeScript y TailwindCSS v4.
- Inicialización de **Git** y conexión con el repositorio remoto de GitHub (`The-AnderLuna/Lola2.0-web`).
- Instalación y configuración del cliente de Supabase (`@supabase/supabase-js`) en `src/lib/supabaseClient.ts`.
- Configuración de variables de entorno (`.env.local`).
- Instalación de dependencias UI como `lucide-react` para iconografía premium.

### 2. Modelado y Creación de Base de Datos (Supabase)
Se diseñó un esquema relacional profesional y se ejecutaron las migraciones SQL para crear las siguientes tablas:

- `configuracion`: Reglas generales del negocio (cuentas bancarias, políticas de cancelación, tokens).
- `profesionales`: Registro del Staff y Milé con sus IDs de Google Calendar.
- `horarios`: Disponibilidad y turnos específicos de cada profesional.
- `servicios`: Catálogo maestro.
- `clientes`: Directorio de usuarios (preparado para recibir registros desde la web).
- `citas`: Tabla transaccional para agendamientos.
- `pagos`: Registro de abonos y saldos.
- `tratamientos_activos`: Control de paquetes y sesiones.

### 3. Migración de Datos (Data Seeding)
- **Servicios:** Se procesaron y migraron exitosamente los **107 servicios** del Excel original.
  - Se incluyeron campos avanzados como: `abono_requerido`, `buffer_min`, `dias_prox_sesion`, `es_tratamiento`, `requiere_humano` y el `guion_venta`.
- **Configuración Inicial:** Se inyectaron los datos de horarios de "Staff" (Mar, Jue, Sáb) y "Milé" (Lun a Sáb).

---

## 🚀 Entregables del Sprint
1. Repositorio web funcional (`Lola2.0-web`).
2. Base de datos PostgreSQL en la nube 100% estructurada y poblada con el catálogo real del salón.
3. Un primer prototipo funcional del UI (Dashboard del Cliente) en `http://localhost:3000/dashboard`.

**Estado del Sprint:** Finalizado (100%) ✅
