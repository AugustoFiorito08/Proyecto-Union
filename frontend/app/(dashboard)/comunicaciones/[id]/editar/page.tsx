import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type {
  Categoria,
  Comunicacion,
  GrupoFamiliarResumen,
  PaginatedResult,
  SocioResumen,
} from "@/lib/types";
import { ComunicacionWizard } from "../../comunicacion-wizard";

export const dynamic = "force-dynamic";

interface EditarComunicacionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/comunicaciones/[id]/editar` (SPEC.md §7.1: "... / edición de borrador").
 * Solo tiene sentido sobre un borrador o una comunicación programada todavía
 * no enviada — si ya se envió, no debería poder reabrirse (la validación de
 * esa regla queda del lado del backend, `PUT /api/comunicaciones/{id}`).
 */
export default async function EditarComunicacionPage({ params }: EditarComunicacionPageProps) {
  const { id } = await params;

  let comunicacion: Comunicacion;
  try {
    comunicacion = await apiFetch<Comunicacion>(`/api/comunicaciones/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const [categorias, gruposResult, sociosResult] = await Promise.all([
    apiFetch<Categoria[]>("/api/configuracion/categorias").catch(() => [] as Categoria[]),
    apiFetch<PaginatedResult<GrupoFamiliarResumen> | GrupoFamiliarResumen[]>(
      "/api/grupos-familiares"
    ).catch(() => [] as GrupoFamiliarResumen[]),
    apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>("/api/socios").catch(
      () => [] as SocioResumen[]
    ),
  ]);
  const grupos = Array.isArray(gruposResult) ? gruposResult : gruposResult.items;
  const socios = Array.isArray(sociosResult) ? sociosResult : sociosResult.items;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Editar borrador</h2>
        <p className="mt-0.5 text-muted-foreground">
          Volvé a elegir destinatarios y canal antes de guardar (ver nota en el wizard).
        </p>
      </div>

      <ComunicacionWizard
        categorias={categorias}
        grupos={grupos}
        socios={socios}
        comunicacionExistente={comunicacion}
      />
    </div>
  );
}
