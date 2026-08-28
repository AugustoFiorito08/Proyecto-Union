"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { ESPACIO_TIPO_A_INT, UNIDAD_PRECIO_A_INT } from "@/lib/enums";
import type { Espacio, EspacioInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * `EspacioInput` usa enums "amigables" (string) para la UI; el backend los
 * espera como número en el body (ver `lib/enums.ts`) — mismo patrón que
 * `socios/actions.ts`.
 */
function toApiBody(input: EspacioInput) {
  return {
    ...input,
    tipo: ESPACIO_TIPO_A_INT[input.tipo],
    unidadPrecio: UNIDAD_PRECIO_A_INT[input.unidadPrecio],
  };
}

/** Server Actions de Espacios (Etapa 2 parte 1, SPEC.md §5 Espacios y Reservas). */
export async function crearEspacio(input: EspacioInput): Promise<ActionResult<Espacio>> {
  try {
    const espacio = await apiFetch<Espacio>("/api/espacios", {
      method: "POST",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/espacios");
    return { success: true, data: espacio };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarEspacio(
  id: string,
  input: EspacioInput
): Promise<ActionResult<Espacio>> {
  try {
    const espacio = await apiFetch<Espacio>(`/api/espacios/${id}`, {
      method: "PUT",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/espacios");
    revalidatePath(`/espacios/${id}/editar`);
    return { success: true, data: espacio };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
