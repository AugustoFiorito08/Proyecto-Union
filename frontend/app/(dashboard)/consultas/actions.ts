"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { ConsultaSocio, ResponderConsultaInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Action de "Responder consulta" (`PUT /api/consultas/{id}/responder`,
 * SPEC.md §5 "Consultas del Socio"). Mismo patrón de `ActionResult` que el
 * resto de Etapas 1-3.
 */
export async function responderConsulta(
  id: string,
  input: ResponderConsultaInput
): Promise<ActionResult<ConsultaSocio>> {
  try {
    const consulta = await apiFetch<ConsultaSocio>(`/api/consultas/${id}/responder`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/consultas");
    return { success: true, data: consulta };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
