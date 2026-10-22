// "Un día en el mundo de tu bebé": la tienda se recorre por los momentos del día. Cada momento
// es un estante con los productos de sus categorías; todo se ajusta a la edad que elija la persona.
// Al bajar, el cielo de la página cambia de color y el reloj de arriba marca la hora.
(function () {
  const S = window.Tienda;
  const $ = (s, el = document) => el.querySelector(s);

  // Los momentos del día. cats: categorías de productos.js que van en cada uno.
  const MOMENTOS = [
    {
      id: "comer", hora: "7:00 a.m.", icono: "☀️", titulo: "Hora de comer", color: "#ffe9c9",
      frase: "Teteros, lactancia y su primera papilla sentado a la mesa.",
      cats: ["alimentacion", "lactancia", "comedores"],
    },
    {
      id: "jugar", hora: "10:00 a.m.", icono: "🧸", titulo: "Hora de jugar", color: "#d9f1f7",
      frase: "Gimnasios, juguetes y sus primeros pasos.",
      cats: ["estimulacion", "juguetes", "caminadores", "montables"],
    },
    {
      id: "paseo", hora: "3:00 p.m.", icono: "🌳", titulo: "Hora del paseo", color: "#cfeee0",
      frase: "Coches, sillas para el carro y todo lo que va en la pañalera.",
      cats: ["coches", "coche-mellicero", "sillas-carro", "paseador", "panalera", "triciclos", "bicicletas", "carros-electricos"],
    },
    {
      id: "bano", hora: "6:00 p.m.", icono: "🛁", titulo: "Hora del baño", color: "#fbd9cb",
      frase: "Bañeras, toallas y cuidado para su piel.",
      cats: ["baneras", "bano", "cuidado-personal"],
    },
    {
      id: "dormir", hora: "8:00 p.m.", icono: "🌙", titulo: "Hora de dormir", color: "#3a355f", noche: true,
      frase: "Corrales, cunas y mecedoras para que sueñe tranquilo.",
      cats: ["corrales", "mecedoras"],
    },
  ];
  const POR_ESTANTE = 12;

  const EDADES = [
    { id: "", txt: "Ver todo" },
    { id: "nace", txt: "Aún no nace", rango: [-9, 1] },
    { id: "0-6", txt: "0 a 6 meses", rango: [0, 6] },
    { id: "6-12", txt: "6 a 12 meses", rango: [6, 12] },
    { id: "1-3", txt: "1 a 3 años", rango: [12, 36] },
    { id: "3+", txt: "Más de 3 años", rango: [36, 96] },
  ];
  const CLAVE = "tienda-bebes-edad";
  let edad = "";
  try {
    edad = localStorage.getItem(CLAVE) || "";
  } catch {}
  if (!EDADES.some((e) => e.id === edad)) edad = "";

  const sirve = (p) => {
    const r = EDADES.find((e) => e.id === edad)?.rango;
    return !r || !p.edad || (p.edad[0] <= r[1] && p.edad[1] >= r[0]);
  };
  const ORDEN = { disponible: 0, consultar: 1, agotado: 2 };
  const productosDe = (m) =>
    S.productos
      .filter((p) => m.cats.includes(p.categoria) && sirve(p))
      .sort((a, b) => ORDEN[S.estadoDe(a)] - ORDEN[S.estadoDe(b)] || !S.fotosDe(a).length - !S.fotosDe(b).length || S.deLaPromo(b) - S.deLaPromo(a));

  // Móvil de cuna para la hora de dormir.
  const MOVIL = `<svg class="movil" viewBox="0 0 300 150" aria-hidden="true">
    <path class="movil-gancho" d="M150 0v14M40 32Q150 4 260 32"/>
    <g class="colgante c1"><path class="hilo" d="M62 25v44"/><path class="luna-m" d="M70 66a17 17 0 1 0 6 30 13 13 0 1 1-6-30Z"/></g>
    <g class="colgante c2"><path class="hilo" d="M116 16v68"/><path class="estrella" d="m116 82 5.3 10.8 11.9 1.7-8.6 8.4 2 11.8-10.6-5.6-10.6 5.6 2-11.8-8.6-8.4 11.9-1.7Z"/></g>
    <g class="colgante c3"><path class="hilo" d="M184 16v58"/><path class="nube" d="M168 96a10 10 0 0 1 2-19.8 13 13 0 0 1 25-2.2 10 10 0 0 1 4 20 1 1 0 0 1-1 2h-28a1 1 0 0 1-2 0Z"/></g>
    <g class="colgante c4"><path class="hilo" d="M238 25v40"/><path class="corazon" d="M238 92c-12-8-15-18-10-23 4-4 9-2 10 2 1-4 6-6 10-2 5 5 2 15-10 23Z"/></g>
  </svg>`;

  const contenedor = $("[data-momentos]");
  contenedor.innerHTML = MOMENTOS.map(
    (m) => `<section class="momento momento-${m.id}${m.noche ? " de-noche" : ""}" id="momento-${m.id}" data-momento
      data-color="${m.color}" data-icono="${m.icono}" data-hora="${m.hora} · ${m.titulo}"${m.noche ? " data-noche" : ""}>
      ${m.noche ? MOVIL : ""}
      <header class="momento-cab">
        <p class="momento-hora"><span aria-hidden="true">${m.icono}</span> ${m.hora}</p>
        <h2>${m.titulo}</h2>
        <p>${m.frase}</p>
      </header>
      <div class="estante-marco">
        <button class="estante-flecha ant" type="button" data-correr="-1" aria-label="Anteriores">‹</button>
        <div class="estante" data-estante="${m.id}" tabindex="0" aria-label="Productos para la ${m.titulo.toLowerCase()}"></div>
        <button class="estante-flecha sig" type="button" data-correr="1" aria-label="Siguientes">›</button>
      </div>
      <div class="momento-pie"><button class="btn btn-borde" type="button" data-ver-momento="${m.id}"></button></div>
    </section>`
  ).join("");

  function pintar() {
    const etiqueta = EDADES.find((e) => e.id === edad);
    MOMENTOS.forEach((m) => {
      const lista = productosDe(m);
      const estante = $(`[data-estante="${m.id}"]`);
      estante.innerHTML = lista.length
        ? lista.slice(0, POR_ESTANTE).map(S.tarjetaHTML).join("")
        : `<p class="estante-vacio">Para ${etiqueta.txt.toLowerCase()} no tenemos productos de este momento. <button type="button" data-edad="">Ver todo</button></p>`;
      estante.scrollLeft = 0;
      const boton = $(`[data-ver-momento="${m.id}"]`);
      boton.textContent = `Ver los ${lista.length} productos de la ${m.titulo.toLowerCase()}`;
      boton.hidden = lista.length <= POR_ESTANTE;
    });
    $("[data-edades]").innerHTML = EDADES.map(
      (e) => `<button type="button" data-edad="${e.id}" aria-pressed="${e.id === edad}">${e.txt}</button>`
    ).join("");
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-edad]");
    if (!b) return;
    edad = b.dataset.edad;
    try {
      localStorage.setItem(CLAVE, edad);
    } catch {}
    pintar();
  });

  contenedor.addEventListener("click", (e) => {
    const flecha = e.target.closest("[data-correr]");
    const ver = e.target.closest("[data-ver-momento]");
    if (flecha) {
      const estante = flecha.parentElement.querySelector("[data-estante]");
      estante.scrollBy({ left: Number(flecha.dataset.correr) * estante.clientWidth * 0.8, behavior: "smooth" });
    } else if (ver) {
      const m = MOMENTOS.find((x) => x.id === ver.dataset.verMomento);
      const e = EDADES.find((x) => x.id === edad);
      S.irAMomento(e.rango ? `${m.titulo} · ${e.txt.toLowerCase()}` : m.titulo, m.cats, sirve);
    } else {
      S.clicTarjeta(e);
    }
  });

  // El cielo y el reloj siguen al momento que está en pantalla.
  const reloj = $("[data-reloj]");
  const visibles = new Map();
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((en) => visibles.set(en.target, en.intersectionRatio));
      const [actual] = [...visibles].sort((a, b) => b[1] - a[1])[0] || [];
      if (!actual) return;
      document.body.style.setProperty("--cielo-actual", actual.dataset.color);
      document.body.classList.toggle("es-de-noche", actual.hasAttribute("data-noche"));
      $("[data-reloj-icono]", reloj).textContent = actual.dataset.icono;
      $("[data-reloj-texto]", reloj).textContent = actual.dataset.hora;
    },
    { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9] }
  );
  document.querySelectorAll("[data-momento]").forEach((el) => observador.observe(el));

  pintar();
})();
