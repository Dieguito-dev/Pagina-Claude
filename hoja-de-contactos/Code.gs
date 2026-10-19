// Recibe los datos del formulario de la página y los guarda como una fila nueva
// en la hoja de Google. Las instrucciones para instalarlo están en README.md (misma carpeta).
const COLUMNAS = ["Fecha", "Nombre", "Negocio", "Teléfono", "Email", "Mensaje"];

function doPost(e) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (hoja.getLastRow() === 0) hoja.appendRow(COLUMNAS);

  const p = e.parameter;
  const limpiar = (v) => String(v || "").slice(0, 1000).replace(/^[=+\-@]/, "'$&");
  hoja.appendRow([
    new Date(),
    limpiar(p.nombre),
    limpiar(p.negocio),
    limpiar(p.telefono),
    limpiar(p.email),
    limpiar(p.mensaje),
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
