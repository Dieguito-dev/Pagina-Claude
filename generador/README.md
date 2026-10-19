# Generador de páginas para clientes

Con esto haces la página de un cliente **sin tocar código**: llenas un formulario, ves cómo queda al momento y descargas un archivo `index.html` listo para publicar.

## Cómo usarlo

1. Abre `generador/index.html` en tu navegador (doble clic). En la compu funciona mejor que en el celular.
2. Llena las secciones con los datos del cliente. A la derecha ves la página en vivo (📱 celular / 💻 compu).
   - **Cargar ejemplo** llena todo con una panadería de muestra para que veas cómo funciona.
3. Cuando esté lista: **⬇️ Descargar página**. Te baja un archivo `index.html` con todo adentro (diseño, fotos, mapa y botones de WhatsApp).
4. **💾 Guardar datos** baja un archivo `.json` con la información del cliente. Guárdalo en una carpeta por cliente: cuando te pida cambios, lo abres con **📂 Abrir datos**, cambias lo que sea y vuelves a descargar la página.

> El generador también recuerda lo último que escribiste en ese navegador, pero no te confíes: guarda siempre el `.json`.

## Lista para el cliente

El botón **📋 Lista para el cliente** muestra el mensaje con todo lo que le tienes que pedir (datos, horarios, fotos, redes…). Le das **Copiar** y lo pegas en WhatsApp. El texto se edita en `lista-cliente.js`.

## Publicar la página del cliente (gratis)

La forma más fácil es **Netlify Drop**:

1. Crea una carpeta con el nombre del cliente y mete ahí el `index.html` que descargaste.
2. Entra a https://app.netlify.com/drop (crea una cuenta gratis para que la página no se borre).
3. Arrastra la carpeta a la página. En segundos te da un link tipo `algo-random.netlify.app`.
4. En *Site configuration → Change site name* le pones un nombre bonito: `panaderia-donamary.netlify.app`.
5. Si el cliente compra dominio propio (`panaderiadonamary.com`), se conecta en *Domain management*.

Para actualizarla: en el sitio de Netlify, pestaña *Deploys*, arrastra de nuevo la carpeta con el `index.html` nuevo.

## Consejos

- **Fotos:** con buena luz salen mucho mejor. Pide fotos horizontales para la portada.
- **Color:** usa el del logo o el del local del cliente.
- **Diseño:** *Elegante* va bien para estéticas, cafés, pastelerías y consultorios; *Fuerte* para talleres, gimnasios y barberías; *Moderno* para casi todo lo demás.
- **Reseñas:** solo pon reseñas reales que el cliente tenga en Google o Facebook.
- **Antes de entregar:** abre la página en tu celular y prueba el botón de WhatsApp y el de "Cómo llegar".
