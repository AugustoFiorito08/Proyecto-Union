import { apiFetch } from "@/lib/api";
import type { PaginatedResult, SocioResumen } from "@/lib/types";
import { NuevoGrupoForm } from "./nuevo-grupo-form";

export const dynamic = "force-dynamic";

export default async function NuevoGrupoFamiliarPage() {
  let socios: SocioResumen[] = [];
  try {
    const result = await apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>(
      "/api/socios"
    );
    socios = Array.isArray(result) ? result : result.items;
  } catch {
    socios = [];
  }

  const sociosDisponibles = socios.filter((socio) => !socio.grupoFamiliarId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nuevo grupo familiar</h2>
        <p className="text-sm text-muted-foreground">
          Seleccioná el socio titular para dar de alta el grupo familiar.
        </p>
      </div>

      <NuevoGrupoForm sociosDisponibles={sociosDisponibles} />
    </div>
  );
}
