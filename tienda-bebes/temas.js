// Diseños de la tienda. El que se usa sale de config.js (tema), salvo que el link traiga
// ?diseno=1, 2, 3 (o "actual"): así se pueden comparar y aparece una barra para cambiar entre ellos.
(function () {
  const TEMAS = {
    actual: {
      nombre: "Actual",
      fuentes: "family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800",
    },
    1: {
      nombre: "Boutique",
      fuentes: "family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800",
      css: "temas/boutique.css",
    },
    2: {
      nombre: "Juguetería",
      fuentes: "family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800",
      css: "temas/jugueteria.css",
    },
    3: {
      nombre: "Tienda ágil",
      fuentes: "family=Figtree:wght@400;500;600;700;800",
      css: "temas/agil.css",
    },
  };

  let elegido = null;
  try {
    elegido = new URLSearchParams(location.search).get("diseno");
  } catch {}
  const revision = elegido in TEMAS;
  const id = revision ? elegido : String(window.TIENDA?.tema ?? "actual");
  const tema = TEMAS[id] || TEMAS.actual;

  document.documentElement.dataset.tema = id in TEMAS ? id : "actual";
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
        .map(([k, t]) => `<a href="?diseno=${k}"${k === id ? ' aria-current="page"' : ""}>${k === "actual" ? t.nombre : `${k} · ${t.nombre}`}</a>`)
        .join("");
    document.body.prepend(barra);
  });
})();
