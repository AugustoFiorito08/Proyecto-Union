import { apiFetch, ApiError } from "@/lib/api";
import type { ConfiguracionGeneral } from "@/lib/types";
import { ConfiguracionGeneralForm } from "./configuracion-general-form";

export const dynamic = "force-dynamic";

/**
 * `/configuracion/general` (SPEC.md §7.1, RN-FIN-02/RN-FIN-03 §3.2/§3.5) —
 * pantalla exclusiva de SuperAdmin. `proxy.ts` solo garantiza que el rol caiga
 * dentro del route group `(dashboard)` (SuperAdmin/Administrador/Empleado),
 * no que tenga permiso sobre esta sub-ruta puntual — si el backend responde
 * 403 acá (Administrador/Empleado sin el permiso), se muestra un mensaje
 * claro en vez de romper la pantalla, en vez de asumir que el 403 nunca va a
 * pasar.
 */
export default async function ConfiguracionGeneralPage() {
  let configuracion: ConfiguracionGeneral | null = null;
  let loadError: string | null = null;
  let forbidden = false;

  try {
    configuracion = await apiFetch<ConfiguracionGeneral>("/api/configuracion/general");
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      forbidden = true;
    } else {
      loadError = error instanceof Error ? error.message : "No se pudo cargar la configuración.";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configuración general</h2>
        <p className="text-sm text-muted-foreground">
          Parámetros financieros del club: mora, suspensión automática y cálculo de la cuota
          de grupo familiar.
        </p>
      </div>

      {forbidden ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No tenés permiso para ver ni editar la Configuración General. Esta sección es exclusiva
          de SuperAdmin.
        </p>
      ) : loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : (
        <ConfiguracionGeneralForm configuracion={configuracion} />
      )}
    </div>
  );
}
