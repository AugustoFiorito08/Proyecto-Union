"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { Amenity, AmenityInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions de Amenities (Etapa 2 parte 1, SPEC.md §5 `CRUD
 * /api/configuracion/amenities`) — mismo patrón que
 * `configuracion/categorias/actions.ts`. A diferencia de Categoría, `Amenity`
 * no tiene `Estado` en el backend (`Amenity.cs`: solo `Id`/`Nombre`), así que
 * no hay baja lógica — se asume `DELETE` físico en su lugar.
 */
export async function crearAmenity(input: AmenityInput): Promise<ActionResult<Amenity>> {
  try {
    const amenity = await apiFetch<Amenity>("/api/configuracion/amenities", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/configuracion/amenities");
    return { success: true, data: amenity };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarAmenity(
  id: string,
  input: AmenityInput
): Promise<ActionResult<Amenity>> {
  try {
    const amenity = await apiFetch<Amenity>(`/api/configuracion/amenities/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/configuracion/amenities");
    return { success: true, data: amenity };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function eliminarAmenity(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/configuracion/amenities/${id}`, { method: "DELETE" });
    revalidatePath("/configuracion/amenities");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
