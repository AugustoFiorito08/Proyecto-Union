import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

/**
 * Proxy server-side hacia `POST {API_BASE_URL}/api/auth/reset-password`.
 * Mismo patrón que /api/auth/login (ver ese archivo para el detalle del
 * porqué de la proxy en vez de llamar directo desde el cliente).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  const password = body?.password;

  if (!token || !password) {
    return NextResponse.json(
      { message: "Faltan datos para restablecer la contraseña." },
      { status: 400 }
    );
  }

  try {
    const apiResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });

    const data = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      const message =
        (data as { message?: string } | null)?.message ??
        "No se pudo restablecer la contraseña.";
      return NextResponse.json({ message }, { status: apiResponse.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/reset-password] No se pudo contactar la API .NET:", error);
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Intentá nuevamente más tarde." },
      { status: 502 }
    );
  }
}
