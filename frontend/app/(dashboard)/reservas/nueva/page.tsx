import { apiFetch, apiFetchList } from "@/lib/api";
import type { Espacio, PaginatedResult, SocioResumen } from "@/lib/types";
import { ReservaForm } from "../reserva-form";

export const dynamic = "force-dynamic";

export default async function NuevaReservaPage() {
  const [espacios, sociosResult] = await Promise.all([
    apiFetchList<Espacio>("/api/espacios").catch(() => [] as Espacio[]),
    apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>("/api/socios").catch(
      () => [] as SocioResumen[]
    ),
  ]);
  const socios = Array.isArray(sociosResult) ? sociosResult : sociosResult.items;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Nueva reserva</h2>
        <p className="mt-0.5 text-muted-foreground">
          Si el espacio/horario ya está reservado, el backend rechaza la solicitud
          (RF-RES-09 bis).
        </p>
      </div>

      <ReservaForm espacios={espacios} socios={socios} />
    </div>
  );
}
