import { NextResponse } from "next/server";

import { apiFetchRaw } from "@/lib/api";

/**
 * Proxy autenticado hacia `GET /api/socios/{id}/carnet` (API .NET, PDF).
 * Un link directo del browser al backend no puede mandar el Bearer token
 * (vive en una cookie httpOnly, invisible para el navegador) — esta ruta
 * interna lo agrega server-side y devuelve el binario tal cual, sin
 * parsearlo como JSON (`apiFetchRaw`, `lib/api.ts`).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let apiResponse: Response;
  try {
    apiResponse = await apiFetchRaw(`/api/socios/${id}/carnet`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ message }, { status: 502 });
  }

  if (!apiResponse.ok) {
    const message =
      apiResponse.status === 404
        ? "No se encontró el carnet del socio."
        : "No se pudo generar el carnet.";
    return NextResponse.json({ message }, { status: apiResponse.status });
  }

  return new NextResponse(apiResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carnet-${id}.pdf"`,
    },
  });
}
