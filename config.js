// Datos del negocio que se muestran en la página.
// Cambia estos valores y la página se actualiza sola.
window.SITE_CONFIG = {
  marca: "Presencia Pro",
  whatsapp: "521XXXXXXXXXX", // número con código de país, sin "+" ni espacios
  email: "hola@tudominio.com",
  planes: [
    {
      nombre: "Página de presencia",
      precio: "$X,XXX",
      periodo: "pago único",
      destacado: false,
      incluye: [
        "Página web de una sola sección (landing)",
        "Diseño adaptado a celular",
        "Botón directo a WhatsApp",
        "Mapa, horarios y redes sociales",
        "Entrega en 5 días hábiles",
      ],
    },
    {
      nombre: "Página + Agente IA",
      precio: "$X,XXX",
      periodo: "+ $XXX / mes",
      destacado: true,
      incluye: [
        "Todo lo del plan anterior",
        "Agente de IA que responde a tus clientes 24/7",
        "Entrenado con la info de tu negocio",
        "Te pasa los datos de cada cliente interesado",
        "Ajustes mensuales al agente",
      ],
    },
  ],
};
