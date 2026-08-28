import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

/**
 * Proxy server-side hacia `POST {API_BASE_URL}/api/auth/forgot-password`.
 * Mismo patrón que /api/auth/login: el frontend nunca llama directo a la API
 * .NET desde el browser (evita CORS y no expone `API_BASE_URL` al cliente).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;

  if (!email) {
    return NextResponse.json({ message: "El email es obligatorio." }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      const message =
        (data as { message?: string } | null)?.message ??
        "No se pudo procesar la solicitud.";
      return NextResponse.json({ message }, { status: apiResponse.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/forgot-password] No se pudo contactar la API .NET:", error);
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Intentá nuevamente más tarde." },
      { status: 502 }
    );
  }
}
