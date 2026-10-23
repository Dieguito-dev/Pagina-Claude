// Tienda: catálogo, buscador, ficha de producto y carrito con pedido por WhatsApp.
// Los datos salen de config.js y productos.js. El asistente (asistente.js) usa window.Tienda.
(function () {
  const T = window.TIENDA;
  const CATS = window.CATEGORIAS;
  const PRODS = window.PRODUCTOS;
  const POR_PAGINA = 12;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const precio = (n) => pesos.format(n);
  // Minúsculas y sin tildes, para comparar textos.
  const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const categoria = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
  const producto = (id) => PRODS.find((p) => p.id === id);
  const enPromo = (p) => p.precioAntes > p.precio;
  const deLaPromo = (p) => enPromo(p) || p.categoria === "promos";
  // Cada producto tiene variantes (colores), cada una con su SKU, su stock y a veces su propio precio.
  const variante = (p, sku) => p.variantes.find((v) => v.sku === sku);
  const precioDe = (p, v) => (v && v.precio != null ? v.precio : p.precio);
  const comprable = (p, v) => v.stock > 0 && precioDe(p, v) != null;
  const elegibles = (p) => p.variantes.filter((v) => comprable(p, v));
  const hayQueElegir = (p) => p.variantes.length > 1 || !!p.variantes[0].color;
  // disponible: se puede comprar ya · agotado: todo en 0 · consultar: falta el precio o el stock en el Excel
  const estadoDe = (p) =>
    elegibles(p).length ? "disponible" : p.variantes.every((v) => v.stock === 0) ? "agotado" : "consultar";
  const disponible = (p) => estadoDe(p) === "disponible";
  const ORDEN_ESTADO = { disponible: 0, consultar: 1, agotado: 2 };

  function waLink(texto) {
    return T.whatsapp ? `https://wa.me/${T.whatsapp}?text=${encodeURIComponent(texto)}` : "";
  }

  // Busca productos por palabras. Devuelve los que coinciden, los más parecidos primero.
  const VACIAS = new Set("el la los las un una unos unas de del para por con sin y o que en mi me mas muy tienen tiene hay quiero busco necesito algo alguna algun cuanto vale cuesta precio bebe bebes nino nina ninos mes meses ano anos menos mil pesos hasta maximo presupuesto".split(" "));
  const raiz = (w) => w.replace(/(es|s)$/, "");
  function buscar(texto) {
    const palabras = normal(texto).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !VACIAS.has(w) && !/^\d+$/.test(w)).map(raiz);
    if (!palabras.length) return [];
    return PRODS.map((p) => {
      const nombre = normal(p.nombre);
      const resto = normal([categoria(p.categoria).nombre, ...(p.etiquetas || []), p.descripcion].join(" "));
      let puntos = 0;
      for (const w of palabras) {
        if (nombre.includes(w)) puntos += 3;
        else if (resto.includes(w)) puntos += 1;
      }
      return { p, puntos };
    })
      .filter((r) => r.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || ORDEN_ESTADO[estadoDe(a.p)] - ORDEN_ESTADO[estadoDe(b.p)])
      .map((r) => r.p);
  }

  // Fotos: primero la de cada color (muestran el producto completo), después la galería.
  // Cada foto tiene su miniatura "-p.webp".
  const fotosDe = (p) => [...new Set([...p.variantes.map((v) => v.foto).filter(Boolean), ...(p.fotos || [])])];
  const mini = (src) => src.replace(/\.webp$/, "-p.webp");

  function imagen(p, clase, src = fotosDe(p)[0], grande = false) {
    return src
      ? `<img class="${clase}" src="${esc(grande ? src : mini(src))}" alt="${esc(p.nombre)}" loading="lazy">`
      : `<div class="${clase} emoji" aria-hidden="true">${p.emoji || categoria(p.categoria).emoji}</div>`;
  }

  function sello(p) {
    const est = estadoDe(p);
    if (est === "agotado") return `<span class="sello agotado">Agotado</span>`;
    if (est === "consultar") return `<span class="sello">Consultar</span>`;
    if (enPromo(p)) return `<span class="sello promo">-${Math.round((1 - p.precio / p.precioAntes) * 100)}%</span>`;
    return "";
  }

  // Sin variante: precio del producto ("Desde" si los colores cambian de precio).
  function precioTexto(p, v) {
    const n = v ? precioDe(p, v) : p.precio;
    if (n == null) return "Consultar precio";
    const desde = !v && p.variantes.some((x) => x.precio != null && x.precio !== p.precio);
    return (desde ? "Desde " : "") + precio(n);
  }

  function precioHTML(p, v) {
    return `<span class="precio">${precioTexto(p, v)}</span>${enPromo(p) ? ` <s>${precio(p.precioAntes)}</s>` : ""}`;
  }

  // ---------- Datos fijos de la página ----------
  $$("[data-marca]").forEach((el) => (el.textContent = T.marca));
  $$("[data-asistente]").forEach((el) => (el.textContent = T.asistente));
  $("[data-lema]").textContent = T.lema;
  $("[data-quienes]").textContent = T.quienesSomos;
  $("[data-envios]").textContent = T.envios;
  $("[data-pagos]").textContent = T.pagos;
  $("[data-horario]").textContent = T.horario;
  $("[data-nota-envio]").textContent = T.envios;
  $("[data-anio]").textContent = new Date().getFullYear();
  document.title = `${T.marca} · Artículos para bebé`;
  $$("[data-whatsapp]").forEach((a) => {
    if (!T.whatsapp) return;
    a.href = waLink(`Hola ${T.marca}, quiero información.`);
    a.hidden = false;
  });
  const REDES = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" };
  $$("[data-redes]").forEach((el) => {
    el.innerHTML = Object.entries(REDES)
      .filter(([k]) => T.redes?.[k])
      .map(([k, n]) => `<a href="${esc(T.redes[k])}" target="_blank" rel="noopener">${n}</a>`)
      .join("");
  });

  // ---------- Contacto ----------
  // 573337062951 -> +57 333 706 2951
  const telefono = T.whatsapp ? T.whatsapp.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})$/, "+$1 $2 $3 $4") : "";
  const enlaceTel = $("[data-telefono]");
  if (enlaceTel) {
    enlaceTel.closest(".contacto-tarjeta").hidden = !telefono;
    enlaceTel.href = waLink(`Hola ${T.marca}, quiero información.`);
    $("[data-telefono-texto]").textContent = telefono;
  }
  const enlaceCorreo = $("[data-correo]");
  if (enlaceCorreo) {
    enlaceCorreo.closest(".contacto-tarjeta").hidden = !T.correo;
    enlaceCorreo.href = `mailto:${T.correo}`;
    $("[data-correo-texto]").textContent = T.correo || "";
  }
  const ICONOS_REDES = {
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5Z"/>',
    instagram: '<path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm4 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM17 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>',
    tiktok: '<path d="M14 3h3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3.2a2.8 2.8 0 1 0 3 2.8V3Z"/>',
  };
  const listaRedes = $("[data-redes-contacto]");
  if (listaRedes) {
    listaRedes.innerHTML = Object.entries(REDES)
      .filter(([k]) => T.redes?.[k])
      .map(([k, n]) => `<li><a href="${esc(T.redes[k])}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS_REDES[k]}</svg>${n}</a></li>`)
      .join("");
    listaRedes.closest(".contacto-tarjeta").hidden = !listaRedes.children.length;
  }
  // El formulario arma el mensaje y lo abre en WhatsApp.
  $("[data-formulario-contacto]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const texto = [
      `¡Hola ${T.marca}! Les escribo desde la página:`,
      "",
      f.get("nombre") && `Nombre: ${f.get("nombre")}`,
      `Correo: ${f.get("correo")}`,
      f.get("telefono") && `Teléfono: ${f.get("telefono")}`,
      f.get("comentario") && `\n${f.get("comentario")}`,
    ]
      .filter((x) => x !== null && x !== "")
      .join("\n");
    if (!T.whatsapp) return avisar("Falta el número de WhatsApp en config.js");
    // Con "noopener" window.open siempre devuelve null; se corta el vínculo a mano.
    const ventana = window.open(waLink(texto), "_blank");
    if (ventana) ventana.opener = null;
    else location.href = waLink(texto);
    e.target.reset();
    avisar("¡Gracias! Termina de enviar tu mensaje en WhatsApp");
  });

  // ---------- Paneles (menú, carrito, ficha) ----------
  const velo = $("[data-velo]");
  const menu = $("[data-menu]");
  const carrito = $("[data-carrito]");
  const modal = $("[data-modal]");

  function abrir(panel) {
    cerrarTodo();
    panel.hidden = false;
    if (panel !== modal) velo.hidden = false;
    document.body.classList.add("sin-scroll");
  }
  function cerrarTodo() {
    [menu, carrito, modal, velo].forEach((el) => (el.hidden = true));
    document.body.classList.remove("sin-scroll");
  }
  velo.addEventListener("click", cerrarTodo);
  modal.addEventListener("click", (e) => e.target === modal && cerrarTodo());
  [menu, carrito, modal].forEach((el) => $("[data-cerrar]", el).addEventListener("click", cerrarTodo));
  document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarTodo());

  $("[data-abrir-menu]").addEventListener("click", () => {
    $("[data-menu-principal]").hidden = false;
    $("[data-menu-categorias]").hidden = true;
    abrir(menu);
  });
  $("[data-ver-categorias]").addEventListener("click", () => {
    $("[data-menu-principal]").hidden = true;
    $("[data-menu-categorias]").hidden = false;
  });
  $("[data-volver]").addEventListener("click", () => {
    $("[data-menu-principal]").hidden = false;
    $("[data-menu-categorias]").hidden = true;
  });
  $$("a", menu).forEach((a) => a.addEventListener("click", cerrarTodo));
  const conProductos = CATS.filter((c) =>
    c.id === "promos" ? PRODS.some(deLaPromo) : PRODS.some((p) => p.categoria === c.id)
  );
  $("[data-lista-categorias]").innerHTML = conProductos.map((c) => `<button type="button" data-cat="${c.id}">${c.nombre}</button>`).join("");
  $$("[data-lista-categorias] button").forEach((b) =>
    b.addEventListener("click", () => {
      cerrarTodo();
      irACategoria(b.dataset.cat);
    })
  );

  // ---------- Catálogo ----------
  // cats + etiqueta (+ filtro opcional): varias categorías a la vez, para un momento del día (ver dia.js).
  const estado = { cat: "", cats: null, filtro: null, etiqueta: "", texto: "", orden: "", mostrar: POR_PAGINA };
  const grilla = $("[data-grilla]");
  const inputBusqueda = $("[data-busqueda]");

  const chips = [{ id: "", nombre: "Todo", emoji: "✨" }, ...conProductos];
  $("[data-chips]").innerHTML = chips
    .map((c) => `<button type="button" role="tab" data-chip="${c.id}"><span class="chip-emoji" aria-hidden="true">${c.emoji}</span><span>${c.nombre}</span></button>`)
    .join("");
  $$("[data-chip]").forEach((b) => b.addEventListener("click", () => irACategoria(b.dataset.chip, false)));

  function filtrados() {
    let lista = estado.texto ? buscar(estado.texto) : [...PRODS];
    if (estado.cat === "promos") lista = lista.filter(deLaPromo);
    else if (estado.cat) lista = lista.filter((p) => p.categoria === estado.cat);
    else if (estado.cats) lista = lista.filter((p) => estado.cats.includes(p.categoria) && (!estado.filtro || estado.filtro(p)));
    // Los que no tienen precio van al final.
    if (estado.orden === "menor") lista.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
    else if (estado.orden === "mayor") lista.sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));
    else if (!estado.texto)
      lista.sort((a, b) => ORDEN_ESTADO[estadoDe(a)] - ORDEN_ESTADO[estadoDe(b)] || !fotosDe(a).length - !fotosDe(b).length);
    return lista;
  }

  function tarjetaHTML(p) {
    return `<article class="tarjeta${estadoDe(p) === "agotado" ? " sin-stock" : ""}">
          <button type="button" class="tarjeta-foto" data-ver="${p.id}" aria-label="Ver ${esc(p.nombre)}">${imagen(p, "foto")}${sello(p)}${p.modelo ? `<span class="sello-3d">3D</span>` : p.giro ? `<span class="sello-3d">360°</span>` : ""}</button>
          <h3><button type="button" data-ver="${p.id}">${esc(p.nombre)}</button></h3>
          <p>${precioHTML(p)}</p>
          ${disponible(p)
            ? `<button type="button" class="btn btn-mini" data-agregar="${p.id}">Agregar</button>`
            : `<button type="button" class="btn btn-mini btn-borde" data-ver="${p.id}">${estadoDe(p) === "agotado" ? "Avísame" : "Consultar"}</button>`}
        </article>`;
  }

  function pintarCatalogo() {
    const lista = filtrados();
    $$("[data-chip]").forEach((b) => b.setAttribute("aria-selected", b.dataset.chip === estado.cat && !estado.cats));
    grilla.innerHTML = lista.slice(0, estado.mostrar).map(tarjetaHTML).join("");
    const cat = estado.cats ? estado.etiqueta : estado.cat && (estado.cat === "promos" ? "Promos" : categoria(estado.cat).nombre);
    $("[data-resumen]").textContent =
      `${lista.length} producto${lista.length === 1 ? "" : "s"}` +
      (cat ? ` en ${cat}` : "") +
      (estado.texto ? ` para “${estado.texto}”` : "");
    $("[data-vacio]").hidden = lista.length > 0;
    $("[data-ver-mas]").hidden = lista.length <= estado.mostrar;
  }

  // Clic en una tarjeta (del catálogo o de cualquier estante): ver el producto o agregarlo.
  function clicTarjeta(e) {
    const ver = e.target.closest("[data-ver]");
    const agregarBtn = e.target.closest("[data-agregar]");
    if (ver) abrirProducto(ver.dataset.ver);
    else if (agregarBtn) {
      const p = producto(agregarBtn.dataset.agregar);
      // Si tiene colores, hay que elegir en la ficha.
      if (hayQueElegir(p)) abrirProducto(p.id);
      else agregar(p.id);
    }
  }
  grilla.addEventListener("click", clicTarjeta);

  let espera;
  inputBusqueda.addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.texto = inputBusqueda.value.trim();
      estado.mostrar = POR_PAGINA;
      pintarCatalogo();
    }, 200);
  });
  $("[data-orden]").addEventListener("change", (e) => {
    estado.orden = e.target.value;
    pintarCatalogo();
  });
  $("[data-ver-mas]").addEventListener("click", () => {
    estado.mostrar += POR_PAGINA;
    pintarCatalogo();
  });
  $("[data-abrir-busqueda]").addEventListener("click", () => {
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => inputBusqueda.focus({ preventScroll: true }), 400);
  });

  function irACategoria(id, desplazar = true) {
    estado.cat = id;
    estado.cats = null;
    estado.texto = "";
    estado.mostrar = POR_PAGINA;
    inputBusqueda.value = "";
    pintarCatalogo();
    $(`[data-chip="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    if (desplazar) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  function irAMomento(etiqueta, cats, filtro = null) {
    Object.assign(estado, { cat: "", cats, filtro, etiqueta, texto: "", mostrar: POR_PAGINA });
    inputBusqueda.value = "";
    pintarCatalogo();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  function mostrarBusqueda(texto) {
    estado.cat = "";
    estado.cats = null;
    estado.texto = texto;
    estado.mostrar = POR_PAGINA;
    inputBusqueda.value = texto;
    pintarCatalogo();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Ficha de producto ----------
  function abrirProducto(id) {
    const p = producto(id);
    if (!p) return;
    const cat = categoria(p.categoria);
    const est = estadoDe(p);
    let v = elegibles(p)[0] || p.variantes[0];
    const conColor = p.variantes.some((x) => x.color);
    const mensaje = {
      disponible: `Hola, quiero saber más de: ${p.nombre}`,
      agotado: `Hola, ¿me avisan cuando llegue: ${p.nombre}?`,
      consultar: `Hola, quiero saber el precio y la disponibilidad de: ${p.nombre}`,
    }[est];
    const textoBoton = { disponible: "Preguntar por WhatsApp", agotado: "Avísame cuando llegue", consultar: "Consultar por WhatsApp" }[est];
    $("[data-modal-contenido]").innerHTML = `
      <div class="ficha-foto" data-ficha-foto>${imagen(p, "foto", v.foto || fotosDe(p)[0], true)}${sello(p)}</div>
      ${p.giro || p.modelo
        ? `<div class="vistas" role="tablist" aria-label="Cómo ver el producto">
            <button type="button" role="tab" data-vista="fotos" aria-selected="true">Fotos</button>
            ${p.giro ? `<button type="button" role="tab" data-vista="giro" aria-selected="false">Girar 360°</button>` : ""}
            ${p.modelo ? `<button type="button" role="tab" data-vista="modelo" aria-selected="false">Ver en 3D</button>` : ""}
          </div>`
        : ""}
      ${fotosDe(p).length > 1
        ? `<div class="miniaturas">${fotosDe(p)
            .map((f, i) => `<button type="button" data-foto="${esc(f)}" aria-label="Foto ${i + 1}"><img src="${esc(mini(f))}" alt="" loading="lazy"></button>`)
            .join("")}</div>`
        : ""}
      <p class="etiqueta">${cat.emoji} ${esc(cat.nombre)}</p>
      <h2>${esc(p.nombre)}</h2>
      <p class="ficha-precio" data-ficha-precio>${precioHTML(p, est === "disponible" ? v : null)}</p>
      ${hayQueElegir(p)
        ? `<fieldset class="opciones"><legend>${conColor ? "Elige un color" : "Elige una opción"}</legend>${p.variantes
            .map((x) => {
              const ok = comprable(p, x);
              const nota = ok ? "" : x.stock === 0 ? " · agotado" : " · consultar";
              return `<label><input type="radio" name="variante" value="${esc(x.sku)}"${x === v && ok ? " checked" : ""}${ok ? "" : " disabled"}><span>${esc(x.color || x.sku)}${nota}</span></label>`;
            })
            .join("")}</fieldset>`
        : ""}
      ${est === "disponible"
        ? `<div class="ficha-acciones">
            <div class="cantidad"><button type="button" data-menos aria-label="Menos">−</button><output data-cant>1</output><button type="button" data-mas aria-label="Más">+</button></div>
            <button class="btn btn-principal" type="button" data-agregar-ficha>Agregar al carrito</button>
          </div>
          <p class="nota" data-ficha-stock></p>`
        : `<p class="nota">${est === "agotado" ? "Este producto está agotado por ahora." : "Escríbenos y te confirmamos precio y disponibilidad."}</p>`}
      <div class="ficha-ayuda">
        ${T.whatsapp ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(waLink(mensaje))}">${textoBoton}</a>` : ""}
        <button class="btn btn-borde" type="button" data-similares>Ver parecidos</button>
      </div>
      ${p.descripcion ? `<div class="ficha-desc">${esc(p.descripcion)}</div>` : ""}`;
    const caja = $("[data-modal-contenido]");
    let cant = 1;
    const out = $("[data-cant]", caja);
    const marco = $("[data-ficha-foto]", caja);
    let vista = "fotos";
    const verFoto = (src) => {
      if (!src) return;
      if (vista !== "fotos") mostrarVista("fotos");
      $(".foto", marco).outerHTML = imagen(p, "foto", src, true);
      caja.querySelectorAll("[data-foto]").forEach((b) => b.classList.toggle("activa", b.dataset.foto === src));
    };
    caja.querySelectorAll("[data-foto]").forEach((b) => b.addEventListener("click", () => verFoto(b.dataset.foto)));

    // Fotos, giro de 360° (fotos reales alrededor del producto) o modelo 3D escaneado.
    let detenerGiro = null;
    function mostrarVista(tipo) {
      vista = tipo;
      detenerGiro?.();
      detenerGiro = null;
      caja.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-selected", b.dataset.vista === tipo));
      marco.classList.toggle("en-3d", tipo !== "fotos");
      $(".nota-3d", marco)?.remove();
      $(".sin-ar", marco)?.remove();
      const actual = $(".foto, .giro, model-viewer", marco);
      if (tipo === "fotos") {
        actual.outerHTML = imagen(p, "foto", $("[data-foto].activa", caja)?.dataset.foto || v.foto || fotosDe(p)[0], true);
      } else if (tipo === "giro") {
        actual.outerHTML = `<div class="giro" tabindex="0" aria-label="${esc(p.nombre)} en 360°. Arrastra o usa las flechas para girarlo.">
          <img src="${esc(p.giro[0])}" alt="" draggable="false"><span class="giro-pista">↔ Arrastra para girar</span></div>`;
        detenerGiro = activarGiro($(".giro", marco), p.giro);
      } else {
        cargarVisor3D();
        actual.outerHTML = `<model-viewer src="${esc(p.modelo)}" poster="${esc(fotosDe(p)[0] || "")}" alt="${esc(p.nombre)} en 3D"
          camera-controls auto-rotate auto-rotate-delay="800" rotation-per-second="18deg" touch-action="pan-y"
          shadow-intensity="1" exposure="1.05" ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed" ar-placement="floor">
          <button slot="ar-button" class="btn btn-principal ar-boton" type="button">📱 Ver en tu espacio</button>
          <p class="carga-3d" slot="progress-bar" data-carga-3d>Cargando el modelo 3D… <span>0%</span></p>
        </model-viewer>${p.modeloIA
          ? `<p class="nota-3d">Modelo aproximado, hecho con IA a partir de la foto.${p.medidaAproximada ? " Tamaño aproximado." : ""} Los detalles de atrás pueden variar.</p>`
          : ""}<p class="sin-ar" hidden>Abre esta página en tu celular para verlo en tu espacio con la cámara.</p>`;
        // "Ver en tu espacio" solo existe en celulares con realidad aumentada; si no, se explica cómo verlo.
        const visor = $("model-viewer", marco);
        visor.addEventListener("load", () => ($(".sin-ar", marco).hidden = visor.canActivateAR), { once: true });
        // Se muestra cuánto va cargando (el modelo pesa unos 3 MB) o, si falla, qué pasó.
        const carga = $("[data-carga-3d]", marco);
        visor.addEventListener("progress", (e) => {
          const avance = e.detail.totalProgress;
          $("span", carga).textContent = `${Math.round(avance * 100)}%`;
          if (avance >= 1) carga.hidden = true;
        });
        visor.addEventListener("error", (e) => {
          carga.hidden = false;
          carga.classList.add("fallo");
          carga.textContent = `No se pudo mostrar el modelo 3D en este dispositivo (${e.detail?.type || "error"}).`;
        });
      }
    }
    caja.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => mostrarVista(b.dataset.vista)));
    const pintarVariante = () => {
      if (vista === "fotos") verFoto(v.foto || $("[data-foto].activa", caja)?.dataset.foto || fotosDe(p)[0]);
      if (est !== "disponible") return;
      $("[data-ficha-precio]", caja).innerHTML = precioHTML(p, v);
      $("[data-ficha-stock]", caja).textContent = v.stock <= 3 ? `¡Quedan solo ${v.stock}!` : "Disponible";
      out.textContent = cant = 1;
    };
    pintarVariante();
    caja.querySelectorAll("input[name=variante]").forEach((r) =>
      r.addEventListener("change", () => {
        v = variante(p, r.value);
        pintarVariante();
      })
    );
    $("[data-menos]", caja)?.addEventListener("click", () => (out.textContent = cant = Math.max(1, cant - 1)));
    $("[data-mas]", caja)?.addEventListener("click", () => (out.textContent = cant = Math.min(v.stock, cant + 1)));
    $("[data-agregar-ficha]", caja)?.addEventListener("click", () => agregar(p.id, v.sku, cant));
    $("[data-similares]", caja).addEventListener("click", () => {
      cerrarTodo();
      irACategoria(p.categoria);
    });
    abrir(modal);
  }

  // Giro de 360°: cambia de foto según cuánto se arrastre (o con las flechas). Devuelve cómo detenerlo.
  function activarGiro(el, cuadros) {
    const img = $("img", el);
    cuadros.forEach((src) => (new Image().src = src)); // precarga para que gire sin saltos
    let i = 0, x0 = null, i0 = 0, auto;
    const ver = (n) => (img.src = cuadros[(i = ((n % cuadros.length) + cuadros.length) % cuadros.length)]);
    const parar = () => clearInterval(auto);
    el.addEventListener("pointerdown", (e) => {
      parar();
      x0 = e.clientX;
      i0 = i;
      el.setPointerCapture(e.pointerId);
      el.classList.add("girando");
    });
    el.addEventListener("pointermove", (e) => x0 !== null && ver(i0 - Math.round((e.clientX - x0) / 9)));
    el.addEventListener("pointerup", () => (x0 = null));
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        parar();
        ver(i + (e.key === "ArrowRight" ? 1 : -1));
        e.preventDefault();
      }
    });
    // Una vuelta lenta al abrir, para que se entienda que gira.
    if (!quieto) {
      let pasos = 0;
      auto = setInterval(() => (++pasos > cuadros.length ? parar() : ver(i + 1)), 90);
    }
    return parar;
  }

  // El visor 3D (model-viewer, de Google) se carga solo la primera vez que alguien lo usa.
  let visor3D = false;
  function cargarVisor3D() {
    if (visor3D) return;
    visor3D = true;
    const s = document.createElement("script");
    s.type = "module";
    s.src = "vendor/model-viewer.min.js";
    document.head.appendChild(s);
  }

  // ---------- Carrito ----------
  const CLAVE = "tienda-bebes-carrito";
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch {}
  items = items.filter((it) => producto(it.id) && variante(producto(it.id), it.sku));

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {}
    pintarCarrito();
  }

  // Sin sku se agrega la primera variante que se pueda comprar.
  function agregar(id, sku = "", cant = 1) {
    const p = producto(id);
    const v = p && (sku ? variante(p, sku) : elegibles(p)[0]);
    if (!v || !comprable(p, v)) return false;
    const it = items.find((i) => i.id === id && i.sku === v.sku);
    if (it) it.cant = Math.min(v.stock, it.cant + cant);
    else items.push({ id, sku: v.sku, cant: Math.min(v.stock, cant) });
    guardar();
    avisar(`${p.nombre} se agregó al carrito`);
    if (!modal.hidden) cerrarTodo();
    return true;
  }

  const linea = (it) => {
    const p = producto(it.id);
    const v = variante(p, it.sku);
    return { p, v, subtotal: precioDe(p, v) * it.cant };
  };
  const total = () => items.reduce((s, it) => s + linea(it).subtotal, 0);
  const unidades = () => items.reduce((s, it) => s + it.cant, 0);

  function pintarCarrito() {
    const n = unidades();
    const contador = $("[data-contador]");
    contador.textContent = n;
    contador.hidden = !n;
    $("[data-subtotal]").textContent = precio(total());
    $("[data-finalizar]").disabled = !n;
    $("[data-items]").innerHTML = n
      ? items
          .map((it, i) => {
            const { p, v, subtotal } = linea(it);
            return `<div class="item">
              ${imagen(p, "item-foto", v.foto || fotosDe(p)[0])}
              <div class="item-info">
                <strong>${esc(p.nombre)}</strong>
                ${v.color ? `<small>${esc(v.color)}</small>` : ""}
                <span>${precio(subtotal)}</span>
                <div class="cantidad"><button type="button" data-item-menos="${i}" aria-label="Menos">−</button><output>${it.cant}</output><button type="button" data-item-mas="${i}" aria-label="Más">+</button></div>
              </div>
              <button type="button" class="item-quitar" data-quitar="${i}" aria-label="Quitar">×</button>
            </div>`;
          })
          .join("")
      : `<p class="vacio-carrito">Tu carrito está vacío.<br><button type="button" class="btn btn-borde" data-pedir-ayuda>¿Te ayudo a elegir?</button></p>`;
  }

  $("[data-items]").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-pedir-ayuda")) {
      cerrarTodo();
      window.Asistente?.diagnostico();
      return;
    }
    const i = +(b.dataset.itemMenos ?? b.dataset.itemMas ?? b.dataset.quitar);
    const it = items[i];
    if (!it) return;
    if ("itemMenos" in b.dataset) it.cant -= 1;
    if ("itemMas" in b.dataset) it.cant = Math.min(linea(it).v.stock, it.cant + 1);
    if ("quitar" in b.dataset || it.cant < 1) items.splice(i, 1);
    guardar();
  });

  function abrirCarrito() {
    $("[data-datos-pedido]").hidden = $("[data-datos-pedido]").disabled = true;
    $("[data-finalizar]").hidden = false;
    $("[data-enviar]").hidden = true;
    pintarCarrito();
    abrir(carrito);
  }
  $("[data-abrir-carrito]").addEventListener("click", abrirCarrito);

  // "Finalizar pedido" pide los datos de envío; después "Enviar pedido por WhatsApp" es un enlace
  // normal (window.open lo bloquean algunos navegadores) que se arma al tocarlo.
  const formPedido = $("[data-pedido]");
  formPedido.addEventListener("submit", (e) => {
    e.preventDefault();
    const datos = $("[data-datos-pedido]");
    datos.hidden = datos.disabled = false;
    $("[data-finalizar]").hidden = true;
    $("[data-enviar]").hidden = false;
    $("input", datos).focus();
  });

  $("[data-enviar]").addEventListener("click", (e) => {
    if (!T.whatsapp) {
      e.preventDefault();
      avisar("Falta el número de WhatsApp en config.js");
      return;
    }
    if (!items.length || !formPedido.reportValidity()) {
      e.preventDefault();
      return;
    }
    const f = new FormData(formPedido);
    const lineas = items.map((it) => {
      const { p, v, subtotal } = linea(it);
      return `• ${it.cant} × ${p.nombre}${v.color ? ` (${v.color})` : ""} [${v.sku}]: ${precio(subtotal)}`;
    });
    e.currentTarget.href = waLink(
      [
        `¡Hola ${T.marca}! Quiero hacer este pedido:`,
        "",
        ...lineas,
        "",
        `Subtotal: ${precio(total())} (sin envío)`,
        "",
        `Nombre: ${f.get("nombre")}`,
        `Ciudad: ${f.get("ciudad")}`,
        `Dirección: ${f.get("direccion")}`,
        `Pago: ${f.get("pago")}`,
      ].join("\n")
    );
  });

  // ---------- Aviso flotante ----------
  let avisoTimer;
  function avisar(texto) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.add("visible");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.remove("visible"), 2200);
  }

  // ---------- Cielo interactivo: cada toque suelta una estrellita ----------
  const cielo = $("[data-cielo]");
  const FIGURAS = ["⭐", "✨", "☁️", "💙", "🌙", "💛"];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  cielo.addEventListener("pointerdown", (e) => {
    // Solo al tocar el cielo vacío, para no estorbar al seleccionar o copiar texto.
    if (quieto || !(e.target === cielo || e.target.closest(".nubes, .sol"))) return;
    const r = cielo.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "estrellita";
    s.textContent = FIGURAS[Math.floor(Math.random() * FIGURAS.length)];
    s.style.left = `${e.clientX - r.left}px`;
    s.style.top = `${e.clientY - r.top}px`;
    s.style.setProperty("--x", `${(Math.random() - 0.5) * 80}px`);
    cielo.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  });

  // ---------- Menú de escritorio: desplegables, categorías y buscador ----------
  const navCategorias = $("[data-nav-categorias]");
  if (navCategorias) {
    navCategorias.innerHTML = conProductos
      .map((c) => `<button type="button" data-ir-categoria="${c.id}"><span class="chip-emoji" aria-hidden="true">${c.emoji}</span>${esc(c.nombre)}</button>`)
      .join("");
    const cerrarPaneles = (excepto) =>
      $$("[data-desplegar]").forEach((b) => {
        if (b.dataset.desplegar === excepto) return;
        b.setAttribute("aria-expanded", "false");
        $(`[data-panel="${b.dataset.desplegar}"]`).hidden = true;
      });
    $$("[data-desplegar]").forEach((b) =>
      b.addEventListener("click", () => {
        const abierto = b.getAttribute("aria-expanded") === "true";
        cerrarPaneles(b.dataset.desplegar);
        b.setAttribute("aria-expanded", String(!abierto));
        $(`[data-panel="${b.dataset.desplegar}"]`).hidden = abierto;
      })
    );
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-desplegable")) cerrarPaneles();
      if (!e.target.closest("[data-buscador-top]")) $("[data-sugerencias]").hidden = true;
      const cat = e.target.closest("[data-ir-categoria]");
      if (cat) {
        cerrarPaneles();
        irACategoria(cat.dataset.irCategoria);
      }
      if (e.target.closest(".nav-panel a")) cerrarPaneles();
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarPaneles());

    // Buscador: sugiere productos mientras se escribe; Enter muestra todos en el catálogo.
    const campo = $("[data-busqueda-top]");
    const sugerencias = $("[data-sugerencias]");
    campo.addEventListener("input", () => {
      const texto = campo.value.trim();
      const lista = texto.length > 1 ? buscar(texto) : [];
      sugerencias.hidden = !texto;
      sugerencias.innerHTML = lista.length
        ? lista
            .slice(0, 6)
            .map((p) => `<button type="button" data-sugerencia="${p.id}">${imagen(p, "sugerencia-foto")}<span><strong>${esc(p.nombre.toLowerCase())}</strong><small>${precioTexto(p)}</small></span></button>`)
            .join("") + (lista.length > 6 ? `<button type="submit" class="sugerencias-todas">Ver los ${lista.length} resultados →</button>` : "")
        : texto.length > 1
          ? `<p class="sugerencias-vacio">No encontramos "${esc(texto)}". Prueba con otra palabra o pregúntale a ${esc(T.asistente)}.</p>`
          : "";
    });
    sugerencias.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sugerencia]");
      if (!b) return;
      sugerencias.hidden = true;
      abrirProducto(b.dataset.sugerencia);
    });
    $("[data-buscador-top]").addEventListener("submit", (e) => {
      e.preventDefault();
      sugerencias.hidden = true;
      if (campo.value.trim()) mostrarBusqueda(campo.value.trim());
    });
  }

  // ---------- Carrusel de banners ----------
  const carrusel = $("[data-banners]");
  const BANNERS = T.banners || [];
  if (!BANNERS.length) carrusel.hidden = true;
  else {
    const pista = $("[data-banners-pista]", carrusel);
    const puntos = $("[data-banners-puntos]", carrusel);
    const destino = (b) => (b.enlace === "whatsapp" ? waLink(`Hola ${T.marca}, vi el banner: ${b.texto}`) : b.enlace?.startsWith("#") ? b.enlace : "#catalogo");
    pista.innerHTML = BANNERS.map(
      (b, i) => `<a class="banner" href="${esc(destino(b))}"${b.enlace === "whatsapp" ? ' target="_blank" rel="noopener"' : ""} data-banner="${i}" style="background:${esc(b.fondo || "#f2efdd")}">
        <img src="${esc(b.imagen)}" alt="${esc(b.texto)}"${i ? ' loading="lazy"' : ""}>
      </a>`
    ).join("");
    puntos.innerHTML = BANNERS.map((_, i) => `<button type="button" data-punto="${i}" aria-label="Ver banner ${i + 1}"></button>`).join("");
    carrusel.classList.toggle("uno", BANNERS.length === 1);

    let actual = 0;
    const marcar = () => $$("[data-punto]", puntos).forEach((b, i) => b.setAttribute("aria-current", i === actual));
    const ir = (i) => {
      actual = (i + BANNERS.length) % BANNERS.length;
      pista.scrollTo({ left: actual * pista.clientWidth, behavior: quieto ? "auto" : "smooth" });
      marcar();
    };
    pista.addEventListener("scroll", () => {
      actual = Math.round(pista.scrollLeft / pista.clientWidth);
      marcar();
    }, { passive: true });

    // Pasa solo cada 5 s; se detiene un rato cuando la persona lo toca.
    let auto;
    const arrancar = () => {
      clearInterval(auto);
      if (!quieto && BANNERS.length > 1) auto = setInterval(() => ir(actual + 1), 5000);
    };
    const pausar = () => {
      clearInterval(auto);
      auto = setTimeout(arrancar, 8000);
    };
    carrusel.addEventListener("pointerdown", pausar);
    carrusel.addEventListener("focusin", pausar);
    $("[data-banner-ant]", carrusel).addEventListener("click", () => ir(actual - 1));
    $("[data-banner-sig]", carrusel).addEventListener("click", () => ir(actual + 1));
    puntos.addEventListener("click", (e) => e.target.dataset.punto && ir(+e.target.dataset.punto));
    pista.addEventListener("click", (e) => {
      const b = BANNERS[e.target.closest("[data-banner]")?.dataset.banner];
      const [tipo, id] = (b?.enlace || "").split(":");
      if (tipo === "producto" && producto(id)) {
        e.preventDefault();
        abrirProducto(id);
      } else if (tipo === "categoria") {
        e.preventDefault();
        irACategoria(id);
      }
    });
    marcar();
    arrancar();
  }

  pintarCatalogo();
  pintarCarrito();

  window.Tienda = {
    productos: PRODS,
    categorias: CATS,
    producto,
    categoria,
    buscar,
    precio,
    normal,
    esc,
    enPromo,
    deLaPromo,
    disponible,
    estadoDe,
    hayQueElegir,
    precioTexto,
    imagen,
    waLink,
    agregar,
    abrirProducto,
    abrirCarrito,
    irACategoria,
    irAMomento,
    mostrarBusqueda,
    tarjetaHTML,
    clicTarjeta,
    fotosDe,
    total,
    unidades,
    items: () => items,
  };
})();
