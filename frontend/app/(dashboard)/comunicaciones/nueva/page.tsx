import { apiFetch } from "@/lib/api";
import type { Categoria, GrupoFamiliarResumen, PaginatedResult, SocioResumen } from "@/lib/types";
import { ComunicacionWizard } from "../comunicacion-wizard";

export const dynamic = "force-dynamic";

/**
 * `/comunicaciones/nueva` (SPEC.md §7.1: "Wizard de nuevo mensaje"). Trae los
 * datos de soporte que necesita el paso 1 del wizard (categorías, grupos
 * familiares, socios) — mismo criterio que `reservas/nueva/page.tsx`.
 */
export default async function NuevaComunicacionPage() {
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
        <h2 className="text-xl font-semibold">Nueva comunicación</h2>
        <p className="text-sm text-muted-foreground">
          Se guarda como borrador y recién se envía o programa al terminar el wizard.
        </p>
      </div>

      <ComunicacionWizard categorias={categorias} grupos={grupos} socios={socios} />
    </div>
  );
}
