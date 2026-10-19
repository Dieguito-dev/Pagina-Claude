(function () {
  const cfg = window.SITE_CONFIG;
  const waLink = (text) =>
    `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;

  // Datos del negocio
  document.querySelectorAll("[data-marca]").forEach((el) => (el.textContent = cfg.marca));
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = waLink(`Hola, me interesa una página web para mi negocio.`);
    el.target = "_blank";
    el.rel = "noopener";
  });
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.href = `mailto:${cfg.email}`;
    el.textContent = cfg.email;
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  // Planes
  const plans = document.getElementById("plans");
  cfg.planes.forEach((p) => {
    const card = document.createElement("div");
    card.className = "plan" + (p.destacado ? " featured" : "");
    card.innerHTML = `
      ${p.destacado ? '<span class="badge">Recomendado</span>' : ""}
      <h3></h3>
      <div><span class="price"></span> <span class="period"></span></div>
      <ul></ul>
      <a class="btn" target="_blank" rel="noopener">Lo quiero</a>`;
    card.querySelector("h3").textContent = p.nombre;
    card.querySelector(".price").textContent = p.precio;
    card.querySelector(".period").textContent = p.periodo;
    const ul = card.querySelector("ul");
    p.incluye.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });
    card.querySelector("a").href = waLink(`Hola, me interesa el plan "${p.nombre}".`);
    plans.appendChild(card);
  });

  // Chat con el agente
  const chat = document.getElementById("chat");
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const history = [];

  function addBubble(role, text) {
    const div = document.createElement("div");
    div.className = `bubble ${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function openChat() {
    chat.hidden = false;
    if (!log.children.length) {
      addBubble("assistant", `¡Hola! 👋 Soy el asistente de ${cfg.marca}. ¿Tienes un negocio y quieres tu página web? Cuéntame qué vendes y te digo cómo quedaría.`);
    }
    input.focus();
  }

  document.querySelectorAll("[data-open-chat]").forEach((b) => b.addEventListener("click", openChat));
  chat.querySelector(".chat-close").addEventListener("click", () => (chat.hidden = true));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addBubble("user", text);
    history.push({ role: "user", content: text });

    const typing = addBubble("assistant", "Escribiendo…");
    typing.classList.add("typing");
    form.querySelector("button").disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      typing.classList.remove("typing");
      typing.textContent = data.reply;
      history.push({ role: "assistant", content: data.reply });
    } catch (err) {
      typing.classList.remove("typing");
      typing.textContent = "Ups, tuve un problema para responder. ¿Me escribes por WhatsApp? 👉";
      const a = document.createElement("a");
      a.href = waLink("Hola, vengo del chat de la página.");
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = " Abrir WhatsApp";
      typing.appendChild(a);
      history.pop(); // no guardar el mensaje sin respuesta
    } finally {
      form.querySelector("button").disabled = false;
      input.focus();
    }
  });
})();
