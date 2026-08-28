/**
 * Decodificación *no verificada* del payload de un JWT, solo para lectura
 * de claims de UI (nombre/email/rol en el `<Header />`). No valida la firma
 * — no hace falta: el token ya fue validado por la API .NET al emitirlo, y
 * acá solo se usa para mostrar datos, nunca para tomar decisiones de
 * autorización (eso lo sigue haciendo el backend en cada request).
 *
 * Evita traer una librería (`jwt-decode`) para un JWT estándar: el payload
 * es el segundo segmento, Base64URL-encoded JSON.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export interface SessionClaims {
  email?: string;
  role?: string;
  name?: string;
  [key: string]: unknown;
}
