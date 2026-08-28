"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { ConceptoIngresoLibre, ConceptoIngresoLibreInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions de `ConceptoIngresoLibre` (RN-FIN-09, §3.20) — mismo patrón
 * que `configuracion/categorias/actions.ts`. `CRUD /api/configuracion/conceptos-ingreso-libre`
 * (§5): alta/edición sin `estado` (siempre nace Activo). Confirmado contra
 * `ConceptosIngresoLibreController` real: la baja es `DELETE .../{id}` (pone
 * `Estado=Inactivo`, no elimina la fila — evita invalidar Pagos históricos
 * que ya la referencian), mismo patrón exacto que `AmenitiesController`. No
 * existe reactivación — es de un solo sentido, igual que Amenities.
 */
export async function crearConcepto(
  input: ConceptoIngresoLibreInput
): Promise<ActionResult<ConceptoIngresoLibre>> {
  try {
    const concepto = await apiFetch<ConceptoIngresoLibre>(
      "/api/configuracion/conceptos-ingreso-libre",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/configuracion/conceptos-ingreso-libre");
    return { success: true, data: concepto };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarConcepto(
  id: string,
  input: ConceptoIngresoLibreInput
): Promise<ActionResult<ConceptoIngresoLibre>> {
  try {
    const concepto = await apiFetch<ConceptoIngresoLibre>(
      `/api/configuracion/conceptos-ingreso-libre/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/configuracion/conceptos-ingreso-libre");
    return { success: true, data: concepto };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function darDeBajaConcepto(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/configuracion/conceptos-ingreso-libre/${id}`, {
      method: "DELETE",
    });
    revalidatePath("/configuracion/conceptos-ingreso-libre");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
