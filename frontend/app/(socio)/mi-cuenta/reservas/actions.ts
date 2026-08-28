"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { TIPO_RESERVA_A_INT } from "@/lib/enums";
import type { MeReservaInput, Reserva } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions del módulo "Mis reservas" del Portal del Socio (SPEC.md §5
 * `/api/me/reservas`, `MePortalController` — resuelve el `SocioId` del
 * token, ver `lib/types.ts` `MeReservaInput`). Mismo patrón que
 * `(dashboard)/reservas/actions.ts`: la validación de superposición de
 * horarios (RF-RES-09 bis) NO se reimplementa acá, se deja que el backend
 * la rechace y se propaga el mensaje tal cual.
 */
export async function crearMiReserva(input: MeReservaInput): Promise<ActionResult<Reserva>> {
  try {
    const reserva = await apiFetch<Reserva>("/api/me/reservas", {
      method: "POST",
      body: JSON.stringify({ ...input, tipoReserva: TIPO_RESERVA_A_INT[input.tipoReserva] }),
    });
    revalidatePath("/mi-cuenta/reservas");
    return { success: true, data: reserva };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * [DECISIÓN — Etapa 2 parte 2] SPEC.md §5 lista `DELETE /api/me/reservas/{id}`
 * y la matriz §2.2 le da al Socio `Propio (C/L/B)` sobre Reservas — se agrega
 * el botón de cancelar en el listado (Tarea 2 no lo pidió explícitamente,
 * pero el endpoint ya está documentado y sin esta acción el módulo quedaría
 * incompleto contra su propio contrato). Sin body: `Reserva` no tiene un
 * campo de motivo propio para la baja del socio (a diferencia de
 * `MotivoInput` de rechazar/cancelar del backoffice).
 */
export async function cancelarMiReserva(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/me/reservas/${id}`, { method: "DELETE" });
    revalidatePath("/mi-cuenta/reservas");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
