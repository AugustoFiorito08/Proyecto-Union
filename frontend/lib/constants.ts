/**
 * Nombre de la cookie httpOnly donde se guarda el access token de sesión.
 * Se comparte entre `middleware.ts` (Edge runtime, no puede importar
 * `next/headers`) y `lib/auth.ts` (Server Components / Route Handlers),
 * por eso vive en su propio módulo sin dependencias de Next.
 */
export const SESSION_COOKIE_NAME = "cau_token";

/**
 * Clave de `localStorage` donde `(auth)/solicitud-membresia/solicitud-membresia-form.tsx`
 * guarda el `id` de la `SolicitudMembresia` recién creada, para que
 * `(auth)/solicitud-membresia/seguimiento/page.tsx` pueda recuperarlo en el
 * mismo navegador después del login (el login no preserva ningún `?id=` de
 * vuelta — ver comentario de [SUPUESTO] en `seguimiento/page.tsx` sobre por
 * qué hace falta este mecanismo en vez de solo un query param). Vive acá
 * (no en cada componente) porque la escriben/leen dos client components
 * distintos.
 */
export const SOLICITUD_MEMBRESIA_STORAGE_KEY = "cau_solicitud_membresia_id";
