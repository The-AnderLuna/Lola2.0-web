# SPRINT 2: Sistema de Reservas y Reserva Compartida ("Amiga")

## Estado Actual: COMPLETADO (Fase UI y Lógica de Carrito)

### 1. UI Premium de Profesionales (Mile vs Staff)
* **Estética:** Implementación de "pill" (píldora) animada para la selección de profesional (Mile / Staff).
* **Diseño:** Fondo oscuro con borde y brillo dorado (glow), texto legible, acorde a la estética premium de la marca.
* **Animación:** Transición suave al alternar entre profesionales.

### 2. Función de Reserva Compartida ("¿Vas con una amiga?")
* **Activación:** Toggle en el paso 1 (carrito) que permite dividir los servicios para 2 personas.
* **Selección Individual:** Botones para asignar cada servicio a la titular o a la "amiga".
* **Selección de Profesional:** Permite elegir profesional (Mile/Staff) de forma totalmente independiente para cada servicio, ya sea de la titular o de la amiga.
* **Formulario Adaptado:** En el paso 3 (datos del cliente), se solicitan dinámicamente el nombre y el WhatsApp de la amiga si la reserva compartida está activa.
* **Compatibilidad Móvil:** Botones grandes, espaciados y con fallbacks universales (como la corrección de `crypto.randomUUID` para navegadores antiguos de Android/Brave).

### 3. Control de Grupos (3+ personas)
* **Lógica:** Límite estricto a máximo **2 cupos** por servicio. Si se intenta agregar un 3er cupo, la interfaz bloquea la acción.
* **Redirección a WhatsApp:** En su lugar, aparece un modal premium con un botón hacia WhatsApp.
* **Modal Premium:** Diseño oscuro centrado con iconos dorados (Corona/Grupo), badge verde de WA discreto y botón con texto "Escribirnos ahora" que abre un enlace pre-rellenado para coordinar directamente con Mile Almanza.

### 4. Preparación para Integración (Backend Payload)
* **Estructura de Datos:** El frontend agrupa los servicios seleccionados y está listo para generar el array de `personas` (Array de Arrays) donde:
  * `personas[0]`: Array de servicios de la Titular.
  * `personas[1]`: Array de servicios de la Amiga (si aplica).

## Próximos Pasos (Validación Final)
1. Conectar y validar el payload final en el endpoint de creación de reserva.
2. Hacer pruebas end-to-end simulando la confirmación de la reserva y asegurando que las dos personas queden registradas correctamente en la base de datos de Lola2.
