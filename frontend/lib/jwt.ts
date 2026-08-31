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

/**
 * Claims estándar de ASP.NET Core (`ClaimTypes.*`) que un JWT emitido por
 * `Microsoft.IdentityModel` suele usar en vez de las claves cortas
 * ("email", "role"). Se prueban ambas formas.
 */
const EMAIL_CLAIM_KEYS = [
  "email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];
const NAME_CLAIM_KEYS = [
  "name",
  "unique_name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
];

export function pickClaim(claims: SessionClaims, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Nombre a mostrar en la UI. Si solo hay email, usa la parte anterior al `@`
 * — "admin" se lee mucho mejor que "admin@clubunion.local" en un saludo.
 */
export function nombreParaMostrar(claims: SessionClaims | null): string {
  if (!claims) return "";

  // El claim `name` de este backend viene con el email completo, así que no
  // alcanza con preferirlo: haya venido de `name` o de `email`, si tiene forma
  // de dirección se recorta antes del `@`. "Admin" saluda mejor que
  // "admin@clubunion.local".
  const bruto = pickClaim(claims, NAME_CLAIM_KEYS) ?? pickClaim(claims, EMAIL_CLAIM_KEYS);
  if (!bruto) return "";

  const usuario = bruto.includes("@") ? (bruto.split("@")[0] ?? bruto) : bruto;
  return usuario.charAt(0).toUpperCase() + usuario.slice(1);
}
