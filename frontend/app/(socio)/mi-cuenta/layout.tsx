import Link from "next/link";
import { CalendarClock, Mail, Wallet } from "lucide-react";

import { getSessionToken, getSessionRole } from "@/lib/auth";
import { decodeJwtPayload, type SessionClaims } from "@/lib/jwt";
import { LogoutButton } from "@/components/logout-button";
import { LogoCau } from "@/components/logo-cau";

const NAV_ITEMS = [
  { href: "/mi-cuenta/reservas", label: "Mis reservas", icon: CalendarClock },
  { href: "/mi-cuenta/pagos", label: "Estado de cuenta", icon: Wallet },
  { href: "/mi-cuenta/comunicaciones", label: "Comunicaciones", icon: Mail },
] as const;

/**
 * Layout real del Portal del Socio (SPEC.md §7.1, base `/mi-cuenta`).
 * `proxy.ts` ya garantiza que solo el rol `Socio` llega hasta acá. Etapa 2
 * (parte 2) implementó Reservas; Etapa 3 agregó Pagos (`/mi-cuenta/pagos`);
 * Etapa 4 agrega Comunicaciones (`/mi-cuenta/comunicaciones` — novedades +
 * consultas) al mismo sidebar reducido — el resto de rutas de `/mi-cuenta`
 * listadas en SPEC.md §7.1 (perfil, actividades, configuración) siguen fuera
 * de alcance, así que no se listan (evita ítems que hoy darían 404).
 */
export default async function MiCuentaLayout({ children }: LayoutProps<"/">) {
  const [token, rol] = await Promise.all([getSessionToken(), getSessionRole()]);
  const claims = token ? decodeJwtPayload<SessionClaims>(token) : null;
  const displayName = claims?.name ?? claims?.email ?? "Socio";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/mi-cuenta/reservas" className="flex items-center gap-2.5">
            <LogoCau className="size-8 shrink-0" />
            <span className="font-heading text-base font-bold leading-tight">
              Club Atlético Unión
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <LogoutButton />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <LogoCau className="size-7 shrink-0" />
            <p className="font-heading text-base font-bold">Club Atlético Unión</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              {rol ? <p className="text-xs text-muted-foreground">{rol}</p> : null}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
