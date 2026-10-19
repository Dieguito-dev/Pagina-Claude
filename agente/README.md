# Agente IA (en pausa)

Esto es un **extra opcional**: un chat con inteligencia artificial (Claude) que responde a los visitantes de una página. Está apartado de la página principal para no generar gastos. Si un cliente lo quiere, se activa así:

1. Copia `agente/api/` a la raíz del proyecto (debe quedar `api/chat.js`) y `agente/package.json` también a la raíz.
2. Edita `api/_prompt.js` con la información del negocio del cliente.
3. En la página, antes de `</body>`, agrega:
   ```html
   <link rel="stylesheet" href="agente/widget.css">
   <script src="agente/widget.js" data-marca="Nombre del negocio" defer></script>
   ```
4. En Vercel, agrega la variable `ANTHROPIC_API_KEY` (de https://console.anthropic.com).

## Costo

Cada mensaje del chat se cobra en la cuenta de Anthropic. Para bajar el costo, usa un modelo económico con la variable `CLAUDE_MODEL=claude-haiku-5-5` (el más barato) o `claude-sonnet-5-5`. Por defecto usa `claude-opus-5-5`, el más caro. Lo ideal es cobrarle esto al cliente como mensualidad.
