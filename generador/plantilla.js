// Arma el HTML completo de la página de un cliente a partir de sus datos.
// El resultado es un solo archivo (index.html) con todo incluido: estilos, fotos y código.
(function () {
  const TEMAS = {
    moderno: {
      nombre: "Moderno (claro)",
      fuentes: "family=Inter:wght@400;500;600;700;800",
      titulos: "Inter, system-ui, sans-serif",
      texto: "Inter, system-ui, sans-serif",
      fondo: "#ffffff", fondo2: "#f5f7fb", tinta: "#0f172a", suave: "#5b6475", borde: "#e3e7ef", tarjeta: "#ffffff",
      radio: "18px", mayus: "none", pesoTitulo: 800,
    },
    elegante: {
      nombre: "Elegante (crema)",
      fuentes: "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600",
      titulos: "'Cormorant Garamond', Georgia, serif",
      texto: "Inter, system-ui, sans-serif",
      fondo: "#fbf6f1", fondo2: "#fffdfb", tinta: "#3b2a2d", suave: "#7d6a6c", borde: "#ead9d2", tarjeta: "#fffdfb",
      radio: "24px", mayus: "none", pesoTitulo: 500,
    },
    fuerte: {
      nombre: "Fuerte (oscuro)",
      fuentes: "family=Oswald:wght@500;700&family=Inter:wght@400;500;600;700",
      titulos: "Oswald, Impact, sans-serif",
      texto: "Inter, system-ui, sans-serif",
      fondo: "#0d1014", fondo2: "#161b21", tinta: "#e9eef3", suave: "#8d99a6", borde: "#232b34", tarjeta: "#161b21",
      radio: "10px", mayus: "uppercase", pesoTitulo: 700,
    },
  };

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lleno = (s) => String(s ?? "").trim() !== "";
  const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");

  // Solo deja pasar enlaces http(s); a "@usuario" lo convierte en enlace a la red social
  function enlace(valor, base) {
    const v = String(valor ?? "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    if (base) return base + v.replace(/^@/, "");
    return "";
  }

  // Elige texto blanco o negro según qué tan claro sea el color
  function textoSobre(hex) {
    const n = parseInt(String(hex).replace("#", ""), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111111" : "#ffffff";
  }

  const horaTexto = (h) => {
    if (!h) return "";
    const [hh, mm] = h.split(":").map(Number);
    const sufijo = hh < 12 || hh === 24 ? "am" : "pm";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${sufijo}`;
  };
  const horaNum = (h) => {
    const [hh, mm] = String(h || "0:0").split(":").map(Number);
    return hh + mm / 60;
  };

  // Agrupa días seguidos con el mismo horario: "Lunes a viernes · 9:00 am – 6:00 pm"
  function filasHorario(horario) {
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const clave = (d) => (horario[d]?.abierto ? `${horario[d].abre}-${horario[d].cierra}` : "cerrado");
    const grupos = [];
    orden.forEach((d) => {
      const ult = grupos[grupos.length - 1];
      if (ult && ult.clave === clave(d)) ult.dias.push(d);
      else grupos.push({ clave: clave(d), dias: [d] });
    });
    return grupos.map((g) => {
      const nombre = g.dias.length === 1 ? DIAS[g.dias[0]] : `${DIAS[g.dias[0]]} a ${DIAS[g.dias[g.dias.length - 1]].toLowerCase()}`;
      const h = horario[g.dias[0]];
      const valor = h?.abierto ? `${horaTexto(h.abre)} – ${horaTexto(h.cierra)}` : "Cerrado";
      return { nombre, valor, dias: g.dias.join(" ") };
    });
  }

  function generarHTML(d) {
    const t = TEMAS[d.tema] || TEMAS.moderno;
    const color = /^#[0-9a-f]{6}$/i.test(d.color || "") ? d.color : "#4f46e5";
    const sobreColor = textoSobre(color);
    const wa = soloDigitos(d.whatsapp);
    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(d.mensajeWhatsapp || `Hola, vi su página y quiero información.`)}` : "";
    const tel = soloDigitos(d.telefono);
    const mapsLink = enlace(d.mapsLink) || (lleno(d.direccion) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.direccion)}` : "");
    const mapaEmbed = lleno(d.direccion) ? `https://www.google.com/maps?q=${encodeURIComponent(d.direccion)}&output=embed` : "";
    const servicios = (d.servicios || []).filter((s) => lleno(s.nombre));
    const razones = (d.razones || []).filter((r) => lleno(r.titulo));
    const resenas = (d.resenas || []).filter((r) => lleno(r.texto));
    const galeria = (d.fotos?.galeria || []).filter(Boolean);
    const horario = d.horario || [];
    const hayHorario = horario.some((h) => h?.abierto);
    const redes = [
      ["Facebook", enlace(d.redes?.facebook, "https://facebook.com/")],
      ["Instagram", enlace(d.redes?.instagram, "https://instagram.com/")],
      ["TikTok", enlace(d.redes?.tiktok, "https://tiktok.com/@")],
    ].filter(([, url]) => url);
    const horarioJSON = JSON.stringify(
      Object.fromEntries(
        horario
          .map((h, i) => [i, h])
          .filter(([, h]) => h?.abierto)
          .map(([i, h]) => {
            const a = horaNum(h.abre);
            let c = horaNum(h.cierra);
            if (c <= a) c += 24; // cierra después de medianoche
            return [i, [a, c]];
          })
      )
    );
    const botonWA = (texto, clase = "btn") => (waLink ? `<a class="${clase}" href="${esc(waLink)}" target="_blank" rel="noopener">${texto}</a>` : "");
    const portada = d.fotos?.portada;
    const titulo = lleno(d.titulo) ? d.titulo : d.nombre;

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.nombre)}${lleno(d.giro) ? " · " + esc(d.giro) : ""}</title>
<meta name="description" content="${esc(d.descripcion)}">
<meta property="og:title" content="${esc(d.nombre)}">
<meta property="og:description" content="${esc(d.descripcion)}">
<meta name="theme-color" content="${color}">
${d.fotos?.logo ? `<link rel="icon" href="${d.fotos.logo}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?${t.fuentes}&display=swap" rel="stylesheet">
<style>
:root{--color:${color};--sobre:${sobreColor};--fondo:${t.fondo};--fondo2:${t.fondo2};--tinta:${t.tinta};--suave:${t.suave};--borde:${t.borde};--tarjeta:${t.tarjeta};--radio:${t.radio}}
*{box-sizing:border-box}html{scroll-behavior:smooth;overflow-x:clip}
body{margin:0;font-family:${t.texto};color:var(--tinta);background:var(--fondo);line-height:1.6}
a{color:inherit}img{max-width:100%;display:block}
.wrap{width:min(1100px,100% - 32px);margin-inline:auto}
h1,h2,h3{font-family:${t.titulos};font-weight:${t.pesoTitulo};text-transform:${t.mayus};line-height:1.08;margin:0 0 .45em}
h2{font-size:clamp(2rem,5vw,3rem)}h3{font-size:1.25rem}
.kicker{display:inline-block;font-weight:700;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:var(--color);margin-bottom:12px}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--color);color:var(--sobre);font-weight:700;text-decoration:none;padding:14px 24px;border-radius:999px;border:0;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.18)}
.btn.out{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}
section{padding:90px 0}.alt{background:var(--fondo2)}
.centro{text-align:center}.sub{color:var(--suave);max-width:56ch;margin:0 auto 40px}
[data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .7s,transform .7s}[data-reveal].in{opacity:1;transform:none}
.nav{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--fondo) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--borde)}
.nav .wrap{height:68px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.marca{display:flex;align-items:center;gap:10px;font-family:${t.titulos};font-weight:${t.pesoTitulo};text-transform:${t.mayus};font-size:1.35rem;text-decoration:none}
.marca img{width:40px;height:40px;object-fit:cover;border-radius:10px}
.nav .btn{padding:10px 18px;font-size:.92rem}
.hero{position:relative;padding:110px 0;overflow:hidden;${portada ? `background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.35)),url(${portada}) center/cover;color:#fff;` : `background:radial-gradient(circle at 85% 20%,color-mix(in srgb,var(--color) 28%,transparent),transparent 45%),radial-gradient(circle at 10% 90%,color-mix(in srgb,var(--color) 14%,transparent),transparent 40%),var(--fondo);`}}
.hero h1{font-size:clamp(2.6rem,7.5vw,5rem);max-width:15ch}
.hero p{font-size:1.18rem;max-width:46ch;margin:0 0 30px;${portada ? "color:rgba(255,255,255,.88)" : "color:var(--suave)"}}
.ctas{display:flex;flex-wrap:wrap;gap:12px}
.estado{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:.85rem;padding:6px 14px;border-radius:999px;background:color-mix(in srgb,currentColor 10%,transparent);margin-bottom:18px}
.estado::before{content:"";width:9px;height:9px;border-radius:50%;background:#9aa3ad}
.estado.abierto::before{background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.25)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:var(--tarjeta);border:1px solid var(--borde);border-radius:var(--radio);padding:26px;transition:transform .2s}
.card:hover{transform:translateY(-4px)}
.card .ico{width:54px;height:54px;border-radius:14px;display:grid;place-items:center;font-size:1.6rem;background:color-mix(in srgb,var(--color) 14%,transparent);margin-bottom:14px}
.card p{color:var(--suave);margin:0}
.card .precio{display:inline-block;margin-top:14px;font-weight:800;color:var(--color)}
.galeria{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.galeria img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--radio)}
.resena{background:var(--tarjeta);border:1px solid var(--borde);border-radius:var(--radio);padding:26px}
.resena .est{color:#f5a623;letter-spacing:2px}.resena p{margin:10px 0 14px}.resena b{font-size:.95rem}
.visita{display:grid;grid-template-columns:1fr 1.2fr;gap:28px;align-items:stretch}
.caja{background:var(--tarjeta);border:1px solid var(--borde);border-radius:var(--radio);padding:32px}
table{width:100%;border-collapse:collapse;margin:8px 0 22px}td{padding:10px 0;border-bottom:1px solid var(--borde)}td:last-child{text-align:right;font-weight:600}
tr.hoy td{color:var(--color);font-weight:800}
.mapa{border:0;width:100%;height:100%;min-height:340px;border-radius:var(--radio);background:var(--fondo2)}
.datos{list-style:none;padding:0;margin:0 0 22px}.datos li{padding:6px 0}
.final{background:var(--color);color:var(--sobre);text-align:center}
.final .btn{background:var(--sobre);color:var(--color)}
footer{padding:34px 0;color:var(--suave);font-size:.9rem}footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}footer nav{display:flex;gap:18px}
.wa{position:fixed;right:18px;bottom:18px;z-index:40;width:60px;height:60px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 10px 28px rgba(37,211,102,.45)}
.wa svg{width:32px;height:32px;fill:#fff}
@media(max-width:820px){.grid,.galeria,.visita{grid-template-columns:1fr}.galeria{grid-template-columns:1fr 1fr}section{padding:70px 0}.hero{padding:80px 0}.nav .btn{display:none}}
</style>
</head>
<body>
<header class="nav"><div class="wrap">
<a class="marca" href="#">${d.fotos?.logo ? `<img src="${d.fotos.logo}" alt="">` : ""}${esc(d.nombre)}</a>
${botonWA("💬 Escríbenos")}
</div></header>

<section class="hero"><div class="wrap" data-reveal>
${hayHorario ? `<span class="estado" data-horario='${horarioJSON}'>Horario</span><br>` : ""}
${lleno(d.giro) ? `<span class="kicker"${portada ? ' style="color:#fff;opacity:.85"' : ""}>${esc(d.giro)}</span>` : ""}
<h1>${esc(titulo)}</h1>
${lleno(d.descripcion) ? `<p>${esc(d.descripcion)}</p>` : ""}
<div class="ctas">${botonWA("💬 Escríbenos por WhatsApp")}${servicios.length ? `<a class="btn out" href="#servicios">Ver ${esc(d.tituloServicios || "servicios").toLowerCase()}</a>` : ""}</div>
</div></section>

${servicios.length ? `<section id="servicios"><div class="wrap">
<div class="centro" data-reveal><h2>${esc(d.tituloServicios || "Servicios")}</h2></div>
<div class="grid">${servicios.map((s) => `<div class="card" data-reveal>${lleno(s.emoji) ? `<div class="ico">${esc(s.emoji)}</div>` : ""}<h3>${esc(s.nombre)}</h3>${lleno(s.descripcion) ? `<p>${esc(s.descripcion)}</p>` : ""}${lleno(s.precio) ? `<span class="precio">${esc(s.precio)}</span>` : ""}</div>`).join("")}</div>
</div></section>` : ""}

${razones.length ? `<section class="alt"><div class="wrap">
<div class="centro" data-reveal><h2>¿Por qué ${esc(d.nombre)}?</h2></div>
<div class="grid">${razones.map((r) => `<div class="card" data-reveal>${lleno(r.emoji) ? `<div class="ico">${esc(r.emoji)}</div>` : ""}<h3>${esc(r.titulo)}</h3>${lleno(r.texto) ? `<p>${esc(r.texto)}</p>` : ""}</div>`).join("")}</div>
</div></section>` : ""}

${galeria.length ? `<section><div class="wrap">
<div class="centro" data-reveal><h2>Galería</h2></div>
<div class="galeria">${galeria.map((src) => `<img src="${src}" alt="Foto de ${esc(d.nombre)}" loading="lazy" data-reveal>`).join("")}</div>
</div></section>` : ""}

${resenas.length ? `<section class="alt"><div class="wrap">
<div class="centro" data-reveal><h2>Lo que dicen nuestros clientes</h2></div>
<div class="grid">${resenas.map((r) => `<div class="resena" data-reveal><span class="est">★★★★★</span><p>“${esc(r.texto)}”</p><b>${esc(r.nombre)}</b></div>`).join("")}</div>
</div></section>` : ""}

${hayHorario || lleno(d.direccion) ? `<section id="visitanos"><div class="wrap">
<div class="centro" data-reveal><h2>Visítanos</h2></div>
<div class="visita">
<div class="caja" data-reveal>
${hayHorario ? `<span class="estado" data-horario='${horarioJSON}'>Horario</span>
<table>${filasHorario(horario).map((f) => `<tr data-dia="${f.dias}"><td>${f.nombre}</td><td>${f.valor}</td></tr>`).join("")}</table>` : ""}
<ul class="datos">
${lleno(d.direccion) ? `<li>📍 ${esc(d.direccion)}</li>` : ""}
${tel ? `<li>📞 <a href="tel:${tel}">${esc(d.telefono)}</a></li>` : ""}
${lleno(d.email) ? `<li>✉️ <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></li>` : ""}
</ul>
${mapsLink ? `<a class="btn" href="${esc(mapsLink)}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
</div>
${mapaEmbed ? `<iframe class="mapa" data-reveal src="${esc(mapaEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>` : ""}
</div>
</div></section>` : ""}

${waLink ? `<section class="final"><div class="wrap" data-reveal>
<h2>${esc(d.textoFinal || "¿Te ayudamos?")}</h2>
<p style="font-size:1.1rem;margin:0 0 26px">Escríbenos por WhatsApp y te respondemos lo antes posible.</p>
${botonWA("💬 Escríbenos por WhatsApp")}
</div></section>` : ""}

<footer><div class="wrap">
<span>© ${new Date().getFullYear()} ${esc(d.nombre)}</span>
${redes.length ? `<nav>${redes.map(([n, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${n}</a>`).join("")}</nav>` : ""}
</div></footer>
${waLink ? `<a class="wa" href="${esc(waLink)}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg></a>` : ""}
<script>
(function(){
var r=document.querySelectorAll("[data-reveal]");
if("IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.1});r.forEach(function(e){io.observe(e)})}else r.forEach(function(e){e.classList.add("in")});
document.querySelectorAll("[data-horario]").forEach(function(el){var h=JSON.parse(el.dataset.horario),n=new Date(),d=n.getDay(),x=n.getHours()+n.getMinutes()/60,hoy=h[d],ay=h[(d+6)%7];
var ab=(hoy&&x>=hoy[0]&&x<hoy[1])||(ay&&ay[1]>24&&x<ay[1]-24);el.classList.add(ab?"abierto":"cerrado");el.textContent=ab?"Abierto ahora":"Cerrado ahora";
document.querySelectorAll('[data-dia~="'+d+'"]').forEach(function(f){f.classList.add("hoy")})});
})();
</script>
</body>
</html>`;
  }

  window.Plantilla = { generarHTML, TEMAS, DIAS };
})();
