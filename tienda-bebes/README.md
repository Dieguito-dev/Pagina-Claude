# Tienda de bebés con asistente virtual

Tienda en línea **sin Shopify** (catálogo de Baby's World) con un **asistente virtual que atiende, recomienda y acompaña** al cliente, al estilo de Dalia en yoeco.ai.

Es aparte de Vitrina: no usa ni cambia nada de la página principal.

## Qué hace

- **Catálogo**: categorías (menú y botones), buscador, ordenar por precio, etiquetas de *Agotado* y de *promo* con el % de descuento.
- **Ficha de producto**: colores o tallas, cantidad, "¡Quedan solo 3!", *Preguntar por WhatsApp* y *Avísame cuando llegue* para lo agotado.
- **Carrito**: se guarda aunque cierres la página. Al finalizar pide nombre, ciudad, dirección y forma de pago, y **manda el pedido armado por WhatsApp**.
- **Asistente (Nubi)**: 
  - "Ayúdame a elegir": 3 preguntas (edad del bebé, qué busca y presupuesto) y recomienda productos.
  - Entiende cosas como "tienen teteros?", "algo para 8 meses de menos de 200 mil" o "hacen envíos a Cali?".
  - Muestra productos con botón *Agregar*, las promos, el resumen del carrito y pasa a WhatsApp con una persona.
  - No usa IA de pago: funciona con palabras clave y el catálogo, así que **no tiene costo**.
- **Detalles**: cinta en movimiento ("Te asesora · Te recomienda · Te acompaña") y cielo interactivo, donde cada toque suelta una estrellita.

## Qué editar

| Archivo | Para qué |
|---|---|
| `config.js` | Nombre, WhatsApp, nombre del asistente, textos de envíos, pagos, horario, cambios y redes |
| `productos.js` | El catálogo. **No se edita a mano**: se genera desde el Excel del cliente (abajo) |
| `pendientes-catalogo.md` | Lo que hay que corregir en el Excel: precios raros, referencias sin precio o sin stock, etc. |
| `styles.css` | Colores (arriba, en `:root`) |

## Actualizar el catálogo desde el Excel

El cliente lleva su catálogo en `Levantamiento de atributos_Catálogo.xlsx` (hoja `plantilla_atributos_productos`). Cuando cambie precios o stock:

```
python3 tienda-bebes/herramientas/excel_a_productos.py ruta/al/archivo.xlsx
```

Eso vuelve a crear `productos.js` y `pendientes-catalogo.md`. El Excel no se sube al repositorio.

Cómo se leen los datos:
- Las filas con el **mismo título** son un solo producto, y cada fila es un **color** con su SKU y su stock. Si el título termina en el color ("COCHE DONA GRIS"), se junta con los otros colores.
- **Sin precio** → sale "Consultar precio" y se pregunta por WhatsApp.
- **Stock vacío** → sale "Consultar" (no se sabe si hay). **Stock 0** → "Agotado" con "Avísame cuando llegue".
- **Categoría vacía o mal escrita** → se corrige sola (queda anotado en `pendientes-catalogo.md`).
- La **edad** para las recomendaciones de Nubi sale de la categoría (por ejemplo, Caminadores = 6 a 18 meses), porque el Excel casi no trae `RangoEdad`.
- Las filas de ejemplo de la plantilla (BW-2025 y BW-0002) se ignoran.

Para la foto de un producto, sube la imagen a `tienda-bebes/img/` y agrégala en el producto: `imagen: "img/coche.jpg"`. Si no tiene foto, se muestra un dibujito de la categoría.

## Verla

Abre `tienda-bebes/index.html` en el navegador. Para publicarla gratis, sube la carpeta `tienda-bebes` a Netlify Drop (https://app.netlify.com/drop).

## Siguientes pasos posibles

- Pago en línea con Wompi o Mercado Pago (PSE, Nequi, tarjeta).
- Que el asistente use IA de verdad (Claude), como en `agente/`, para conversaciones más naturales (tiene costo por mensaje).
- Manejar los productos desde una hoja de Google en vez de editar `productos.js`.
