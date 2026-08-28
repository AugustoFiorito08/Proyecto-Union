import { apiFetch } from "@/lib/api";
import type { Espacio } from "@/lib/types";
import { MiReservaForm } from "../mi-reserva-form";

export const dynamic = "force-dynamic";

export default async function NuevaMiReservaPage() {
  // `/api/espacios` requiere el permiso de staff `espacios.leer`, que un Socio nunca tiene
  // (SPEC.md §2.2: Socio es "L" sobre Espacios, sin permisos de módulo) — `/api/me/espacios`
  // es el endpoint propio del portal para este caso, mismo criterio que `/api/me/reservas`.
  const espacios = await apiFetch<Espacio[]>("/api/me/espacios").catch(() => [] as Espacio[]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nueva reserva</h2>
        <p className="text-sm text-muted-foreground">
          Si el espacio/horario ya está reservado, el sistema rechaza la solicitud
          (RF-RES-09 bis).
        </p>
      </div>

      <MiReservaForm espacios={espacios} />
    </div>
  );
}
