import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Rutas públicas: landing (`/`) y todo lo que cuelga del route group `(auth)`.
// Los route groups no aparecen en la URL, por eso se listan las rutas reales.
// `/solicitud-membresia` (el formulario de alta) es pública — el No Socio
// todavía no tiene cuenta cuando la visita. `/solicitud-membresia/seguimiento`
// NO se agrega acá a propósito: requiere sesión (ver `SEGUIMIENTO_PATH` más
// abajo), es la única ruta pública nueva que sí exige estar logueado.
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/recuperar-password",
  "/recuperar-password/confirmar",
  "/solicitud-membresia",
]);

// Nombre del claim de rol en el JWT — confirmado contra
// `backend/src/ProyectoUnion.Application/Security/ProyectoUnionClaimTypes.cs`
// (`ProyectoUnionClaimTypes.RolNombre = "rol_nombre"`), y los 6 nombres de rol
// reales sembrados por `backend/.../Persistence/DbSeeder.cs` (`RolesDelSistema`).
const ROL_NOMBRE_CLAIM = "rol_nombre";

// Route groups protegidos por rol (SPEC.md §7.1). `(dashboard)` no tiene un
// prefijo de URL propio (sus rutas cuelgan de la raíz: `/socios`,
// `/actividades`, etc.) así que se resuelve por descarte: cualquier ruta no
// pública que no matchee los prefijos de abajo se trata como `(dashboard)`.
const INSTRUCTOR_PREFIX = "/instructor";
const SOCIO_PREFIX = "/mi-cuenta";

// `/solicitud-membresia/seguimiento` (Etapa 6, SPEC.md §7.1) no cuelga de
// ningún route group con prefijo propio (a diferencia de `(instructor)`/
// `(socio)`) — vive suelta bajo `(auth)`, misma carpeta que `/login`. Se
// gatea acá con el mismo mecanismo de prefijo que ya usa el resto del
// archivo, en vez de un chequeo manual en la page: es la opción más
// consistente con cómo está armado `proxy.ts` (agregar un caso especial a
// `allowedRolesFor` es trivial, no hace falta un route group nuevo solo para
// esta ruta). La page igual repite un chequeo liviano de sesión como defensa
// en profundidad (ver comentario ahí).
const SEGUIMIENTO_SOLICITUD_PATH = "/solicitud-membresia/seguimiento";

const DASHBOARD_ROLES = ["SuperAdministrador", "Administrador", "EmpleadoSecretaria"];
const INSTRUCTOR_ROLES = ["Instructor"];
const SOCIO_ROLES = ["Socio"];
// Rol sembrado en `backend/.../DbSeeder.cs` (`RolesDelSistema`) como
// `"NoSocio"` (sin espacio) para el usuario que crea `POST /api/solicitudes-membresia`.
const NO_SOCIO_ROLES = ["NoSocio"];

const ROLE_HOME: Record<string, string> = {
  SuperAdministrador: "/dashboard",
  Administrador: "/dashboard",
  EmpleadoSecretaria: "/dashboard",
  Instructor: "/instructor/actividades",
  Socio: "/mi-cuenta/reservas",
  NoSocio: SEGUIMIENTO_SOLICITUD_PATH,
};

/**
 * Decodificación *no verificada* del claim de rol del JWT, solo para el
 * enforcement de route groups acá. No hace falta validar la firma (ya la
 * validó el backend al emitirlo) ni tomarla como fuente de autorización real
 * (eso lo sigue haciendo la API .NET en cada request) — esto solo evita que
 * un rol equivocado navegue a un route group ajeno.
 *
 * No reutiliza `lib/jwt.ts` (usa `Buffer`, sin garantía de estar disponible
 * en el runtime Edge, que es donde corre `proxy.ts` — `next/headers` tampoco
 * lo está, por eso `lib/auth.ts` es un archivo aparte). Acá se usa `atob`,
 * que sí es un global estándar del runtime Edge.
 */
function decodeRolFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);

    // atob devuelve un "binary string" (un byte por char); se reconstruye
    // UTF-8 correctamente antes de parsear el JSON (nombres con tildes, etc.
    // en otros claims no deberían romper el parseo).
    const percentEncoded = Array.from(binary)
      .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
    const json = decodeURIComponent(percentEncoded);

    const claims = JSON.parse(json) as Record<string, unknown>;
    const rol = claims[ROL_NOMBRE_CLAIM];
    return typeof rol === "string" && rol.length > 0 ? rol : null;
  } catch {
    return null;
  }
}

function allowedRolesFor(pathname: string): string[] {
  if (pathname === SEGUIMIENTO_SOLICITUD_PATH) {
    return NO_SOCIO_ROLES;
  }
  if (pathname === INSTRUCTOR_PREFIX || pathname.startsWith(`${INSTRUCTOR_PREFIX}/`)) {
    return INSTRUCTOR_ROLES;
  }
  if (pathname === SOCIO_PREFIX || pathname.startsWith(`${SOCIO_PREFIX}/`)) {
    return SOCIO_ROLES;
  }
  return DASHBOARD_ROLES;
}

// Next.js 16 renombró la convención `middleware.ts` a `proxy.ts` (comportamiento
// idéntico, solo cambia el nombre de archivo/función — ver node_modules/next/
// dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rol = decodeRolFromToken(sessionToken);

  // Rol desconocido/token indecodificable: se trata como no autenticado —
  // no hay a qué home redirigir con seguridad.
  if (!rol) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rolesPermitidos = allowedRolesFor(pathname);

  if (!rolesPermitidos.includes(rol)) {
    const home = ROLE_HOME[rol] ?? "/login";
    if (home !== pathname) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Corre en todo excepto assets estáticos y rutas de API (la API interna de
  // Next maneja su propia autenticación/proxy hacia el backend .NET).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
