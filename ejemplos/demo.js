// Barra de "página de ejemplo" y botones de contacto de demostración (comparten las 3 páginas de ejemplo)
(function () {
  const marca = window.SITE_CONFIG?.marca || "nosotros";
  const barra = document.createElement("div");
  barra.style.cssText =
    "position:sticky;top:0;z-index:50;background:#0f172a;color:#fff;font:500 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center";
  barra.innerHTML = `Página de ejemplo · Así podría verse la de tu negocio. <a href="../index.html#contacto" style="color:#a5b4fc;font-weight:700">Cotiza la tuya con <span></span> →</a>`;
  barra.querySelector("span").textContent = marca;
  document.body.prepend(barra);

  document.querySelectorAll("[data-demo]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`En la página de tu negocio, este botón ${el.dataset.demo}.`);
    })
  );
})();
