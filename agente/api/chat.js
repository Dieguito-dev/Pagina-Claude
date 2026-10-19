import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./_prompt.js";

const client = new Anthropic(); // lee ANTHROPIC_API_KEY de las variables de entorno
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MAX_TURNS = 20;
const MAX_CHARS = 1000;

const FALLBACK_REPLY =
  "Esa pregunta mejor te la responde el equipo directamente. ¿Me compartes tu nombre y WhatsApp para que te contacten?";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  // Solo aceptamos mensajes de texto user/assistant, recortados, y la conversación reciente.
  const messages = incoming
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // La conversación debe empezar con el usuario y terminar con el usuario.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Falta el mensaje del usuario" });
  }

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return res.status(200).json({ reply: reply || FALLBACK_REPLY });
  } catch (err) {
    console.error("Error llamando a Claude:", err);
    return res.status(502).json({ error: "No se pudo obtener respuesta" });
  }
}
