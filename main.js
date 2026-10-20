(function () {
  const cfg = window.SITE_CONFIG;

  // Datos del negocio
  document.querySelectorAll("[data-marca]").forEach((el) => (el.textContent = cfg.marca));
  document.title = document.title.replace("Vitrina", cfg.marca);
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.href = `mailto:${cfg.email}`;
    el.textContent = cfg.email;
  });
  if (cfg.whatsapp) {
    document.querySelectorAll("[data-whatsapp-wrap]").forEach((el) => (el.hidden = false));
    document.querySelectorAll("[data-whatsapp]").forEach((el) => {
      el.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent("Hola, me interesa una página web para mi negocio.")}`;
      el.target = "_blank";
      el.rel = "noopener";
    });
  }
  document.getElementById("year").textContent = new Date().getFullYear();

  // Formulario de contacto: se guarda en la hoja de Google, o abre el correo si aún no está configurada
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));

    if (!cfg.formularioUrl) {
      const cuerpo = `Nombre: ${datos.nombre}\nNegocio: ${datos.negocio}\nTeléfono: ${datos.telefono}\nEmail: ${datos.email}\n\n${datos.mensaje}`;
      window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent("Quiero mi página web")}&body=${encodeURIComponent(cuerpo)}`;
      return;
    }

    const boton = form.querySelector("button");
    boton.disabled = true;
    status.textContent = "Enviando…";
    try {
      // Apps Script no permite leer la respuesta desde otro dominio (no-cors), así que si no hay error de red lo damos por enviado
      await fetch(cfg.formularioUrl, { method: "POST", mode: "no-cors", body: new URLSearchParams(datos) });
      form.reset();
      status.textContent = "¡Listo! Te contactaremos muy pronto. 🙌";
    } catch (err) {
      status.textContent = `No se pudo enviar. Escríbenos a ${cfg.email}`;
    } finally {
      boton.disabled = false;
    }
  });
})();

// Animaciones al hacer scroll y barra de navegación que cambia al bajar
(function () {
  const reveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
      { threshold: 0.12 }
    );
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add("in"));
  }

  const nav = document.querySelector("[data-nav]");
  const update = () => nav.classList.toggle("solid", window.scrollY > 40);
  update();
  window.addEventListener("scroll", update, { passive: true });
})();
