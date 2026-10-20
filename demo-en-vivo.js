// Demo del inicio: el visitante escribe el nombre de su negocio, elige su giro
// y ve su página armándose en el celular. Usa el mismo motor que el generador.
(function () {
  const { generarHTML } = window.Plantilla;
  const iframe = document.getElementById("demo-iframe");
  const input = document.getElementById("demo-nombre");
  const chips = document.querySelectorAll("[data-giro]");
  const todosLosDias = Array.from({ length: 7 }, () => ({ abierto: true, abre: "08:00", cierra: "22:00" }));

  const GIROS = {
    restaurante: {
      tema: "fuerte", color: "#e3262f", giro: "Comidas rápidas · Domicilios",
      titulo: (n) => `${n}: sabor que se te antoja`,
      descripcion: "La comida que te gusta, hecha al momento. Ven a visitarnos o pide a domicilio por WhatsApp.",
      tituloServicios: "Menú",
      servicios: [["🍔", "Hamburguesas", "Carne a la parrilla, queso y tocineta", "Desde $15.000"], ["🫓", "Arepas rellenas", "Pollo, carne o mixta", "$12.000"], ["🥤", "Jugos naturales", "Mora, lulo, maracuyá y mango", "$6.000"]],
    },
    belleza: {
      tema: "elegante", color: "#b45f68", giro: "Peluquería & Spa",
      titulo: () => "Tu momento para sentirte increíble",
      descripcion: "Corte, color, uñas y faciales en un espacio tranquilo, con un equipo que de verdad te escucha.",
      tituloServicios: "Servicios",
      servicios: [["✂️", "Corte y cepillado", "Lavado, corte y secado", "Desde $25.000"], ["💅", "Uñas semipermanentes", "Duran hasta 3 semanas", "Desde $45.000"], ["🌸", "Limpieza facial", "Limpieza profunda e hidratación", "$90.000"]],
    },
    taller: {
      tema: "fuerte", color: "#ff6a13", giro: "Taller mecánico",
      titulo: () => "Tu carro en buenas manos",
      descripcion: "Diagnóstico, frenos, sincronización y más. Te decimos cuánto cuesta antes de empezar.",
      tituloServicios: "Servicios",
      servicios: [["🔧", "Sincronización", "Bujías, filtros y aceite", "Desde $180.000"], ["🛑", "Frenos", "Pastillas y discos", "Desde $150.000"], ["💻", "Diagnóstico", "Escáner por computador", "$80.000"]],
    },
    cafe: {
      tema: "elegante", color: "#8a5a3b", giro: "Café & Panadería",
      titulo: () => "Café colombiano y pan recién horneado",
      descripcion: "El lugar para tu tinto de la mañana, un pandebono calientico o una tarde con amigos.",
      tituloServicios: "Menú",
      servicios: [["☕", "Tinto y capuchino", "Café de origen colombiano", "Desde $3.000"], ["🥯", "Pandebono y almojábana", "Recién salidos del horno", "$3.500"], ["🍰", "Tortas", "Por porción o por encargo", "Desde $8.000"]],
    },
    tienda: {
      tema: "moderno", color: "#16a34a", giro: "Tienda · Domicilios",
      titulo: () => "Todo lo que necesitas, cerca de ti",
      descripcion: "Productos de calidad a buen precio. Pide por WhatsApp y te lo llevamos.",
      tituloServicios: "Productos",
      servicios: [["🛒", "Abarrotes", "Lo de todos los días", ""], ["🧴", "Limpieza", "Para casa y oficina", ""], ["🎁", "Regalos", "Detalles para toda ocasión", ""]],
    },
    servicios: {
      tema: "moderno", color: "#0891b2", giro: "Servicios profesionales",
      titulo: () => "Soluciones en las que puedes confiar",
      descripcion: "Atención personalizada, precios claros y años de experiencia. Agenda tu cita hoy.",
      tituloServicios: "Servicios",
      servicios: [["📋", "Asesoría", "Te explicamos todo, sin letras chiquitas", ""], ["🤝", "Atención a domicilio", "Vamos a donde estés", ""], ["⭐", "Garantía", "Si no quedas satisfecho, lo arreglamos", ""]],
    },
  };

  let giro = "restaurante";

  function render() {
    const g = GIROS[giro];
    const nombre = input.value.trim() || "Tu Negocio";
    const html = generarHTML({
      nombre, giro: g.giro, titulo: g.titulo(nombre), descripcion: g.descripcion,
      tema: g.tema, color: g.color, tituloServicios: g.tituloServicios,
      servicios: g.servicios.map(([emoji, n, descripcion, precio]) => ({ emoji, nombre: n, descripcion, precio })),
      horario: todosLosDias,
      whatsapp: "570000000000",
      direccion: "",
      fotos: {},
    });
    // Sin animación de entrada: se re-dibuja con cada letra y parpadearía
    iframe.srcdoc = html.replace("</head>", "<style>[data-reveal]{opacity:1!important;transform:none!important;transition:none!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}</style></head>");
  }

  let t;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 200); });
  chips.forEach((c) =>
    c.addEventListener("click", () => {
      giro = c.dataset.giro;
      chips.forEach((o) => o.setAttribute("aria-pressed", o === c));
      render();
    })
  );
  render();
})();
