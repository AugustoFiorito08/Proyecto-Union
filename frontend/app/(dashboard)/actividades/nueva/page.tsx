import { apiFetch, apiFetchList } from "@/lib/api";
import type { Categoria, Espacio } from "@/lib/types";
import { ActividadForm } from "../actividad-form";

export const dynamic = "force-dynamic";

export default async function NuevaActividadPage() {
  const [categorias, espacios] = await Promise.all([
    apiFetch<Categoria[]>("/api/configuracion/categorias").catch(() => []),
    apiFetchList<Espacio>("/api/espacios").catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nueva actividad</h2>
        <p className="text-sm text-muted-foreground">
          Completá los datos para dar de alta una nueva actividad. Se crea en estado Suspendida
          hasta que tenga al menos un instructor asignado (RF-ACT-24 bis).
        </p>
      </div>

      <ActividadForm categorias={categorias} espacios={espacios} />
    </div>
  );
}
