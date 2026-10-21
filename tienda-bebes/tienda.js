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

  // Fotos: las del producto y la de cada color. Cada foto tiene su miniatura "-p.webp".
  const fotosDe = (p) => [...new Set([...(p.fotos || []), ...p.variantes.map((v) => v.foto).filter(Boolean)])];
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
  const estado = { cat: "", texto: "", orden: "", mostrar: POR_PAGINA };
  const grilla = $("[data-grilla]");
  const inputBusqueda = $("[data-busqueda]");

  const chips = [{ id: "", nombre: "Todo", emoji: "✨" }, ...conProductos];
  $("[data-chips]").innerHTML = chips
    .map((c) => `<button type="button" role="tab" data-chip="${c.id}">${c.emoji} ${c.nombre}</button>`)
    .join("");
  $$("[data-chip]").forEach((b) => b.addEventListener("click", () => irACategoria(b.dataset.chip, false)));

  function filtrados() {
    let lista = estado.texto ? buscar(estado.texto) : [...PRODS];
    if (estado.cat === "promos") lista = lista.filter(deLaPromo);
    else if (estado.cat) lista = lista.filter((p) => p.categoria === estado.cat);
    // Los que no tienen precio van al final.
    if (estado.orden === "menor") lista.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
    else if (estado.orden === "mayor") lista.sort((a, b) => (b.precio ?? -1) - (a.precio ?? -1));
    else if (!estado.texto)
      lista.sort((a, b) => ORDEN_ESTADO[estadoDe(a)] - ORDEN_ESTADO[estadoDe(b)] || !fotosDe(a).length - !fotosDe(b).length);
    return lista;
  }

  function pintarCatalogo() {
    const lista = filtrados();
    $$("[data-chip]").forEach((b) => b.setAttribute("aria-selected", b.dataset.chip === estado.cat));
    grilla.innerHTML = lista
      .slice(0, estado.mostrar)
      .map(
        (p) => `<article class="tarjeta${estadoDe(p) === "agotado" ? " sin-stock" : ""}">
          <button type="button" class="tarjeta-foto" data-ver="${p.id}" aria-label="Ver ${esc(p.nombre)}">${imagen(p, "foto")}${sello(p)}</button>
          <h3><button type="button" data-ver="${p.id}">${esc(p.nombre)}</button></h3>
          <p>${precioHTML(p)}</p>
          ${disponible(p)
            ? `<button type="button" class="btn btn-mini" data-agregar="${p.id}">Agregar</button>`
            : `<button type="button" class="btn btn-mini btn-borde" data-ver="${p.id}">${estadoDe(p) === "agotado" ? "Avísame" : "Consultar"}</button>`}
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
      // Si tiene colores, hay que elegir en la ficha.
      if (hayQueElegir(p)) abrirProducto(p.id);
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
    const verFoto = (src) => {
      if (!src) return;
      $("[data-ficha-foto] .foto", caja).outerHTML = imagen(p, "foto", src, true);
      caja.querySelectorAll("[data-foto]").forEach((b) => b.classList.toggle("activa", b.dataset.foto === src));
    };
    caja.querySelectorAll("[data-foto]").forEach((b) => b.addEventListener("click", () => verFoto(b.dataset.foto)));
    const pintarVariante = () => {
      verFoto(v.foto || $("[data-foto].activa", caja)?.dataset.foto || fotosDe(p)[0]);
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
      const { p, v, subtotal } = linea(it);
      return `• ${it.cant} × ${p.nombre}${v.color ? ` (${v.color})` : ""} [${v.sku}]: ${precio(subtotal)}`;
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
    mostrarBusqueda,
    total,
    unidades,
    items: () => items,
  };
})();
