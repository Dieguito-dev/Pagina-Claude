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
  const disponible = (p) => p.stock > 0;

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
      .sort((a, b) => b.puntos - a.puntos || disponible(b.p) - disponible(a.p))
      .map((r) => r.p);
  }

  function imagen(p, clase) {
    return p.imagen
      ? `<img class="${clase}" src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">`
      : `<div class="${clase} emoji" aria-hidden="true">${p.emoji || categoria(p.categoria).emoji}</div>`;
  }

  function sello(p) {
    if (!disponible(p)) return `<span class="sello agotado">Agotado</span>`;
    if (enPromo(p)) return `<span class="sello promo">-${Math.round((1 - p.precio / p.precioAntes) * 100)}%</span>`;
    return "";
  }

  function precioHTML(p) {
    return `<span class="precio">${precio(p.precio)}</span>${enPromo(p) ? ` <s>${precio(p.precioAntes)}</s>` : ""}`;
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
  $("[data-lista-categorias]").innerHTML = CATS.map((c) => `<button type="button" data-cat="${c.id}">${c.nombre}</button>`).join("");
  $$("[data-lista-categorias] button").forEach((b) =>
    b.addEventListener("click", () => {
      cerrarTodo();
      irACategoria(b.dataset.cat);
    })
  );

  // ---------- Catálogo ----------
  const estado = { cat: "", texto: "", orden: "", mostrar: POR_PAGINA };
  const grilla = $("[data-grilla]");
  const inputBusqueda = $("[data-busqueda]");

  const chips = [{ id: "", nombre: "Todo", emoji: "✨" }, ...CATS].filter(
    (c) => !c.id || c.id === "promos" || PRODS.some((p) => p.categoria === c.id)
  );
  $("[data-chips]").innerHTML = chips
    .map((c) => `<button type="button" role="tab" data-chip="${c.id}">${c.emoji} ${c.nombre}</button>`)
    .join("");
  $$("[data-chip]").forEach((b) => b.addEventListener("click", () => irACategoria(b.dataset.chip, false)));

  function filtrados() {
    let lista = estado.texto ? buscar(estado.texto) : [...PRODS];
    if (estado.cat === "promos") lista = lista.filter(enPromo);
    else if (estado.cat) lista = lista.filter((p) => p.categoria === estado.cat);
    if (estado.orden === "menor") lista.sort((a, b) => a.precio - b.precio);
    else if (estado.orden === "mayor") lista.sort((a, b) => b.precio - a.precio);
    else if (!estado.texto) lista.sort((a, b) => disponible(b) - disponible(a));
    return lista;
  }

  function pintarCatalogo() {
    const lista = filtrados();
    $$("[data-chip]").forEach((b) => b.setAttribute("aria-selected", b.dataset.chip === estado.cat));
    grilla.innerHTML = lista
      .slice(0, estado.mostrar)
      .map(
        (p) => `<article class="tarjeta${disponible(p) ? "" : " sin-stock"}">
          <button type="button" class="tarjeta-foto" data-ver="${p.id}" aria-label="Ver ${esc(p.nombre)}">${imagen(p, "foto")}${sello(p)}</button>
          <h3><button type="button" data-ver="${p.id}">${esc(p.nombre)}</button></h3>
          <p>${precioHTML(p)}</p>
          ${disponible(p)
            ? `<button type="button" class="btn btn-mini" data-agregar="${p.id}">Agregar</button>`
            : `<button type="button" class="btn btn-mini btn-borde" data-ver="${p.id}">Avísame</button>`}
        </article>`
      )
      .join("");
    const cat = estado.cat && (estado.cat === "promos" ? "Promos" : categoria(estado.cat).nombre);
    $("[data-resumen]").textContent =
      `${lista.length} producto${lista.length === 1 ? "" : "s"}` +
      (cat ? ` en ${cat}` : "") +
      (estado.texto ? ` para “${estado.texto}”` : "");
    $("[data-vacio]").hidden = lista.length > 0;
    $("[data-ver-mas]").hidden = lista.length <= estado.mostrar;
  }

  grilla.addEventListener("click", (e) => {
    const ver = e.target.closest("[data-ver]");
    const agregarBtn = e.target.closest("[data-agregar]");
    if (ver) abrirProducto(ver.dataset.ver);
    else if (agregarBtn) {
      const p = producto(agregarBtn.dataset.agregar);
      // Si tiene colores o tallas, hay que elegir en la ficha.
      if (p.opciones?.length) abrirProducto(p.id);
      else agregar(p.id);
    }
  });

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
    estado.texto = "";
    estado.mostrar = POR_PAGINA;
    inputBusqueda.value = "";
    pintarCatalogo();
    $(`[data-chip="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    if (desplazar) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }

  function mostrarBusqueda(texto) {
    estado.cat = "";
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
    $("[data-modal-contenido]").innerHTML = `
      <div class="ficha-foto">${imagen(p, "foto")}${sello(p)}</div>
      <p class="etiqueta">${cat.emoji} ${esc(cat.nombre)}</p>
      <h2>${esc(p.nombre)}</h2>
      <p class="ficha-precio">${precioHTML(p)}</p>
      <p>${esc(p.descripcion || "")}</p>
      ${p.opciones?.length
        ? `<fieldset class="opciones"><legend>Elige una opción</legend>${p.opciones
            .map((o, i) => `<label><input type="radio" name="opcion" value="${esc(o)}"${i ? "" : " checked"}><span>${esc(o)}</span></label>`)
            .join("")}</fieldset>`
        : ""}
      ${disponible(p)
        ? `<div class="ficha-acciones">
            <div class="cantidad"><button type="button" data-menos aria-label="Menos">−</button><output data-cant>1</output><button type="button" data-mas aria-label="Más">+</button></div>
            <button class="btn btn-principal" type="button" data-agregar-ficha>Agregar al carrito</button>
          </div>
          <p class="nota">${p.stock <= 3 ? `¡Quedan solo ${p.stock}!` : "Disponible"}</p>`
        : `<p class="nota">Este producto está agotado por ahora.</p>`}
      <div class="ficha-ayuda">
        ${T.whatsapp
          ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(
              waLink(disponible(p) ? `Hola, quiero saber más de: ${p.nombre}` : `Hola, ¿me avisan cuando llegue: ${p.nombre}?`)
            )}">${disponible(p) ? "Preguntar por WhatsApp" : "Avísame cuando llegue"}</a>`
          : ""}
        <button class="btn btn-borde" type="button" data-similares>Ver parecidos</button>
      </div>`;
    const caja = $("[data-modal-contenido]");
    let cant = 1;
    const out = $("[data-cant]", caja);
    $("[data-menos]", caja)?.addEventListener("click", () => (out.textContent = cant = Math.max(1, cant - 1)));
    $("[data-mas]", caja)?.addEventListener("click", () => (out.textContent = cant = Math.min(p.stock, cant + 1)));
    $("[data-agregar-ficha]", caja)?.addEventListener("click", () => {
      agregar(p.id, $("input[name=opcion]:checked", caja)?.value || "", cant);
    });
    $("[data-similares]", caja).addEventListener("click", () => {
      cerrarTodo();
      irACategoria(p.categoria);
    });
    abrir(modal);
  }

  // ---------- Carrito ----------
  const CLAVE = "tienda-bebes-carrito";
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch {}
  items = items.filter((it) => producto(it.id));

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {}
    pintarCarrito();
  }

  function agregar(id, opcion = "", cant = 1) {
    const p = producto(id);
    if (!p || !disponible(p)) return false;
    const it = items.find((i) => i.id === id && i.opcion === opcion);
    if (it) it.cant = Math.min(p.stock, it.cant + cant);
    else items.push({ id, opcion, cant: Math.min(p.stock, cant) });
    guardar();
    avisar(`${p.nombre} se agregó al carrito`);
    if (!modal.hidden) cerrarTodo();
    return true;
  }

  const total = () => items.reduce((s, it) => s + producto(it.id).precio * it.cant, 0);
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
            const p = producto(it.id);
            return `<div class="item">
              ${imagen(p, "item-foto")}
              <div class="item-info">
                <strong>${esc(p.nombre)}</strong>
                ${it.opcion ? `<small>${esc(it.opcion)}</small>` : ""}
                <span>${precio(p.precio * it.cant)}</span>
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
    if ("itemMas" in b.dataset) it.cant = Math.min(producto(it.id).stock, it.cant + 1);
    if ("quitar" in b.dataset || it.cant < 1) items.splice(i, 1);
    guardar();
  });

  function abrirCarrito() {
    $("[data-datos-pedido]").hidden = $("[data-datos-pedido]").disabled = true;
    $("[data-finalizar]").textContent = "Finalizar pedido";
    pintarCarrito();
    abrir(carrito);
  }
  $("[data-abrir-carrito]").addEventListener("click", abrirCarrito);

  // Primer clic: pide los datos de envío. Segundo: arma el mensaje y abre WhatsApp.
  $("[data-pedido]").addEventListener("submit", (e) => {
    e.preventDefault();
    const datos = $("[data-datos-pedido]");
    if (datos.hidden) {
      datos.hidden = datos.disabled = false;
      $("[data-finalizar]").textContent = T.whatsapp ? "Enviar pedido por WhatsApp" : "Enviar pedido";
      $("input", datos).focus();
      return;
    }
    const f = new FormData(e.target);
    const lineas = items.map((it) => {
      const p = producto(it.id);
      return `• ${it.cant} × ${p.nombre}${it.opcion ? ` (${it.opcion})` : ""}: ${precio(p.precio * it.cant)}`;
    });
    const texto = [
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
    ].join("\n");
    if (!T.whatsapp) {
      avisar("Falta el número de WhatsApp en config.js");
      return;
    }
    window.open(waLink(texto), "_blank", "noopener");
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
    if (quieto || e.target.closest("button, a")) return;
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
    disponible,
    imagen,
    waLink,
    agregar,
    abrirProducto,
    abrirCarrito,
    irACategoria,
    mostrarBusqueda,
    total,
    unidades,
    items: () => items,
  };
})();
