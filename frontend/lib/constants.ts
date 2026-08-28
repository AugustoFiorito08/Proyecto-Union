/**
 * Nombre de la cookie httpOnly donde se guarda el access token de sesión.
 * Se comparte entre `middleware.ts` (Edge runtime, no puede importar
 * `next/headers`) y `lib/auth.ts` (Server Components / Route Handlers),
 * por eso vive en su propio módulo sin dependencias de Next.
 */
export const SESSION_COOKIE_NAME = "cau_token";
