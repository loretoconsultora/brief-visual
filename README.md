# Brief de marca · Loreto Consultora

Sitio estático (sin build) con dos briefs:

- `/` inicio con las dos partes y su estado (sin empezar, en progreso, enviado).
- `/estrategia/` brief conceptual: negocio, rumbo, diagnóstico, audiencia, competencia, personalidad (arquetipos) y voz.
- `/visual/` brief de identidad visual: color, tipografía, logo, estilo, formas, imágenes, presencia personal (solo marcas personales) y aplicaciones.
- `/respuestas/` panel del equipo (requiere iniciar sesión) para leer y descargar las respuestas.

Cada pregunta tiene la casilla "Ya compartí esta información con Loreto" para avanzar sin responderla.
Las respuestas se guardan en el navegador mientras se contesta; al final se envían a Supabase y se pueden descargar en PDF.
Nombre, marca y correo se comparten entre los dos briefs. Prellenar la marca en el link: `?marca=Nombre%20de%20la%20marca`.

## Base de respuestas (Supabase)

1. Crear un proyecto en Supabase y correr `supabase/schema.sql` en el SQL Editor.
2. En Authentication, crear el usuario del equipo (correo y contraseña) y desactivar el registro público.
3. Poner la URL del proyecto y la clave publicable en `assets/config.js`. La clave publicable es pública por diseño: la tabla solo permite insertar desde el formulario y leer con sesión.

Sin esa configuración el sitio funciona igual, solo con la descarga en PDF.

Despliegue: Vercel, Framework preset "Other", sin build command.
