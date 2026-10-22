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

## Diseño: "Un día en el mundo de tu bebé"

La tienda se recorre como el día de un bebé, de la mañana a la noche:

1. **Amanecer**: bienvenida. Nubi pregunta la edad del bebé y **todos los estantes se ajustan a esa edad**: solo salen los productos que le sirven, primero los más específicos para esa edad, y aparece un aviso. Se recuerda en el navegador.
2. **Momentos del día**, cada uno con un estante de productos que se desliza: 7:00 a.m. hora de comer · 10:00 a.m. hora de jugar · 3:00 p.m. hora del paseo · 6:00 p.m. hora del baño · 8:00 p.m. hora de dormir (de noche, con estrellas y el móvil de cuna). "Ver los N productos" abre el catálogo con ese momento.
3. **Todo el catálogo**: buscador, categorías y cuadrícula, para quien busca algo puntual.
4. **Buenas noches**: quiénes somos y **contacto**: número, redes sociales y correo (de `config.js`), un formulario que manda el mensaje por WhatsApp, y envíos, pagos y horario.

Al bajar, **el cielo de la página cambia de color** según el momento y una etiqueta arriba marca la hora. Qué categorías van en cada momento, sus horas, frases y colores están al comienzo de `dia.js`.

El estilo visual está en `temas/cuento.css`, encima de `styles.css`: colores del logo, costuras punteadas, productos sobre manchas pastel, precio en etiqueta colgante y categorías como burbujas.

## Ver los productos en 3D

En la página de cada producto aparecen los botones **Fotos · Girar 360° · Ver en 3D** cuando ese producto tiene el material. En el catálogo, su tarjeta lleva un sello "3D" o "360°". Hay dos formas, las dos fieles al producto real:

1. **Modelo 3D escaneado** (archivo `.glb`): se gira, se le hace zoom y en el celular se puede **ver en tu casa** con la cámara (realidad aumentada). Se hace con apps como **Polycam** o **Luma AI**: se le da la vuelta al producto grabándolo con el celular y se exporta en formato **GLB**, de 20 MB como máximo. Funciona mejor con productos sólidos; mallas, telas transparentes y piezas muy delgadas pueden salir imperfectas.
2. **Giro de 360°** (fotos reales): de 24 a 36 fotos alrededor del producto, todas desde la misma altura y distancia, sobre una base giratoria y con fondo liso. Se nombran en orden (`01.jpg`, `02.jpg`…). Al arrastrar, el producto gira.

**Dónde ponerlos:** en el Drive del cliente, dentro de la carpeta del producto (`CATEGORÍA / NOMBRE DEL PRODUCTO /`), el archivo `.glb` suelto y las fotos del giro en una subcarpeta llamada **`360`**. Después se corren `fotos_drive.py` y `excel_a_productos.py` (ver abajo). Los modelos quedan en `modelos/` y los cuadros del giro en `img/p/<producto>/giro/`.

**3. Modelo generado con IA a partir de la foto** (`herramientas/fotos_a_3d.py`, con **Hunyuan3D-2.1** de Tencent a través de su demo gratuita en Hugging Face): modelo con textura, unos 2 minutos y ~3 MB por producto. Queda en `modelos/<producto>.ia.glb` y en la tienda sale con la nota "Modelo aproximado, hecho con IA a partir de la foto". Si después suben un modelo escaneado a Drive, ese reemplaza al de IA.
- Necesita un token de Hugging Face en la variable `HF_TOKEN` (guárdalo como secreto del entorno, no en el código) y acceso a `huggingface.co` y `*.hf.space`.
- **Cuota:** cada modelo reserva unos 4,5 minutos de tarjeta gráfica de Hugging Face. La cuenta gratis alcanza para ~1 modelo al día; Hugging Face PRO da 40 minutos diarios.
- El frente sale fiel a la foto y la parte de atrás la estima la IA. Funciona con fotos del **producto solo y completo, sobre fondo blanco**; con montajes (varios productos o textos) sale mal. **Revisa cada modelo antes de publicarlo** y borra el `.ia.glb` si no se parece.
- El programa pasa la textura al formato estándar del GLB (Hunyuan la deja como texto y con el tipo de imagen equivocado, lo que puede cerrar la realidad aumentada de Google) y deja el modelo a tamaño real.
- Primera prueba: triciclo dinosaurio (muy fiel; un pedal quedó suelto). Antes se probó TripoSR, que corre sin tarjeta gráfica, pero sus modelos salían borrosos y deformes.

