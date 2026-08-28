"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { TIPO_RESERVA_A_INT } from "@/lib/enums";
import type { Reserva, ReservaInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

function toApiBody(input: ReservaInput) {
  return { ...input, tipoReserva: TIPO_RESERVA_A_INT[input.tipoReserva] };
}

/**
 * Server Actions de Reservas (Etapa 2 parte 1, SPEC.md §5 "Espacios y
 * Reservas", RF-RES-09 bis) — mismo patrón que `socios/actions.ts`. La
 * validación de superposición de horarios (RF-RES-09 bis) NO se reimplementa
 * acá: se deja que `crearReserva` falle contra el backend y se propaga el
 * mensaje de error tal cual, para que el formulario lo muestre.
 */
export async function crearReserva(input: ReservaInput): Promise<ActionResult<Reserva>> {
  try {
    const reserva = await apiFetch<Reserva>("/api/reservas", {
      method: "POST",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/reservas");
    return { success: true, data: reserva };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function confirmarReserva(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/reservas/${id}/confirmar`, { method: "POST" });
    revalidatePath("/reservas");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * [SUPUESTO] Body unificado a `{ motivo }` para rechazar y cancelar — mismo
 * criterio documentado en `lib/types.ts` (`MotivoInput`): se replica la
 * convención de wire ya usada en la baja de Socio/GrupoFamiliar (`{ motivo
 * }`, no el nombre de columna real de la entidad).
 */
export async function rechazarReserva(id: string, motivo: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/reservas/${id}/rechazar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    });
    revalidatePath("/reservas");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `POST /api/reservas/{id}/cancelar` no recibe body (a diferencia de
 * `rechazar`): confirmado contra `ReservasController.Cancelar`, que no tiene
 * parámetro `[FromBody]`. Devuelve `{ reserva, dentroDePoliticaCancelacion }`
 * (RN-RES-01 parcial, SPEC.md §3.9) — se propaga para que la UI avise si
 * corresponde reembolso (el reembolso en sí lo resuelve Finanzas en Etapa 3).
 */
export async function cancelarReserva(
  id: string
): Promise<ActionResult<{ dentroDePoliticaCancelacion: boolean }>> {
  try {
    const respuesta = await apiFetch<{ dentroDePoliticaCancelacion: boolean }>(
      `/api/reservas/${id}/cancelar`,
      { method: "POST" }
    );
    revalidatePath("/reservas");
    return { success: true, data: respuesta };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
