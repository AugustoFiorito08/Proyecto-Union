import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Proxy server-side hacia `POST {API_BASE_URL}/api/auth/login` (API .NET).
 * Nunca devuelve el token crudo al cliente: lo guarda en una cookie httpOnly
 * y responde solo `{ ok: true }`.
 */
export async function POST(request: NextRequest) {
  let body: LoginRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[api/auth/login] No se pudo contactar la API .NET:", error);
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Intentá nuevamente más tarde." },
      { status: 502 }
    );
  }

  const data = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "No se pudo iniciar sesión.";
    return NextResponse.json({ message }, { status: apiResponse.status });
  }

  const { accessToken, expiresIn } = (data ?? {}) as Partial<LoginApiResponse>;
  if (!accessToken) {
    return NextResponse.json(
      { message: "Respuesta inesperada del servidor de autenticación." },
      { status: 502 }
    );
  }

  // La cookie solo puede llevar `Secure` si la conexión con el navegador es
  // realmente HTTPS. `NODE_ENV === "production"` no alcanza: en Docker Compose
  // (y en cualquier despliegue sin TLS terminado en este mismo hop) la app
  // corre en modo producción sobre HTTP plano, y un `Secure` mal puesto hace
  // que el navegador descarte la cookie en silencio. Se respeta
  // `x-forwarded-proto` para cuando haya un proxy TLS delante.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto
    ? forwardedProto === "https"
    : request.nextUrl.protocol === "https:";

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn ?? 60 * 60,
  });

  return response;
}
