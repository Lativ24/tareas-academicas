const N8N_URL = "https://adrianfide.app.n8n.cloud/webhook/asistente-academico-tareas";

export async function GET() {
  const key = process.env.N8N_PANEL_KEY;
  if (!key) {
    return Response.json({ error: "La conexión todavía no está activa." }, { status: 503 });
  }

  try {
    const response = await fetch(N8N_URL, {
      headers: { "x-panel-key": key },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({ error: "No se pudo actualizar la hoja." }, { status: 502 });
    }
    const payload = await response.json();
    const tasks = Array.isArray(payload) ? payload : payload?.tasks;
    if (!Array.isArray(tasks)) {
      return Response.json({ error: "La hoja devolvió un formato inesperado." }, { status: 502 });
    }

    return Response.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "El servicio de tareas no está disponible." }, { status: 502 });
  }
}
