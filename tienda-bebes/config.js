// Datos de la tienda. Cambia estos valores y la página (y el asistente) se actualizan solos.
// Los productos están en productos.js.
window.TIENDA = {
  marca: "Baby's World",
  lema: "Tu tienda de confianza para artículos de bebé",
  whatsapp: "573337062951", // número con código de país, sin "+" ni espacios (ej. 573001234567). Vacío = se oculta
  asistente: "Nubi", // nombre del asistente virtual
  tema: "actual", // diseño: "actual", 1 (Boutique), 2 (Juguetería) o 3 (Tienda ágil). Ver temas.js

  // Lo que responde el asistente cuando le preguntan por esto. CONFIRMA que sea verdad antes de publicar.
  envios: "Hacemos envíos a toda Colombia. El costo y el tiempo de entrega dependen de tu ciudad; te los confirmamos por WhatsApp al hacer el pedido.",
  pagos: "Puedes pagar por transferencia, Nequi, Daviplata o contraentrega (según tu ciudad).",
  ubicacion: "Somos tienda virtual. Si quieres ver un producto en persona, escríbenos por WhatsApp y te contamos cómo.",
  horario: "Te atendemos por WhatsApp de lunes a sábado, de 8 a.m. a 6 p.m.",
  cambios: "Todos los productos son nuevos. Si algo llega con un defecto, escríbenos dentro de los primeros 5 días y te ayudamos con el cambio.",

  quienesSomos: "Somos una tienda colombiana de artículos para bebé. Elegimos cada producto pensando en la seguridad y la comodidad de tu bebé, y te acompañamos desde el embarazo hasta sus primeros años.",

  // Carrusel de banners de arriba. enlace: "#catalogo", "producto:<id>", "categoria:<id>" o "whatsapp".
  // fondo: color que rellena los lados cuando el banner no ocupa todo el ancho.
  banners: [
    {
      imagen: "img/banners/bienvenidos.webp",
      texto: "Bienvenidos a Baby's World, tu tienda de confianza para artículos de bebé",
      enlace: "#catalogo",
      fondo: "#fef6f0",
    },
    {
      imagen: "img/banners/combo-paseo-suenos.webp",
      texto: "Combo Premium Paseo y Sueños: coche, cuna corral y bolso pañalero",
      enlace: "producto:combo-premium-paseo-y-suenos",
      fondo: "#fde3e5",
    },
  ],

  redes: {
    facebook: "",
    instagram: "",
    tiktok: "",
  },
};
