"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { ESTADO_INSTRUCTOR_A_INT } from "@/lib/enums";
import type {
  EstadoInstructor,
  Instructor,
  InstructorAltaResult,
  InstructorEditarInput,
  InstructorInput,
} from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions de Instructores (Etapa 2 parte 1, SPEC.md §4.2 "Instructor",
 * NUEVO-SPEC) — mismo patrón que `socios/actions.ts`. El alta
 * (`crearInstructor`) crea también el `ApplicationUser` con rol "Instructor"
 * y contraseña temporal (ver `Instructor.cs` en el backend); la respuesta
 * incluye esa contraseña una única vez (`InstructorAltaResult`), para
 * mostrarla en el diálogo de confirmación del formulario.
 */
export async function crearInstructor(
  input: InstructorInput
): Promise<ActionResult<InstructorAltaResult>> {
  try {
    const instructor = await apiFetch<InstructorAltaResult>("/api/instructores", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/instructores");
    return { success: true, data: instructor };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarInstructor(
  id: string,
  input: InstructorEditarInput
): Promise<ActionResult<Instructor>> {
  try {
    const instructor = await apiFetch<Instructor>(`/api/instructores/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/instructores");
    revalidatePath(`/instructores/${id}/editar`);
    return { success: true, data: instructor };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * [SUPUESTO] `Instructor` no tiene `MotivoBaja` en el modelo (§4.2), a
 * diferencia de Socio/GrupoFamiliar — se asume el mismo patrón que
 * `PUT /api/socios/{id}/estado` (`CambiarEstadoSocioRequest(int Estado)`) en
 * vez de un endpoint `.../baja` con motivo obligatorio.
 */
export async function cambiarEstadoInstructor(
  id: string,
  estado: EstadoInstructor
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/instructores/${id}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado: ESTADO_INSTRUCTOR_A_INT[estado] }),
    });
    revalidatePath("/instructores");
    revalidatePath(`/instructores/${id}/editar`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
