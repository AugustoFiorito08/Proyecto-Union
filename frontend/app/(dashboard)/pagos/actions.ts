"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { MEDIO_PAGO_A_INT } from "@/lib/enums";
import type { Pago, PagoManualInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Action de "Registrar pago manual" (`POST /api/pagos`, §5). Acepta
 * `cuotaIds` (uno o más — "Pagar todo", RN-FIN-07 §3.16), `reservaId` o
 * `conceptoIngresoLibreId`, exactamente uno de los tres (RF-FIN-34 actualizado
 * por RN-FIN-09 §3.20). El backend resuelve la generación de N filas de
 * `Pago` en una única transacción atómica cuando `cuotaIds` trae más de un id
 * — el frontend no las genera una por una.
 */
export async function registrarPagoManual(input: PagoManualInput): Promise<ActionResult<Pago[]>> {
  try {
    const pagos = await apiFetch<Pago[]>("/api/pagos", {
      method: "POST",
      body: JSON.stringify({ ...input, medioPago: MEDIO_PAGO_A_INT[input.medioPago] }),
    });
    revalidatePath("/pagos");
    revalidatePath("/finanzas/dashboard");
    return { success: true, data: Array.isArray(pagos) ? pagos : [pagos] };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
