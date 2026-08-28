import { NextResponse } from "next/server";

import { apiFetchRaw } from "@/lib/api";

/**
 * Proxy autenticado hacia `GET /api/pagos/{id}/comprobante` (§5, PDF) — mismo
 * patrón que `socios/[id]/carnet/route.ts`: el Bearer token vive en una
 * cookie httpOnly invisible para el browser, así que un link directo al
 * backend no podría autenticarse.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let apiResponse: Response;
  try {
    apiResponse = await apiFetchRaw(`/api/pagos/${id}/comprobante`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ message }, { status: 502 });
  }

  if (!apiResponse.ok) {
    const message =
      apiResponse.status === 404
        ? "No se encontró el comprobante de este pago."
        : "No se pudo generar el comprobante.";
    return NextResponse.json({ message }, { status: apiResponse.status });
  }

  return new NextResponse(apiResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comprobante-${id}.pdf"`,
    },
  });
}
