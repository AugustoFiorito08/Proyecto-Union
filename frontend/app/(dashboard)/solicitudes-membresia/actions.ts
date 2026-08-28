"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type {
  ActualizarObservacionesSolicitudInput,
  RechazarSolicitudInput,
  SolicitudMembresia,
} from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions del backoffice de Solicitudes de Membresía (§5, RF-SOL-13
 * "conversión a Socio"). §2.2 restringe aprobar/rechazar a
 * Administrador/SuperAdmin — Empleado solo puede pre-revisar y anotar
 * observaciones (nota al pie de §2.2). `proxy.ts` no filtra por sub-ruta ni
 * permiso específico dentro de `(dashboard)`, así que estas acciones NO
 * ocultan nada por sí mismas: si el backend responde 403 (Empleado
 * intentando aprobar/rechazar), el mensaje se propaga tal cual para que
 * `solicitud-detail-actions.tsx` lo muestre en vez de asumir que la UI ya lo
 * bloqueó — mismo criterio que `configuracion/general/actions.ts`.
 */
/**
 * `POST /api/solicitudes-membresia/{id}/aprobar` — confirmado contra el
 * controller real: no recibe body. El backend resuelve la categoría del
 * nuevo Socio solo (usa `CategoriaPretendidaId` de la solicitud, o hace
 * fallback a la primera Categoría Activa si vino null) — no hay forma de
 * que el staff la elija desde acá.
 */
export async function aprobarSolicitud(id: string): Promise<ActionResult<SolicitudMembresia>> {
  try {
    const solicitud = await apiFetch<SolicitudMembresia>(
      `/api/solicitudes-membresia/${id}/aprobar`,
      { method: "POST" }
    );
    revalidatePath("/solicitudes-membresia");
    revalidatePath(`/solicitudes-membresia/${id}`);
    return { success: true, data: solicitud };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function rechazarSolicitud(
  id: string,
  input: RechazarSolicitudInput
): Promise<ActionResult<SolicitudMembresia>> {
  try {
    const solicitud = await apiFetch<SolicitudMembresia>(
      `/api/solicitudes-membresia/${id}/rechazar`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/solicitudes-membresia");
    revalidatePath(`/solicitudes-membresia/${id}`);
    return { success: true, data: solicitud };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `PUT /api/solicitudes-membresia/{id}` — confirmado contra
 * `ActualizarSolicitudMembresiaRequest`/`SolicitudesMembresiaController.Actualizar`
 * reales (no hay sub-path `/observaciones`, es el mismo endpoint de edición
 * general de la solicitud, con `{ observaciones }` como único campo).
 */
export async function actualizarObservacionesSolicitud(
  id: string,
  input: ActualizarObservacionesSolicitudInput
): Promise<ActionResult<SolicitudMembresia>> {
  try {
    const solicitud = await apiFetch<SolicitudMembresia>(
      `/api/solicitudes-membresia/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      }
    );
    revalidatePath(`/solicitudes-membresia/${id}`);
    return { success: true, data: solicitud };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
