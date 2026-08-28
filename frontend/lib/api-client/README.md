# API Client

Placeholder. Todavía no hay suficientes endpoints estables en la API .NET
(`backend/`) como para generar un cliente tipado.

Cuando el backend publique `swagger.json` (ver SPEC.md §5 — mapeo de
endpoints REST), acá va el cliente generado a partir de ese contrato, por
ejemplo con `openapi-typescript` + `openapi-fetch`, u `orval`. La convención
del proyecto (CLAUDE.md) es: **Next.js consumiendo la API .NET mediante un
cliente tipado generado desde `swagger.json`** — no escribir wrappers de
fetch a mano por endpoint una vez que este cliente exista.

Hasta entonces, las rutas que ya necesitan hablar con el backend (por
ejemplo `app/api/auth/login/route.ts`) usan `fetch` nativo directamente,
server-side, contra `API_BASE_URL`.
