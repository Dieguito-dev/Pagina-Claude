// Asistente virtual de la tienda: atiende, recomienda y lleva al cliente hasta el pedido.
// Funciona sin internet ni costos: entiende palabras clave y busca en productos.js.
// Las respuestas de envíos, pagos, horario, etc. salen de config.js.
(function () {
  const T = window.TIENDA;
  const S = window.Tienda;
  const $ = (s, el = document) => el.querySelector(s);

  const chat = $("[data-chat]");
  const log = $("[data-log]");
  const opciones = $("[data-opciones]");
  const form = $("[data-chat-form]");
  const input = $("input", form);
  const lanzador = $("[data-lanzador]");
  let iniciado = false;

  // Preguntas del "diagnóstico" para recomendar productos.
  const EDADES = [
    { txt: "Aún no nace", rango: [-9, 1] },
    { txt: "0 a 6 meses", rango: [0, 6] },
    { txt: "6 a 12 meses", rango: [6, 12] },
    { txt: "1 a 3 años", rango: [12, 36] },
    { txt: "Más de 3 años", rango: [36, 96] },
  ];
  const NECESIDADES = [
    { txt: "🚼 Salir de paseo", cats: ["coches", "coche-mellicero", "sillas-carro", "panalera"] },
    { txt: "🍼 Comer y lactancia", cats: ["alimentacion", "comedores", "lactancia"] },
    { txt: "🌙 Dormir y descansar", cats: ["corrales", "mecedoras"] },
    { txt: "🛁 Baño y cuidado", cats: ["baneras", "bano", "cuidado-personal"] },
    { txt: "🧩 Jugar y aprender", cats: ["estimulacion", "juguetes", "caminadores", "paseador", "montables", "triciclos", "bicicletas", "carros-electricos"] },
    { txt: "🎁 Un regalo", cats: null },
  ];
  const PRESUPUESTOS = [
    { txt: "Hasta $100.000", max: 100000 },
    { txt: "Hasta $300.000", max: 300000 },
    { txt: "Hasta $600.000", max: 600000 },
    { txt: "No importa", max: Infinity },
  ];
  let diag = null; // { paso, edad, cats, max }

  // ---------- Pintar mensajes ----------
  function burbuja(quien, texto) {
    const div = document.createElement("div");
    div.className = `burbuja ${quien}`;
    div.textContent = texto;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function tarjetas(lista) {
    const div = document.createElement("div");
    div.className = "chat-productos";
    div.innerHTML = lista
      .map(
        (p) => `<div class="mini">
          <button type="button" class="mini-foto" data-ver="${p.id}">${S.imagen(p, "foto")}</button>
          <strong>${S.esc(p.nombre)}</strong>
          <span>${S.precio(p.precio)}${S.enPromo(p) ? " 🏷️" : ""}</span>
          ${S.disponible(p)
            ? `<button type="button" class="btn btn-mini" data-agregar="${p.id}">Agregar</button>`
            : `<button type="button" class="btn btn-mini btn-borde" data-ver="${p.id}">Agotado · avísame</button>`}
        </div>`
      )
      .join("");
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  // Cada botón: { txt, fn } o { txt, url }.
  function botones(lista) {
    opciones.innerHTML = "";
    lista.forEach((b, i) => {
      const el = document.createElement(b.url ? "a" : "button");
      el.className = `opcion${i === 0 ? " destacada" : ""}`;
      el.textContent = b.txt;
      if (b.url) Object.assign(el, { href: b.url, target: "_blank", rel: "noopener" });
      else {
        el.type = "button";
        el.addEventListener("click", () => {
          burbuja("yo", b.txt);
          opciones.innerHTML = "";
          b.fn();
        });
      }
      opciones.appendChild(el);
    });
    log.scrollTop = log.scrollHeight;
  }

  // Respuesta del asistente con una pequeña pausa de "escribiendo…".
  function responder(textos, extra) {
    opciones.innerHTML = "";
    const lista = [].concat(textos);
    const puntos = burbuja("bot escribiendo", "• • •");
    setTimeout(() => {
      puntos.remove();
      lista.forEach((t) => burbuja("bot", t));
      extra?.();
    }, 450);
  }

  function hablarConPersona() {
    return T.whatsapp ? { txt: "💬 Hablar con una persona", url: S.waLink(`Hola ${T.marca}, necesito ayuda.`) } : null;
  }

  function menuPrincipal() {
    botones(
      [
        { txt: "Ayúdame a elegir", fn: diagnostico },
        { txt: "Ver promos", fn: promos },
        { txt: "Envíos y pagos", fn: enviosPagos },
        { txt: "Mi carrito", fn: miCarrito },
        hablarConPersona(),
      ].filter(Boolean)
    );
  }

  // ---------- Flujos ----------
  function diagnostico() {
    abrirChat(false);
    diag = { paso: "edad" };
    responder("¡Con gusto! Te hago 3 preguntas rápidas. ¿Qué edad tiene tu bebé?", () =>
      botones(EDADES.map((e) => ({ txt: e.txt, fn: () => elegirEdad(e.rango) })))
    );
  }

  function elegirEdad(rango) {
    diag = { ...diag, paso: "necesidad", edad: rango };
    responder("¿Qué estás buscando?", () =>
      botones(NECESIDADES.map((n) => ({ txt: n.txt, fn: () => elegirNecesidad(n.cats) })))
    );
  }

  function elegirNecesidad(cats) {
    diag = { ...diag, paso: "presupuesto", cats };
    responder("¿Más o menos cuánto quieres invertir?", () =>
      botones(PRESUPUESTOS.map((p) => ({ txt: p.txt, fn: () => recomendar({ ...diag, max: p.max }) })))
    );
  }

  const sirveEdad = (p, [desde, hasta]) => !p.edad || (p.edad[0] <= hasta && p.edad[1] >= desde);

  function recomendar({ edad, cats, max = Infinity }) {
    diag = null;
    let base = S.productos.filter(
      (p) => S.disponible(p) && (!edad || sirveEdad(p, edad)) && (!cats || cats.includes(p.categoria))
    );
    let lista = base.filter((p) => p.precio <= max);
    let intro = "Esto es lo que te recomiendo:";
    if (!lista.length && base.length) {
      lista = base.sort((a, b) => a.precio - b.precio);
      intro = `En ese presupuesto no tengo opciones, pero estas son las más económicas que sí le sirven:`;
    }
    lista.sort((a, b) => S.enPromo(b) - S.enPromo(a) || a.precio - b.precio);
    if (!lista.length) {
      responder("Uy, ahora mismo no tengo productos disponibles para eso. Una persona del equipo te puede ayudar a conseguirlo.", () =>
        botones([hablarConPersona(), { txt: "Volver a empezar", fn: diagnostico }].filter(Boolean))
      );
      return;
    }
    responder(intro, () => {
      tarjetas(lista.slice(0, 4));
      botones(
        [
          lista.length > 4 && cats && cats.length === 1 && { txt: "Ver todos en el catálogo", fn: () => S.irACategoria(cats[0]) },
          { txt: "Buscar otra cosa", fn: diagnostico },
          { txt: "Mi carrito", fn: miCarrito },
          hablarConPersona(),
        ].filter(Boolean)
      );
    });
  }

  function promos() {
    const lista = S.productos.filter((p) => S.enPromo(p) && S.disponible(p));
    if (!lista.length) {
      responder("Ahora mismo no tenemos promos activas, pero te puedo ayudar a encontrar algo en tu presupuesto.", menuPrincipal);
      return;
    }
    responder(`Tenemos ${lista.length} producto${lista.length === 1 ? "" : "s"} en promo 🏷️`, () => {
      tarjetas(lista);
      botones([{ txt: "Ver promos en el catálogo", fn: () => S.irACategoria("promos") }, { txt: "Ayúdame a elegir", fn: diagnostico }]);
    });
  }

  function enviosPagos() {
    responder([`🚚 ${T.envios}`, `💳 ${T.pagos}`], menuPrincipal);
  }

  function miCarrito() {
    const n = S.unidades();
    if (!n) {
      responder("Tu carrito está vacío por ahora. ¿Te ayudo a encontrar algo?", menuPrincipal);
      return;
    }
    responder(
      `Llevas ${n} producto${n === 1 ? "" : "s"} por ${S.precio(S.total())}. Cuando quieras, finaliza el pedido y te llega por WhatsApp a una persona del equipo para confirmar envío y pago.`,
      () =>
        botones([
          { txt: "Finalizar pedido", fn: () => { cerrarChat(); S.abrirCarrito(); } },
          { txt: "Seguir comprando", fn: menuPrincipal },
        ])
    );
  }

  // ---------- Entender texto libre ----------
  const tiene = (t, palabras) => palabras.some((p) => new RegExp(`\\b${p}`).test(t));

  function edadDe(t) {
    if (tiene(t, ["recien nacid", "neonato"])) return [0, 3];
    if (tiene(t, ["embarazad", "por nacer", "va a nacer", "voy a tener", "baby shower"])) return [-9, 1];
    const m = t.match(/(\d+)\s*(mes|año|ano)/);
    if (!m) return null;
    const meses = +m[1] * (m[2] === "mes" ? 1 : 12);
    return [meses, meses];
  }

  function presupuestoDe(t) {
    const m = t.match(/(\d[\d.]*)\s*(mil|k)\b/) || t.match(/\$\s?(\d{1,3}(?:\.\d{3})+|\d{4,})/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/\./g, m[2] ? "." : ""));
    return m[2] ? n * 1000 : n;
  }

  function entender(texto) {
    const t = S.normal(texto);
    if (diag) diag = null;

    if (/^(hola|buenas|buenos|hey|ola)\b/.test(t) && t.length < 25) {
      responder(`¡Hola! 💙 Soy ${T.asistente}. Cuéntame qué buscas o la edad de tu bebé y te recomiendo.`, menuPrincipal);
      return;
    }
    if (tiene(t, ["gracias", "listo", "perfecto"]) && t.length < 25) {
      responder("¡Con gusto! Aquí estoy si necesitas algo más. 💙", menuPrincipal);
      return;
    }
    if (tiene(t, ["asesor", "una persona", "humano", "whatsapp", "llamar", "hablar con"])) {
      const b = hablarConPersona();
      responder(b ? "¡Claro! Toca el botón y te atiende una persona del equipo por WhatsApp." : `${T.horario}`, () =>
        b ? botones([b, { txt: "Seguir con " + T.asistente, fn: menuPrincipal }]) : menuPrincipal()
      );
      return;
    }
    if (tiene(t, ["envio", "envia", "domicilio", "llega", "demora", "despach", "flete"])) {
      responder(`🚚 ${T.envios}`, menuPrincipal);
      return;
    }
    if (tiene(t, ["pago", "pagar", "nequi", "daviplata", "tarjeta", "contraentrega", "contra entrega", "transferencia", "efectivo", "cuotas"])) {
      responder(`💳 ${T.pagos}`, menuPrincipal);
      return;
    }
    if (tiene(t, ["garantia", "cambio", "devolu", "defecto", "danad"])) {
      responder(`🛡️ ${T.cambios}`, menuPrincipal);
      return;
    }
    if (tiene(t, ["promo", "descuento", "oferta", "rebaja", "barato"])) return promos();
    if (tiene(t, ["carrito", "pedido", "finalizar", "pagar ya", "mi compra"])) return miCarrito();

    // Producto, edad y/o presupuesto.
    const encontrados = S.buscar(texto);
    const edad = edadDe(t);
    const max = presupuestoDe(t);
    if (encontrados.length) {
      let lista = encontrados.filter((p) => (!edad || sirveEdad(p, edad)) && (!max || p.precio <= max));
      if (!lista.length && (edad || max)) {
        recomendar({ edad, max: max || Infinity, cats: null });
        return;
      }
      if (!lista.length) lista = encontrados;
      responder(lista.length === 1 ? "¡Lo tengo! Mira:" : `Encontré ${lista.length} opciones:`, () => {
        tarjetas(lista.slice(0, 4));
        botones(
          [
            lista.length > 4 && { txt: "Ver todos", fn: () => { cerrarChat(); S.mostrarBusqueda(texto); } },
            { txt: "Ayúdame a elegir", fn: diagnostico },
            hablarConPersona(),
          ].filter(Boolean)
        );
      });
      return;
    }
    if (edad || max) {
      recomendar({ edad, max: max || Infinity, cats: null });
      return;
    }
    if (tiene(t, ["donde", "ubica", "direccion", "tienda fisica", "local"])) {
      responder(`📍 ${T.ubicacion}`, menuPrincipal);
      return;
    }
    if (tiene(t, ["horario", "hora", "atienden", "abierto"])) {
      responder(`🕘 ${T.horario}`, menuPrincipal);
      return;
    }
    if (tiene(t, ["recomiend", "ayuda", "regalo", "elegir", "no se", "necesito", "que me sirve"])) return diagnostico();

    responder(
      "Mmm, no estoy segura de haber entendido 🙈. Puedes decirme el producto (por ejemplo “coche” o “tetero”), la edad de tu bebé o tu presupuesto.",
      () =>
        botones(
          [{ txt: "Ayúdame a elegir", fn: diagnostico }, { txt: "Ver promos", fn: promos }, hablarConPersona()].filter(Boolean)
        )
    );
  }

  // ---------- Abrir y cerrar ----------
  function abrirChat(saludar = true) {
    chat.hidden = false;
    lanzador.classList.add("abierto");
    $("[data-aviso]").hidden = true;
    if (!iniciado) {
      iniciado = true;
      if (saludar) {
        burbuja("bot", `Hola, soy ${T.asistente}, de ${T.marca}. 💙`);
        responder(
          "Te ayudo a encontrar lo que tu bebé necesita según su edad y tu presupuesto, te cuento de envíos y pagos, y te acompaño hasta tu pedido. ¿Qué te trae por aquí?",
          menuPrincipal
        );
      }
    }
    if (matchMedia("(min-width: 700px)").matches) input.focus();
  }

  function cerrarChat() {
    chat.hidden = true;
    lanzador.classList.remove("abierto");
  }

  lanzador.addEventListener("click", () => (chat.hidden ? abrirChat() : cerrarChat()));
  $("[data-cerrar]", chat).addEventListener("click", cerrarChat);
  document.querySelectorAll("[data-diagnostico]").forEach((b) => b.addEventListener("click", diagnostico));
  document.querySelectorAll("[data-hablar-asistente]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelector("[data-velo]").click();
      abrirChat();
    })
  );
  document.querySelector("[data-preguntar-vacio]").addEventListener("click", () => {
    const q = document.querySelector("[data-busqueda]").value.trim();
    abrirChat(!q);
    if (q) {
      burbuja("yo", q);
      entender(q);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;
    input.value = "";
    burbuja("yo", texto);
    entender(texto);
  });

  log.addEventListener("click", (e) => {
    const ver = e.target.closest("[data-ver]");
    const add = e.target.closest("[data-agregar]");
    if (ver) {
      cerrarChat();
      S.abrirProducto(ver.dataset.ver);
    } else if (add) {
      const p = S.producto(add.dataset.agregar);
      if (p.opciones?.length) {
        cerrarChat();
        S.abrirProducto(p.id);
      } else if (S.agregar(p.id)) {
        responder(`Listo, agregué ${p.nombre} a tu carrito 🛒`, () =>
          botones([
            { txt: "Finalizar pedido", fn: () => { cerrarChat(); S.abrirCarrito(); } },
            { txt: "Seguir comprando", fn: menuPrincipal },
          ])
        );
      }
    }
  });

  window.Asistente = { abrir: abrirChat, diagnostico };
})();
