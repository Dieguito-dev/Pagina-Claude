// Widget de chat del agente. Para activarlo en una página:
//   <link rel="stylesheet" href="agente/widget.css">
//   <script src="agente/widget.js" data-marca="Nombre del negocio" defer></script>
// Necesita que la función /api/chat esté publicada (ver agente/README.md).
(function () {
  const marca = document.currentScript?.dataset.marca || "nuestro negocio";

  document.body.insertAdjacentHTML(
    "beforeend",
    `<button class="chat-fab" type="button" aria-label="Abrir chat">💬</button>
    <div class="chat" hidden>
      <div class="chat-head">
        <div><strong>Asistente de <span class="chat-marca"></span></strong><small>Responde al instante</small></div>
        <button type="button" class="chat-close" aria-label="Cerrar chat">×</button>
      </div>
      <div class="chat-log" aria-live="polite"></div>
      <form class="chat-form">
        <input type="text" placeholder="Escribe tu pregunta…" autocomplete="off" maxlength="1000" required>
        <button type="submit">Enviar</button>
      </form>
    </div>`
  );

  const chat = document.querySelector(".chat");
  const log = chat.querySelector(".chat-log");
  const form = chat.querySelector(".chat-form");
  const input = form.querySelector("input");
  const history = [];
  chat.querySelector(".chat-marca").textContent = marca;

  function addBubble(role, text) {
    const div = document.createElement("div");
    div.className = `chat-bubble ${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  document.querySelector(".chat-fab").addEventListener("click", () => {
    chat.hidden = false;
    if (!log.children.length) addBubble("assistant", `¡Hola! 👋 Soy el asistente de ${marca}. ¿En qué te ayudo?`);
    input.focus();
  });
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
      typing.textContent = data.reply;
      history.push({ role: "assistant", content: data.reply });
    } catch (err) {
      typing.textContent = "Ups, tuve un problema para responder. Intenta de nuevo en un momento.";
      history.pop(); // no guardar el mensaje sin respuesta
    } finally {
      typing.classList.remove("typing");
      form.querySelector("button").disabled = false;
      input.focus();
    }
  });
})();
