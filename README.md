# Tareas académicas

Panel académico para consultar tareas almacenadas en Google Sheets. La interfaz se sincroniza manualmente mediante n8n para evitar ejecuciones innecesarias.

## Desarrollo

```bash
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Variables de entorno

Copia `.env.example` como `.env.local` y configura:

```env
N8N_PANEL_KEY=
```

La clave se envía únicamente desde la ruta de servidor `GET /api/tasks` al webhook privado de n8n.

## Validación

```bash
npm run lint
npx next build
```

## Despliegue

- Vercel despliega automáticamente la rama `main`.
- `.openai/hosting.json`, `vite.config.ts`, `build/` y `scripts/` mantienen la compatibilidad con Sites.
