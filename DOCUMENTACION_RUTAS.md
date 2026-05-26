# Documentación: Rutas Dinámicas y Navegación del Historial

Este documento explica cómo funciona el sistema de navegación fluido en el flujo de reserva (`/reservar`), específicamente cómo logramos URLs limpias y cómo solucionamos el comportamiento del botón "Atrás" y "Adelante" del navegador.

## 1. El Problema Original
En implementaciones tradicionales de React (SPAs), todo ocurre en una sola URL y se usan variables de estado (`useState`) para cambiar lo que el usuario ve. Si el usuario presiona el botón "Atrás" de su celular o navegador, al no haber un historial real de URLs, el navegador lo saca de la página de reservas por completo, dañando su experiencia.

Para arreglar eso, forzábamos inyecciones al historial (`window.history.pushState`). Sin embargo, esto generaba un **bucle infinito** porque el propio botón Atrás recargaba el estado y volvía a inyectar un paso fantasma al historial, impidiendo volver a la página principal (Home).

## 2. La Solución: "Optional Catch-all Routes" de Next.js
Para tener URLs "bonitas" y un historial nativo, movimos el componente de `src/app/reservar/page.tsx` a una carpeta dinámica:
`src/app/reservar/[[...paso]]/page.tsx`

La sintaxis `[[...paso]]` le dice a Next.js que cualquier URL que empiece por `/reservar` debe renderizar este archivo. Ejemplos que ahora son válidos:
- `/reservar`
- `/reservar/catalogo`
- `/reservar/catalogo/cejas`
- `/reservar/fecha`

## 3. Lógica Interna del Archivo (`page.tsx`)

Implementamos funciones y variables clave, 100% en español para máxima legibilidad:

### A. `analizarRutaYParametros(ruta, busqueda)`
Es la función encargada de leer la barra de direcciones en cuanto el componente se monta (o cambia). 
- Si detecta `/reservar/catalogo`, traduce "catalogo" al **paso 1**.
- También es compatible de forma retroactiva con los parámetros antiguos (`?paso=catalogo`).

### B. El Efecto de Montaje (PopState)
```tsx
useEffect(() => {
  const manejarRetrocesoNavegador = (evento: PopStateEvent) => {
    // Aquí interceptamos si el usuario presiona "Atrás" o "Adelante".
    // En lugar de inyectar rutas, solo leemos la nueva URL a la que el navegador
    // nos llevó y actualizamos la interfaz (setStep) en base a eso.
  };
  // ...
}, []);
```
En este hook (efecto):
1. Calculamos el paso inicial de inmediato.
2. Usamos `window.history.replaceState` para sobrescribir la posición inicial. A diferencia de `pushState`, esto **no agrega** un nuevo clic al historial de Atrás, rompiendo el ciclo infinito.
3. Se activa el escuchador `popstate` que avisa a React cada que el usuario da "Atrás/Adelante".

### C. El Efecto de Avance (PushState Inteligente)
```tsx
useEffect(() => {
  // Cuando el estado de la app cambia (porque el usuario presionó un botón de "Siguiente")...
  
  // 1. Calculamos cómo debería llamarse la URL
  let rutaDestinoUrl = `/reservar/${rutaPasoDestino}`; 

  // 2. Verificamos si YA estamos en esa URL
  const rutaActual = window.location.pathname;

  // 3. SOLO inyectamos el historial si la URL actual es distinta a la de destino.
  if (rutaActual !== rutaDestinoUrl) {
    window.history.pushState(..., nuevaUrlFinal);
  }
}, [step, activeCategory]);
```
**Aquí está la magia:** Si el usuario presionó "Atrás", el navegador *primero* cambia la URL nativamente y *luego* React re-renderiza. Por lo tanto, al llegar a este `useEffect`, la ruta actual será igual a la ruta destino, y **no** se ejecutará el `pushState`. Esto es lo que nos salvó del bucle infinito.

## Resumen para el Desarrollador
- Si necesitas crear un nuevo paso en el agendamiento: agrégalo a los objetos `mapeoPasoARuta` y `mapeoRutaAPaso` en la parte superior del archivo.
- Nunca uses `pushState` de forma incondicional; siempre valídalo contra la `rutaActual`.
- Todo el manejo de botones "Atrás/Adelante" lo maneja automáticamente el escuchador de `popstate`, no necesitas codificar nada en los botones visuales.
