"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { ConsultaSocio, ConsultaSocioInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * `PUT /api/me/comunicaciones/{id}/leer` (SPEC.md §5 Portal del Socio, tab
 * "Novedades"). Se dispara al abrir el detalle de una `MeComunicacion` con
 * `fechaLectura == null` — mismo criterio de "efecto secundario al abrir" que
 * ya usa `AuthController`/`MePortalController` en otros flujos de lectura.
 */
export async function marcarComunicacionLeida(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/me/comunicaciones/${id}/leer`, { method: "PUT" });
    revalidatePath("/mi-cuenta/comunicaciones");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/** `POST /api/me/consultas` (SPEC.md §5 Portal del Socio, tab "Mis consultas"). */
export async function crearConsulta(input: ConsultaSocioInput): Promise<ActionResult<ConsultaSocio>> {
  try {
    const consulta = await apiFetch<ConsultaSocio>("/api/me/consultas", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/mi-cuenta/comunicaciones");
    return { success: true, data: consulta };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
