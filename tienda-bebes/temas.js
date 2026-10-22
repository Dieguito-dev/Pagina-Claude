// Diseños de la tienda. El que se usa sale de config.js (tema), salvo que el link traiga
// ?diseno=cuento o ?diseno=actual: así se pueden comparar y aparece una barra para cambiar entre ellos.
(function () {
  const TEMAS = {
    cuento: {
      nombre: "Cuento de cuna",
      fuentes: "family=Fraunces:opsz,wght,SOFT,WONK@9..144,500..700,0..100,0..1&family=Nunito:wght@400;600;700;800&family=Caveat:wght@600;700",
      css: "temas/cuento.css",
    },
    actual: {
      nombre: "Anterior",
      fuentes: "family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800",
    },
  };

  let elegido = null;
  try {
    elegido = new URLSearchParams(location.search).get("diseno");
  } catch {}
  const revision = elegido in TEMAS;
  const id = revision ? elegido : String(window.TIENDA?.tema ?? "cuento");
  const tema = TEMAS[id] || TEMAS.cuento;

  document.documentElement.dataset.tema = id in TEMAS ? id : "cuento";
  // document.write deja las hojas de estilo en el <head> antes de pintar, sin parpadeo.
  document.write(
    `<link href="https://fonts.googleapis.com/css2?${tema.fuentes}&display=swap" rel="stylesheet">` +
      (tema.css ? `<link rel="stylesheet" href="${tema.css}">` : "")
  );

  if (!revision) return;
  // Barra para comparar diseños (solo cuando el link trae ?diseno=…).
  document.addEventListener("DOMContentLoaded", () => {
    const barra = document.createElement("nav");
    barra.className = "selector-diseno";
    barra.setAttribute("aria-label", "Comparar diseños");
    barra.innerHTML =
      "<span>Diseño</span>" +
      Object.entries(TEMAS)
        .map(([k, t]) => `<a href="?diseno=${k}"${k === id ? ' aria-current="page"' : ""}>${t.nombre}</a>`)
        .join("");
    document.body.prepend(barra);
  });
})();
