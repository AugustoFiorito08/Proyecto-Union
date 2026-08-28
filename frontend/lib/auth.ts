import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { decodeJwtPayload, type SessionClaims } from "@/lib/jwt";

export { SESSION_COOKIE_NAME };

/**
 * Lee el token de sesión desde la cookie httpOnly, para usar en
 * Server Components y Route Handlers (nunca en el cliente: el token
 * jamás se expone al JS del browser).
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}

/**
 * Nombre del claim de rol en el JWT — confirmado contra
 * `backend/src/ProyectoUnion.Application/Security/ProyectoUnionClaimTypes.cs`
 * (`ProyectoUnionClaimTypes.RolNombre = "rol_nombre"`). Mismo claim que lee
 * `proxy.ts` (Edge, decodificación propia con `atob` — ver ese archivo) para
 * el enforcement por route group; acá es la variante para Server Components
 * de los grupos `(dashboard)`, `(instructor)` y `(socio)`, que sí pueden usar
 * `next/headers` y por lo tanto reutilizar `lib/jwt.ts`.
 */
export async function getSessionRole(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const claims = decodeJwtPayload<SessionClaims>(token);
  const rol = claims?.["rol_nombre"];
  return typeof rol === "string" && rol.length > 0 ? rol : null;
}
