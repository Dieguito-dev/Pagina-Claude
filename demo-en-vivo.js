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
      tema: "fuerte", color: "#e3262f", giro: "Comida casera · Pedidos a domicilio",
      titulo: (n) => `${n}: sabor que se te antoja`,
      descripcion: "La comida que te gusta, hecha al momento. Ven a visitarnos o pide a domicilio por WhatsApp.",
      tituloServicios: "Menú",
      servicios: [["🌮", "Tacos", "Pastor, suadero y campechanos", "Desde $22"], ["🍲", "Comida del día", "Sopa, guisado y agua", "$95"], ["🥤", "Aguas frescas", "Horchata, jamaica y de temporada", "$35"]],
    },
    belleza: {
      tema: "elegante", color: "#b45f68", giro: "Estética & Spa",
      titulo: () => "Tu momento para sentirte increíble",
      descripcion: "Corte, color, uñas y faciales en un espacio tranquilo, con un equipo que de verdad te escucha.",
      tituloServicios: "Servicios",
      servicios: [["✂️", "Corte y peinado", "Lavado, corte y secado", "Desde $250"], ["💅", "Uñas en gel", "Duran hasta 3 semanas", "Desde $280"], ["🌸", "Facial", "Limpieza profunda e hidratación", "$550"]],
    },
    taller: {
      tema: "fuerte", color: "#ff6a13", giro: "Taller mecánico",
      titulo: () => "Tu auto en buenas manos",
      descripcion: "Diagnóstico, frenos, afinación y más. Te decimos cuánto cuesta antes de empezar.",
      tituloServicios: "Servicios",
      servicios: [["🔧", "Afinación", "Bujías, filtros y aceite", "Desde $1,200"], ["🛑", "Frenos", "Balatas y discos", "Desde $900"], ["💻", "Diagnóstico", "Escáner por computadora", "$350"]],
    },
    cafe: {
      tema: "elegante", color: "#8a5a3b", giro: "Café & Panadería",
      titulo: () => "Café de especialidad y pan recién horneado",
      descripcion: "El lugar para tu café de la mañana, una rebanada de pastel o una tarde con amigos.",
      tituloServicios: "Menú",
      servicios: [["☕", "Café de olla", "Con canela y piloncillo", "$40"], ["🥐", "Pan dulce", "Recién salido del horno", "Desde $15"], ["🍰", "Pasteles", "Por rebanada o por encargo", "Desde $60"]],
    },
    tienda: {
      tema: "moderno", color: "#16a34a", giro: "Tienda · Envíos a domicilio",
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
      whatsapp: "5210000000000",
      direccion: "",
      fotos: {},
    });
    // Sin animación de entrada: se re-dibuja con cada letra y parpadearía
    iframe.srcdoc = html.replace("</head>", "<style>[data-reveal]{opacity:1!important;transform:none!important;transition:none!important}</style></head>");
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
