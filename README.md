# Presencia Pro — Página web + Agente IA

Página de venta del servicio: **creamos páginas web de presencia para negocios y les conectamos un agente de IA (Claude)** que atiende a sus clientes 24/7.

La misma página es la demo: el chat de abajo a la derecha es el agente funcionando.

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página (secciones: inicio, cómo funciona, planes, preguntas, contacto) |
| `config.js` | **Lo que más vas a editar:** nombre de la marca, WhatsApp, email, planes y precios |
| `styles.css` | Colores y diseño (los colores están arriba, en `:root`) |
| `main.js` | Llena la página con `config.js` y maneja el chat |
| `api/chat.js` | Función en el servidor que conecta el chat con Claude (la llave nunca llega al navegador) |
| `api/_prompt.js` | **Las instrucciones del agente:** qué sabe, cómo habla, qué datos pide |

## Publicarla (Vercel, gratis)

1. Crea una llave de API en https://console.anthropic.com (necesita saldo).
2. Entra a https://vercel.com, “Add New → Project” e importa este repositorio.
3. En **Settings → Environment Variables** agrega `ANTHROPIC_API_KEY` con tu llave.
4. Deploy. Listo: te da una URL tipo `tu-proyecto.vercel.app` (luego puedes conectar tu dominio).

Para probarla en tu compu: `npm install`, copia `.env.example` como `.env.local` con tu llave, y corre `npx vercel dev`.

## Hacer la página de un cliente nuevo

1. Copia este proyecto (o haz un “fork”).
2. Cambia `config.js` con los datos del cliente y los textos de `index.html`.
3. Reescribe `api/_prompt.js` con la info del negocio del cliente (productos, precios, horarios, preguntas frecuentes).
4. Publica en Vercel con su propia llave o la tuya (y lo cobras en la mensualidad).

## Modelo de IA y costos

Por defecto usa `claude-opus-5-5`. Para un chat de atención a clientes, un modelo más barato suele bastar: define la variable `CLAUDE_MODEL=claude-sonnet-5-5` (o `claude-haiku-5-5`, el más económico) en Vercel.
