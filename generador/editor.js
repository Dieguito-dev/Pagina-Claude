// Lógica del generador: formulario ↔ datos, fotos, vista previa, guardar/abrir y descargar.
(function () {
  const { generarHTML, TEMAS, DIAS } = window.Plantilla;
  const form = document.getElementById("form");
  const preview = document.getElementById("preview");
  const CLAVE = "generador-datos";
  const COLORES = ["#4f46e5", "#e3262f", "#ff6a13", "#f5b301", "#16a34a", "#0891b2", "#b45f68", "#7c3aed", "#0f172a"];

  const vacio = () => ({
    nombre: "", giro: "", titulo: "", descripcion: "",
    tema: "moderno", color: "#4f46e5",
    whatsapp: "", mensajeWhatsapp: "", telefono: "", email: "", direccion: "", mapsLink: "",
    horario: DIAS.map((_, i) => ({ abierto: i >= 1 && i <= 5, abre: "09:00", cierra: "18:00" })),
    tituloServicios: "Servicios",
    servicios: [{ emoji: "", nombre: "", descripcion: "", precio: "" }],
    razones: [],
    resenas: [],
    redes: { facebook: "", instagram: "", tiktok: "" },
    textoFinal: "",
    fotos: { logo: "", portada: "", galeria: [] },
  });

  const ejemplo = () => ({
    ...vacio(),
    nombre: "Panadería Doña Mary",
    giro: "Panadería artesanal desde 1985",
    titulo: "Pan recién horneado, todos los días",
    descripcion: "Conchas, bolillos, pasteles por encargo y el pan de muerto más rico de la colonia. Horneamos desde las 6 de la mañana.",
    tema: "elegante",
    color: "#b45f2a",
    whatsapp: "5215512345678",
    mensajeWhatsapp: "Hola Doña Mary, quiero hacer un pedido.",
    telefono: "55 1234 5678",
    direccion: "Av. Hidalgo 210, Centro, Guadalajara, Jalisco",
    horario: DIAS.map((_, i) => (i === 0 ? { abierto: true, abre: "07:00", cierra: "14:00" } : { abierto: true, abre: "06:00", cierra: "21:00" })),
    tituloServicios: "Nuestro pan",
    servicios: [
      { emoji: "🥐", nombre: "Pan dulce", descripcion: "Conchas, orejas, cuernos y más, recién salidos del horno.", precio: "Desde $12" },
      { emoji: "🥖", nombre: "Bolillo y telera", descripcion: "Crujiente por fuera, suavecito por dentro.", precio: "$4 c/u" },
      { emoji: "🎂", nombre: "Pasteles por encargo", descripcion: "Para cumpleaños, bodas y XV años. Pídelo con 2 días de anticipación.", precio: "Desde $350" },
    ],
    razones: [
      { emoji: "👵", titulo: "Receta de familia", texto: "Las mismas recetas desde hace casi 40 años." },
      { emoji: "🔥", titulo: "Horneado diario", texto: "Nada de pan de ayer: todo se hornea cada mañana." },
      { emoji: "🛵", titulo: "Pedidos a domicilio", texto: "Te llevamos tu pedido en la colonia." },
    ],
    resenas: [],
    redes: { facebook: "panaderiadonamary", instagram: "@panaderiadonamary", tiktok: "" },
    textoFinal: "¿Se te antojó?",
  });

  let datos = cargarLocal() || ejemplo();

  // ---------- utilidades ----------
  const obtener = (obj, ruta) => ruta.split(".").reduce((o, k) => o?.[k], obj);
  const asignar = (obj, ruta, valor) => {
    const ks = ruta.split(".");
    const ult = ks.pop();
    ks.reduce((o, k) => (o[k] ??= {}), obj)[ult] = valor;
  };
  function aviso(texto) {
    const el = document.getElementById("aviso");
    el.textContent = texto;
    el.classList.add("ver");
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => el.classList.remove("ver"), 2200);
  }
  function guardarLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin espacio o bloqueado: no pasa nada */ }
  }
  function cargarLocal() {
    try { const s = localStorage.getItem(CLAVE); return s ? { ...vacio(), ...JSON.parse(s) } : null; } catch (e) { return null; }
  }
  const nombreArchivo = () =>
    (datos.nombre || "pagina").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pagina";
  function descargar(nombre, contenido, tipo) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- vista previa ----------
  function actualizar() {
    clearTimeout(actualizar.t);
    actualizar.t = setTimeout(() => {
      const y = preview.contentWindow?.scrollY || 0;
      preview.onload = () => preview.contentWindow.scrollTo(0, y);
      preview.srcdoc = generarHTML(datos);
      guardarLocal();
    }, 250);
  }

  // ---------- campos simples ----------
  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.name) {
      asignar(datos, el.name, el.value);
      if (el.name === "color") marcarColor();
      actualizar();
    }
  });

  // ---------- temas y colores ----------
  const temas = document.getElementById("temas");
  Object.entries(TEMAS).forEach(([clave, t]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.tema = clave;
    b.textContent = t.nombre;
    b.onclick = () => { datos.tema = clave; marcarTema(); actualizar(); };
    temas.appendChild(b);
  });
  const marcarTema = () => temas.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tema === datos.tema));

  const colores = document.getElementById("colores");
  const selector = colores.querySelector("input[type=color]");
  COLORES.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "muestra";
    b.style.background = c;
    b.title = c;
    b.onclick = () => { datos.color = c; selector.value = c; marcarColor(); actualizar(); };
    colores.insertBefore(b, selector);
  });
  const marcarColor = () => colores.querySelectorAll(".muestra").forEach((b) => (b.style.boxShadow = b.title === datos.color ? "0 0 0 3px #0f172a" : ""));

  // ---------- horario ----------
  const contHorario = document.getElementById("horario");
  [1, 2, 3, 4, 5, 6, 0].forEach((i) => {
    const fila = document.createElement("div");
    fila.className = "dia";
    fila.innerHTML = `<span>${DIAS[i]}</span><input type="checkbox" aria-label="Abre el ${DIAS[i]}"><input type="time" aria-label="Abre"><input type="time" aria-label="Cierra">`;
    const [chk, abre, cierra] = fila.querySelectorAll("input");
    const sync = () => {
      datos.horario[i] = { abierto: chk.checked, abre: abre.value, cierra: cierra.value };
      abre.disabled = cierra.disabled = !chk.checked;
      actualizar();
    };
    [chk, abre, cierra].forEach((el) => el.addEventListener("input", (e) => { e.stopPropagation(); sync(); }));
    fila.cargar = () => {
      const h = datos.horario[i] || {};
      chk.checked = !!h.abierto; abre.value = h.abre || "09:00"; cierra.value = h.cierra || "18:00";
      abre.disabled = cierra.disabled = !chk.checked;
    };
    contHorario.appendChild(fila);
  });

  // ---------- listas (servicios, razones, reseñas) ----------
  const LISTAS = {
    servicios: { nuevo: () => ({ emoji: "", nombre: "", descripcion: "", precio: "" }),
      campos: [["emoji", "Ícono", "🍞"], ["nombre", "Nombre", "Ej. Pan dulce"], ["descripcion", "Descripción", "Opcional", true], ["precio", "Precio", "Opcional, ej. Desde $50"]] },
    razones: { nuevo: () => ({ emoji: "", titulo: "", texto: "" }),
      campos: [["emoji", "Ícono", "⭐"], ["titulo", "Título", "Ej. Atención personalizada"], ["texto", "Texto", "Una línea", true]] },
    resenas: { nuevo: () => ({ nombre: "", texto: "" }),
      campos: [["nombre", "Nombre", "Ej. Laura G."], ["texto", "Lo que dijo", "Copia la reseña tal cual", true]] },
  };
  function pintarLista(tipo) {
    const cont = document.getElementById(`lista-${tipo}`);
    cont.innerHTML = "";
    datos[tipo].forEach((item, idx) => {
      const caja = document.createElement("div");
      caja.className = "item";
      const quitar = document.createElement("button");
      quitar.type = "button"; quitar.className = "quitar"; quitar.textContent = "✕"; quitar.title = "Quitar";
      quitar.onclick = () => { datos[tipo].splice(idx, 1); pintarLista(tipo); actualizar(); };
      caja.appendChild(quitar);
      const campos = LISTAS[tipo].campos;
      const crear = ([k, etiqueta, ph, largo]) => {
        const lab = document.createElement("label");
        lab.textContent = etiqueta;
        const inp = document.createElement(largo ? "textarea" : "input");
        inp.placeholder = ph; inp.value = item[k] || "";
        if (largo) inp.style.minHeight = "50px";
        inp.addEventListener("input", (e) => { e.stopPropagation(); item[k] = inp.value; actualizar(); });
        lab.appendChild(inp);
        return lab;
      };
      if (campos[0][0] === "emoji") {
        const f = document.createElement("div");
        f.className = "fila3";
        f.append(crear(campos[0]), crear(campos[1]));
        caja.appendChild(f);
        campos.slice(2).forEach((c) => caja.appendChild(crear(c)));
      } else campos.forEach((c) => caja.appendChild(crear(c)));
      cont.appendChild(caja);
    });
  }
  document.querySelectorAll("[data-agregar]").forEach((b) =>
    b.addEventListener("click", () => { const t = b.dataset.agregar; datos[t].push(LISTAS[t].nuevo()); pintarLista(t); actualizar(); })
  );

  // ---------- fotos (se reducen a máx. 1400 px y se guardan dentro de la página) ----------
  function reducir(archivo, max) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(archivo.type === "image/png" && max <= 400 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = mal;
      img.src = URL.createObjectURL(archivo);
    });
  }
  document.querySelectorAll("[data-foto]").forEach((inp) =>
    inp.addEventListener("change", async (e) => {
      e.stopPropagation();
      const tipo = inp.dataset.foto;
      try {
        const urls = await Promise.all([...inp.files].map((f) => reducir(f, tipo === "logo" ? 400 : 1400)));
        if (tipo === "galeria") datos.fotos.galeria.push(...urls);
        else datos.fotos[tipo] = urls[0] || "";
        pintarFotos(); actualizar();
      } catch (err) { aviso("No se pudo leer esa imagen"); }
      inp.value = "";
    })
  );
  function pintarFotos() {
    ["logo", "portada", "galeria"].forEach((tipo) => {
      const cont = document.getElementById(`foto-${tipo}`);
      cont.innerHTML = "";
      const lista = tipo === "galeria" ? datos.fotos.galeria : datos.fotos[tipo] ? [datos.fotos[tipo]] : [];
      lista.forEach((src, idx) => {
        const m = document.createElement("div");
        m.className = "miniatura";
        m.innerHTML = `<img alt=""><button type="button" title="Quitar">✕</button>`;
        m.querySelector("img").src = src;
        m.querySelector("button").onclick = () => {
          if (tipo === "galeria") datos.fotos.galeria.splice(idx, 1); else datos.fotos[tipo] = "";
          pintarFotos(); actualizar();
        };
        cont.appendChild(m);
      });
    });
  }

  // ---------- cargar datos en el formulario ----------
  function pintarTodo() {
    form.querySelectorAll("[name]").forEach((el) => (el.value = obtener(datos, el.name) ?? ""));
    if (!/^#[0-9a-f]{6}$/i.test(selector.value)) selector.value = "#4f46e5";
    contHorario.querySelectorAll(".dia").forEach((f) => f.cargar());
    Object.keys(LISTAS).forEach(pintarLista);
    marcarTema(); marcarColor(); pintarFotos(); actualizar();
  }

  // ---------- botones de arriba ----------
  document.getElementById("btn-ejemplo").onclick = () => {
    if (confirm("¿Reemplazar lo que tienes por el ejemplo de la panadería?")) { datos = ejemplo(); pintarTodo(); }
  };
  document.getElementById("btn-nuevo").onclick = () => {
    if (confirm("¿Empezar una página nueva? Guarda los datos primero si los vas a necesitar.")) { datos = vacio(); pintarTodo(); }
  };
  document.getElementById("btn-guardar").onclick = () => {
    descargar(`${nombreArchivo()}.json`, JSON.stringify(datos, null, 2), "application/json");
    aviso("Datos guardados. Ábrelos después con «Abrir datos» para hacer cambios.");
  };
  document.getElementById("abrir").addEventListener("change", async (e) => {
    e.stopPropagation();
    const f = e.target.files[0];
    if (!f) return;
    try { datos = { ...vacio(), ...JSON.parse(await f.text()) }; pintarTodo(); aviso("Datos cargados"); }
    catch (err) { aviso("Ese archivo no es de datos del generador"); }
    e.target.value = "";
  });
  document.getElementById("btn-descargar").onclick = () => {
    if (!datos.nombre.trim()) { aviso("Ponle nombre al negocio primero"); return; }
    descargar("index.html", generarHTML(datos), "text/html");
    aviso("Página descargada (index.html). Revisa el README para publicarla.");
  };

  const dlg = document.getElementById("dlg-lista");
  document.getElementById("texto-lista").textContent = window.LISTA_CLIENTE;
  document.getElementById("btn-lista").onclick = () => dlg.showModal();
  document.getElementById("copiar-lista").onclick = async () => {
    try { await navigator.clipboard.writeText(window.LISTA_CLIENTE); aviso("Lista copiada ✔"); }
    catch (err) { aviso("Selecciona el texto y cópialo a mano"); }
  };

  document.querySelectorAll("[data-vista]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-vista]").forEach((o) => o.setAttribute("aria-pressed", o === b));
      preview.classList.toggle("celular", b.dataset.vista === "celular");
    })
  );

  pintarTodo();
})();
