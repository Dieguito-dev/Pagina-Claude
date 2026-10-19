# Guardar los contactos en una hoja de Google

Cuando alguien llena el formulario de la página, sus datos se agregan como fila nueva en una hoja de Google. Se configura una sola vez (unos 5 minutos):

1. Crea una hoja nueva en https://sheets.google.com (ponle de nombre, por ejemplo, "Contactos página").
2. En la hoja ve a **Extensiones → Apps Script**.
3. Borra lo que aparece y pega todo el contenido de `Code.gs` (este folder). Guarda (💾).
4. Arriba a la derecha: **Implementar → Nueva implementación**.
   - En el engrane ⚙️ elige **Aplicación web**.
   - *Ejecutar como:* **Yo**.
   - *Quién tiene acceso:* **Cualquier usuario**.
   - Clic en **Implementar** y acepta los permisos (Google te avisará que la app "no está verificada": es tu propio script, dale en *Configuración avanzada → Ir a…*).
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Pégala en `config.js`, en `formularioUrl`.

Listo. Prueba el formulario y revisa que aparezca la fila en la hoja.

> Mientras `formularioUrl` esté vacío, el formulario abre el correo de la persona con el mensaje ya escrito, dirigido a tu email.

**Tip:** en la hoja, *Herramientas → Configuración de notificaciones → Editar notificaciones* puedes pedir que te llegue un correo cada vez que alguien llene el formulario.
