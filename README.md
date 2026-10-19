# Presencia Pro — Páginas web de presencia para negocios

Página para vender el servicio: **creamos páginas web sencillas para negocios** (quién eres, qué ofreces, ubicación, horarios y contacto).

> "Presencia Pro" es un nombre provisional. Se cambia en `config.js`.

## Estructura

| Archivo / carpeta | Para qué sirve |
|---|---|
| `index.html` | La página (inicio, cómo funciona, qué incluye, preguntas y formulario de contacto) |
| `config.js` | **Lo que más vas a editar:** nombre de la marca, email, WhatsApp y la URL del formulario |
| `styles.css` | Colores y diseño (los colores están arriba, en `:root`) |
| `main.js` | Llena la página con `config.js` y envía el formulario |
| `ejemplos/` | 3 páginas de ejemplo (taquería, estética, taller) para mostrar a clientes. Sirven de plantilla para clientes reales |
| `img/` | Capturas de los ejemplos y `compartir.png` (la imagen que sale al mandar el link por WhatsApp/Facebook) |
| `favicon.svg` | Iconito de la pestaña del navegador |
| `hoja-de-contactos/` | Script para que los contactos del formulario se guarden en una hoja de Google ([instrucciones](hoja-de-contactos/README.md)) |
| `agente/` | Extra en pausa: chat con IA para cuando un cliente lo quiera ([instrucciones](agente/README.md)) |

## Publicarla gratis

Es una página estática (no necesita servidor ni llaves de API):

- **Vercel o Netlify:** importa este repositorio desde https://vercel.com o https://netlify.com y dale *Deploy*.
- **GitHub Pages:** en el repo, *Settings → Pages → Deploy from a branch* y elige la rama.

Para verla en tu compu basta con abrir `index.html` en el navegador.

## Pendientes

- [ ] Elegir nombre de la marca (`config.js` → `marca`)
- [ ] Conectar el formulario con la hoja de Google (`hoja-de-contactos/README.md`)
- [ ] (Opcional) Número de WhatsApp (`config.js` → `whatsapp`)
- [ ] Definir precios
- [ ] Al tener dominio: poner la dirección completa en `og:image` (en `index.html`) para que la vista previa al compartir funcione en todos lados
