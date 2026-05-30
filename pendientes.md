# Tareas Pendientes (Backlog)

## Sprint 5: Panel de Administración

### Gestión de Imágenes de Categorías
- **Objetivo:** Permitir que el administrador pueda subir, cambiar o eliminar las imágenes de las categorías directamente desde el panel web, sin necesidad de tocar el código fuente.
- **Implementación (Opción 2):**
  - Crear un "Bucket" en Supabase Storage (ej. `iconos-categorias`).
  - Agregar un campo `image_url` a la tabla `categorias` en la base de datos.
  - En el Panel Admin, agregar un botón para "Subir Imagen" que guarde el archivo en el bucket y guarde la URL pública en la base de datos.
  - Modificar el Frontend (`page.tsx` de la reserva) para que lea la imagen desde `categoria.image_url` en lugar de buscar archivos locales `.png`.
- **Consideraciones de Infraestructura:**
  - El usuario planea auto-alojar (self-host) Supabase en su propio VPS utilizando Easypanel, junto a N8N, Chatwoot y PostgreSQL. Habrá que asegurar que el Storage de ese Supabase auto-alojado esté configurado correctamente para uso público.
