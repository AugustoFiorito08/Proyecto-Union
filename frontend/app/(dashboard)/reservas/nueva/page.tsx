import { apiFetch } from "@/lib/api";
import type { Espacio, PaginatedResult, SocioResumen } from "@/lib/types";
import { ReservaForm } from "../reserva-form";

export const dynamic = "force-dynamic";

export default async function NuevaReservaPage() {
  const [espacios, sociosResult] = await Promise.all([
    apiFetch<Espacio[]>("/api/espacios").catch(() => [] as Espacio[]),
    apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>("/api/socios").catch(
      () => [] as SocioResumen[]
    ),
  ]);
  const socios = Array.isArray(sociosResult) ? sociosResult : sociosResult.items;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nueva reserva</h2>
        <p className="text-sm text-muted-foreground">
          Si el espacio/horario ya está reservado, el backend rechaza la solicitud
          (RF-RES-09 bis).
        </p>
      </div>

      <ReservaForm espacios={espacios} socios={socios} />
    </div>
  );
}
