"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * [DECISIÓN — Etapa 2 parte 2] No existía ningún mecanismo de logout en el
 * proyecto (ni Server Action ni botón en `<Header />`/`<Sidebar />` de
 * `(dashboard)` — se verificó que no hay ninguna referencia a "logout" en
 * `app/` ni `components/` antes de esta parte). Se crea acá, como Server
 * Action compartida, porque tanto el mini-portal del Instructor como el
 * Portal del Socio la necesitan (Tarea 1/2 piden "logout" en el sidebar
 * reducido de cada uno) y no tiene sentido duplicarla. `(dashboard)` puede
 * adoptar la misma función más adelante sin cambios.
 *
 * Solo borra la cookie httpOnly de sesión (`SESSION_COOKIE_NAME`) — no hay
 * `POST /api/auth/logout` en el backend que invalide el token server-side
 * todavía documentado con un contrato claro más allá de existir en SPEC.md
 * §5; dado que el JWT es de corta duración (ver `expiresIn` en
 * `app/api/auth/login/route.ts`) y no se persiste ningún estado de sesión
 * server-side propio, borrar la cookie alcanza para el logout del lado
 * frontend. Si el backend requiere invalidación explícita, agregar acá un
 * `fetch` a `/api/auth/logout` antes de borrar la cookie.
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
