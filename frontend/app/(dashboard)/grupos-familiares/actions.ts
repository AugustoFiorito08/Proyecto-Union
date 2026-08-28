"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { PARENTESCO_A_INT } from "@/lib/enums";
import type {
  CambiarTitularInput,
  GrupoFamiliar,
  GrupoFamiliarIntegranteInput,
  GrupoFamiliarInput,
} from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions de Grupos Familiares (Etapa 1) — mismo patrón que
 * `socios/actions.ts`: resultado tipado, sin `redirect()` de servidor, es el
 * Client Component el que decide la navegación.
 */
export async function crearGrupoFamiliar(
  input: GrupoFamiliarInput
): Promise<ActionResult<GrupoFamiliar>> {
  try {
    const grupo = await apiFetch<GrupoFamiliar>("/api/grupos-familiares", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/grupos-familiares");
    return { success: true, data: grupo };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarGrupoFamiliar(
  id: string,
  input: GrupoFamiliarInput
): Promise<ActionResult<GrupoFamiliar>> {
  try {
    const grupo = await apiFetch<GrupoFamiliar>(`/api/grupos-familiares/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: grupo };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function agregarIntegrante(
  id: string,
  input: GrupoFamiliarIntegranteInput
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/grupos-familiares/${id}/integrantes`, {
      method: "POST",
      // El backend espera Parentesco como número (ver lib/enums.ts).
      body: JSON.stringify({
        socioId: input.socioId,
        parentesco: PARENTESCO_A_INT[input.parentesco],
      }),
    });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function quitarIntegrante(id: string, socioId: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/grupos-familiares/${id}/integrantes/${socioId}`, {
      method: "DELETE",
    });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function cambiarTitular(
  id: string,
  input: CambiarTitularInput
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/grupos-familiares/${id}/cambiar-titular`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function darDeBajaGrupoFamiliar(
  id: string,
  motivoBaja: string
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/grupos-familiares/${id}/baja`, {
      method: "POST",
      body: JSON.stringify({ motivo: motivoBaja }),
    });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function reactivarGrupoFamiliar(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/grupos-familiares/${id}/reactivar`, { method: "POST" });
    revalidatePath("/grupos-familiares");
    revalidatePath(`/grupos-familiares/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
