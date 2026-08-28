"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { Categoria, CategoriaInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/** Server Actions de Categorías (Etapa 1) — mismo patrón que `socios/actions.ts`. */
export async function crearCategoria(input: CategoriaInput): Promise<ActionResult<Categoria>> {
  try {
    const categoria = await apiFetch<Categoria>("/api/configuracion/categorias", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/configuracion/categorias");
    return { success: true, data: categoria };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarCategoria(
  id: string,
  input: CategoriaInput
): Promise<ActionResult<Categoria>> {
  try {
    const categoria = await apiFetch<Categoria>(`/api/configuracion/categorias/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/configuracion/categorias");
    return { success: true, data: categoria };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