**Ver en tu espacio (realidad aumentada, como en Amazon):** en celulares compatibles (Android con Google, iPhone con AR Quick Look) la vista 3D muestra el botón "📱 Ver en tu espacio", que abre la cámara y pone el producto en el piso **a tamaño real y fijo** (no se puede agrandar ni achicar). En computador sale "Abre esta página en tu celular…". Para el tamaño, `fotos_a_3d.py` escala cada modelo así:
1. Con las medidas reales de `herramientas/medidas.json` (alto, ancho y largo en cm): el modelo queda exacto, por ejemplo el triciclo dinosaurio a 66 × 42 × 62 cm, sacado de su foto de medidas en Drive.
2. Si no hay, con un alto típico según el tipo de producto (`ALTO_TIPICO`), y la tienda avisa "Tamaño aproximado".

Para que todos queden exactos, hay que anotar las medidas reales de cada producto en `medidas.json` antes de generar su modelo.

El visor 3D es [model-viewer](https://modelviewer.dev) de Google (`vendor/model-viewer.min.js`, versión 3.5.0). Se carga solo cuando alguien abre la vista 3D.

## Banners del inicio

El carrusel de arriba se arma con la lista `banners` de `config.js`. Para agregar uno, sube la imagen a `img/banners/` y agrega en la lista su `imagen`, un `texto` (lo que dice el banner, para lectores de pantalla), el `enlace` (`"#catalogo"`, `"producto:<id>"`, `"categoria:<id>"` o `"whatsapp"`) y un `fondo` del color de sus bordes. Pasan solos cada 5 segundos; con un solo banner no se muestran flechas ni puntos.

Los dos banners actuales están recortados de una captura de pantalla de la página de Shopify: con los archivos originales se verían más nítidos.

## Actualizar el catálogo desde el Excel

El cliente lleva su catálogo en `Levantamiento de atributos_Catálogo.xlsx` (hoja `plantilla_atributos_productos`). Cuando cambie precios o stock:

```
python3 tienda-bebes/herramientas/excel_a_productos.py ruta/al/archivo.xlsx
```

Eso vuelve a crear `productos.js` y `pendientes-catalogo.md`. El Excel no se sube al repositorio.

Cómo se leen los datos:
- **Edad** (para el filtro de Nubi): sale de la descripción si dice algo como "desde los 4 meses", "recién nacido" o "1 a 4 años"; si no, del tipo de producto (bicicleta, sonajero, bañera…, ver `EDAD_POR_TIPO`) y, por último, de la categoría. Si el Excel trae `RangoEdad`, conviene usarlo.
- Las filas con el **mismo título** son un solo producto, y cada fila es un **color** con su SKU y su stock. Si el título termina en el color ("COCHE DONA GRIS"), se junta con los otros colores.
- **Sin precio** → sale "Consultar precio" y se pregunta por WhatsApp.
- **Stock vacío** → sale "Consultar" (no se sabe si hay). **Stock 0** → "Agotado" con "Avísame cuando llegue".
- **Categoría vacía o mal escrita** → se corrige sola (queda anotado en `pendientes-catalogo.md`).
- Las filas de ejemplo de la plantilla (BW-2025 y BW-0002) se ignoran.

## Actualizar las fotos desde Drive

Las fotos están en la carpeta de Drive del cliente (compartida como "cualquier persona con el enlace"), organizadas así: `CATEGORÍA / NOMBRE DEL PRODUCTO / fotos`, con una subcarpeta por SKU (`BW-…`) para la foto de cada color.

```
python3 tienda-bebes/herramientas/fotos_drive.py 1hiDjeYmj7r9zZRl59Z9NiWWfT7bm3v6h
python3 tienda-bebes/herramientas/excel_a_productos.py ruta/al/archivo.xlsx
```

El primero baja las fotos, las une con cada producto (por SKU o por el nombre de la carpeta) y las guarda livianas en `img/p/` (WebP: grande de 1000 px y miniatura `-p` de 400 px). El segundo las agrega a `productos.js`. Hasta 6 fotos de galería por producto, más la de cada color.

Si una carpeta de producto trae la foto de otro producto, se quita y queda anotado en `pendientes-catalogo.md`, junto con los productos disponibles que no tienen foto.

Para que el entorno de Claude pueda bajar las fotos, la red tiene que permitir `drive.google.com`, `drive.usercontent.google.com` y `*.googleusercontent.com`.

Los productos sin foto muestran un dibujito de su categoría.

## Verla

Abre `tienda-bebes/index.html` en el navegador. Para publicarla gratis, sube la carpeta `tienda-bebes` a Netlify Drop (https://app.netlify.com/drop).

## Siguientes pasos posibles

- Pago en línea con Wompi o Mercado Pago (PSE, Nequi, tarjeta).
- Que el asistente use IA de verdad (Claude), como en `agente/`, para conversaciones más naturales (tiene costo por mensaje).
- Manejar los productos desde una hoja de Google en vez de editar `productos.js`.
