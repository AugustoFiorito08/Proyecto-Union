import { apiFetch } from "@/lib/api";
import type { Cuota } from "@/lib/types";
import { CuotaChecklistPayment } from "./cuota-checklist-payment";

export const dynamic = "force-dynamic";

/**
 * `/mi-cuenta/pagos` — "Estado de cuenta y pagos" (SPEC.md §7.1). Lista las
 * cuotas del socio autenticado (`GET /api/me/cuotas`, confirmado contra
 * `MePortalController.MisCuotas` real — devuelve un array plano de
 * `CuotaResponse`, no paginado, propias + las del grupo familiar del que sea
 * integrante) y delega la selección/pago a `<CuotaChecklistPayment />`. Sin
 * pago manual: la matriz §2.2 solo le da al Socio "Propio (L, pagar)" — el
 * botón manual es exclusivo del backoffice (`/pagos`, staff).
 */
export default async function MiCuentaPagosPage() {
  let cuotas: Cuota[] = [];
  let loadError: string | null = null;

  try {
    cuotas = await apiFetch<Cuota[]>("/api/me/cuotas");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar tu estado de cuenta.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Estado de cuenta y pagos</h2>
        <p className="mt-0.5 text-muted-foreground">
          Tus cuotas pendientes. Podés seleccionar una o varias y pagarlas juntas.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : (
        <CuotaChecklistPayment cuotas={cuotas} />
      )}
    </div>
  );
}
