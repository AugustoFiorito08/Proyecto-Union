import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { GrupoFamiliar, PaginatedResult, SocioResumen } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { EditarGrupoForm } from "./editar-grupo-form";
import { IntegrantesManager } from "./integrantes-manager";
import { GrupoEstadoActions } from "./grupo-estado-actions";

export const dynamic = "force-dynamic";

interface EditarGrupoFamiliarPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarGrupoFamiliarPage({
  params,
}: EditarGrupoFamiliarPageProps) {
  const { id } = await params;

  let grupo: GrupoFamiliar;
  try {
    grupo = await apiFetch<GrupoFamiliar>(`/api/grupos-familiares/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  let socios: SocioResumen[] = [];
  try {
    const result = await apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>(
      "/api/socios"
    );
    socios = Array.isArray(result) ? result : result.items;
  } catch {
    socios = [];
  }

  const integrantesIds = new Set(grupo.integrantes.map((integrante) => integrante.socioId));
  const sociosDisponibles = socios.filter(
    (socio) => !socio.grupoFamiliarId && !integrantesIds.has(socio.id)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Grupo N° {grupo.numeroGrupo}</p>
          <h2 className="text-xl font-semibold">{grupo.nombre || "Grupo familiar"}</h2>
          <div className="mt-1">
            <StatusBadge status={grupo.estado} />
          </div>
        </div>
        <GrupoEstadoActions grupoId={grupo.id} estado={grupo.estado} />
      </div>

      <EditarGrupoForm grupo={grupo} />

      <IntegrantesManager
        grupoId={grupo.id}
        titularSocioId={grupo.titularSocioId}
        integrantes={grupo.integrantes}
        sociosDisponibles={sociosDisponibles}
      />
    </div>
  );
}
