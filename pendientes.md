# Tareas Pendientes (Backlog)

## Sprint 5: Panel de Administración

### Gestión de Imágenes de Categorías
- **Objetivo:** Permitir que el administrador pueda subir, cambiar o eliminar las imágenes de las categorías directamente desde el panel web, sin necesidad de tocar el código fuente.
- **Implementación (Opción 2):**
  - Crear un "Bucket" en Supabase Storage (ej. `iconos-categorias`).
  - Agregar un campo `image_url` a la tabla `categorias` en la base de datos.
  - En el Panel Admin, agregar un botón para "Subir Imagen" que guarde el archivo en el bucket y guarde la URL pública en la base de datos.
  - Modificar el Frontend (`page.tsx` de la reserva) para que lea la imagen desde `categoria.image_url` en lugar de buscar archivos locales `.png`.

---

## Estrategia de Infraestructura: Supabase Cloud vs VPS Propio

El proyecto actualmente opera en la capa gratuita de Supabase Cloud. A futuro, se evaluará la migración a un entorno Self-Hosted usando el VPS del cliente.

**Especificaciones del VPS Actual (KVM 2):**
- 2 núcleos vCPU
- 8 GB RAM
- 100 GB NVMe
- 8 TB de ancho de banda
- *Software actual corriendo:* Easypanel, N8N, Chatwoot, PostgreSQL.

### Fases de Migración

**Fase 1: Mantener en Supabase Oficial (Estado Actual)**
- **Por qué:** Cero mantenimiento, alta disponibilidad mundial, sin riesgo de que la RAM del VPS colapse.
- **Límites a monitorear:** 500 MB de base de datos, pausas por 7 días de inactividad, 200 conexiones concurrentes.
- **Acción requerida:** Enseñar y programar respaldos manuales (`pg_dump`) periódicos, ya que el plan gratuito no tiene backups automáticos.

**Fase 2: Migración a Self-Hosted en Easypanel (A futuro)**
- **Cuándo migrar:** Cuando se requiera almacenamiento masivo para imágenes (Superar límite del plan gratuito), o cuando se necesiten copias de seguridad automatizadas sin pagar los $25/mes del plan Pro de Supabase.
- **Consideraciones Técnicas:**
  - **Memoria RAM:** Supabase consume ~4GB de RAM. Sumado a N8N y Chatwoot, los 8GB de RAM del VPS estarán al límite. Se debe monitorear el consumo o considerar un upgrade temporal a 16GB.
  - **Backups:** Configurar respaldos automáticos diarios usando las herramientas integradas de Easypanel hacia un almacenamiento externo (ej. AWS S3 o DigitalOcean Spaces).
  - **Edge Functions:** Recordar que esta característica es difícil de replicar en self-hosted, por lo que la lógica debe mantenerse en la API de Next.js (como está actualmente).
