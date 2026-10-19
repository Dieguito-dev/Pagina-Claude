// Código compartido por las 3 páginas de ejemplo:
// barra de "ejemplo", botones de demostración, animaciones al hacer scroll,
// indicador de "abierto ahora" y pestañas.
(function () {
  const marca = window.SITE_CONFIG?.marca || "nosotros";

  // Barra superior de ejemplo
  const barra = document.createElement("div");
  barra.className = "demo-barra";
  barra.style.cssText =
    "position:relative;z-index:100;background:#0f172a;color:#fff;font:500 13px/1.4 system-ui,sans-serif;padding:9px 16px;text-align:center";
  barra.innerHTML = `Página de ejemplo · Así podría verse la de tu negocio. <a href="../index.html#contacto" style="color:#a5b4fc;font-weight:700">Cotiza la tuya con <span></span> →</a>`;
  barra.querySelector("span").textContent = marca;
  document.body.prepend(barra);

  // En la página real estos botones abren WhatsApp, llaman, etc.
  window.demoAccion = (texto) => alert(`En la página de tu negocio, ${texto}.`);
  window.demoWhatsApp = (mensaje) =>
    alert(`En la página de tu negocio se abriría WhatsApp con este mensaje listo para enviar:\n\n"${mensaje}"`);
  document.querySelectorAll("[data-demo]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      demoAccion(`este botón ${el.dataset.demo}`);
    })
  );

  // Aparecer suavemente al hacer scroll
  const reveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add("in"));
  }

  // "Abierto ahora": data-horario='{"1":[18,24], ...}' (0 = domingo; horas pueden pasar de 24 si cierra de madrugada)
  document.querySelectorAll("[data-horario]").forEach((el) => {
    const horario = JSON.parse(el.dataset.horario);
    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours() + ahora.getMinutes() / 60;
    const hoy = horario[dia];
    const ayer = horario[(dia + 6) % 7];
    const abierto = (hoy && hora >= hoy[0] && hora < hoy[1]) || (ayer && ayer[1] > 24 && hora < ayer[1] - 24);
    el.classList.add(abierto ? "abierto" : "cerrado");
    el.textContent = abierto ? "Abierto ahora" : "Cerrado ahora";
    // Resaltar el día de hoy en la tabla de horarios
    document.querySelectorAll(`[data-dia~="${dia}"]`).forEach((fila) => fila.classList.add("hoy"));
  });

  // Pestañas: botones [data-tab="x"] muestran el panel [data-panel="x"]
  document.querySelectorAll("[data-tabs]").forEach((grupo) => {
    const botones = grupo.querySelectorAll("[data-tab]");
    botones.forEach((b) =>
      b.addEventListener("click", () => {
        botones.forEach((o) => o.setAttribute("aria-selected", o === b));
        grupo.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
      })
    );
  });

  // Barra de navegación que cambia al bajar
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const update = () => nav.classList.toggle("solid", window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }
})();
