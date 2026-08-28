"use server";

import { apiFetch, ApiError } from "@/lib/api";
import { MEDIO_PAGO_A_INT } from "@/lib/enums";
import type { MercadoPagoCheckoutResponse } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * "Pagar todo" desde el Portal del Socio (RN-FIN-07 §3.16, RN-FIN-06 §3.15).
 * `POST /api/pagos/mercadopago/checkout` (confirmado contra `PagosController`
 * real) — es el MISMO endpoint que usa el backoffice, ya acepta `cuotaIds`
 * como array (1 o más) y el `PagoService` valida server-side que el Socio
 * autenticado sea titular/dueño de cada cuota (RN-FIN-06). No existe un
 * endpoint plural bajo `/api/me/*` — el único ahí es el singular
 * `POST /api/me/cuotas/{id}/pagar`, que no sirve para agrupar N cuotas en un
 * solo checkout (RN-FIN-07 exige compartir un único `MercadoPagoTransaccionId`).
 *
 * No hay pago manual acá: la matriz §2.2 le da al Socio únicamente "Propio
 * (L, pagar)" — el registro manual (`POST /api/pagos` sin checkout) es
 * exclusivo de Empleado/Administrador/SuperAdmin desde `/pagos`.
 */
export async function pagarCuotasConMercadoPago(
  cuotaIds: string[]
): Promise<ActionResult<MercadoPagoCheckoutResponse>> {
  try {
    const checkout = await apiFetch<MercadoPagoCheckoutResponse>(
      "/api/pagos/mercadopago/checkout",
      {
        method: "POST",
        body: JSON.stringify({ cuotaIds, medioPago: MEDIO_PAGO_A_INT.MercadoPago }),
      }
    );
    return { success: true, data: checkout };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
