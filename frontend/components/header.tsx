import { Bell } from "lucide-react";

import { getSessionToken } from "@/lib/auth";
import { decodeJwtPayload, type SessionClaims } from "@/lib/jwt";
import { HeaderBreadcrumb } from "@/components/header-breadcrumb";

// Claims estándar de ASP.NET Core (`ClaimTypes.*`) que un JWT emitido por
// `Microsoft.IdentityModel` suele usar en vez de las claves cortas
// ("email", "role"). Se prueban ambas formas porque todavía no vimos un
// token real emitido por el backend de Etapa 1 en adelante — confirmar
// contra la implementación real y simplificar esta lista si hace falta.
const EMAIL_CLAIM_KEYS = [
  "email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];
const ROLE_CLAIM_KEYS = [
  "role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];
const NAME_CLAIM_KEYS = [
  "name",
  "unique_name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
];

function pickClaim(claims: SessionClaims, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export async function Header() {
  const token = await getSessionToken();
  const claims = token ? decodeJwtPayload<SessionClaims>(token) : null;

  const email = claims ? pickClaim(claims, EMAIL_CLAIM_KEYS) : undefined;
  const role = claims ? pickClaim(claims, ROLE_CLAIM_KEYS) : undefined;
  const name = claims ? pickClaim(claims, NAME_CLAIM_KEYS) : undefined;
  const displayName = name ?? email ?? "Usuario";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="min-w-0">
        <HeaderBreadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <p className="text-sm font-medium">{displayName}</p>
            {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
