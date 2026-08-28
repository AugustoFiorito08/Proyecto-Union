"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import {
  ESTADO_ACTIVIDAD_A_INT,
  ESTADO_DIVISION_DEPORTIVA_A_INT,
  MODALIDAD_INSCRIPCION_A_INT,
} from "@/lib/enums";
import type {
  Actividad,
  ActividadInput,
  ActividadInstructoresInput,
  DivisionDeportiva,
  DivisionDeportivaInput,
  DivisionInstructoresInput,
  EstadoActividad,
} from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

function toApiBody(input: ActividadInput) {
  return {
    ...input,
    modalidadInscripcion: MODALIDAD_INSCRIPCION_A_INT[input.modalidadInscripcion],
    estado: ESTADO_ACTIVIDAD_A_INT[input.estado],
  };
}

/**
 * Server Actions de Actividades (Etapa 2 parte 1, SPEC.md §5 "Actividades",
 * RN-ACT-02 §3.17) — mismo patrón que `socios/actions.ts`.
 */
export async function crearActividad(input: ActividadInput): Promise<ActionResult<Actividad>> {
  try {
    const actividad = await apiFetch<Actividad>("/api/actividades", {
      method: "POST",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/actividades");
    return { success: true, data: actividad };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarActividad(
  id: string,
  input: ActividadInput
): Promise<ActionResult<Actividad>> {
  try {
    const actividad = await apiFetch<Actividad>(`/api/actividades/${id}`, {
      method: "PUT",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/actividades");
    revalidatePath(`/actividades/${id}`);
    return { success: true, data: actividad };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * [SUPUESTO] Toggle Activa/Suspendida (botón "activar/suspender" del
 * detalle, Tarea 3). `Actividad` no tiene `MotivoBaja` (§4.2) — se asume el
 * mismo patrón `PUT .../estado` que `Socio`/`Instructor` en vez de un
 * endpoint de baja con motivo. La regla RF-ACT-24 bis (instructor
 * obligatorio para poder activar) la valida el backend; acá solo se
 * propaga el mensaje de error si la rechaza.
 */
export async function cambiarEstadoActividad(
  id: string,
  estado: EstadoActividad
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/actividades/${id}/estado`, {
      method: "PUT",
      body: JSON.stringify({ estado: ESTADO_ACTIVIDAD_A_INT[estado] }),
    });
    revalidatePath("/actividades");
    revalidatePath(`/actividades/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * Cierre definitivo (Estado=Finalizada) vía `POST .../baja` — sin body,
 * mismo patrón que `Categoria`/`CoberturaMedica` (ninguna de las dos
 * modela `MotivoBaja`, a diferencia de Socio/GrupoFamiliar).
 */
export async function finalizarActividad(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/actividades/${id}/baja`, { method: "POST" });
    revalidatePath("/actividades");
    revalidatePath(`/actividades/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/** `PUT /api/actividades/{id}/instructores` — reemplaza el conjunto completo (RN-ACT-02). */
export async function setInstructoresActividad(
  id: string,
  input: ActividadInstructoresInput
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/actividades/${id}/instructores`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath("/actividades");
    revalidatePath(`/actividades/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

function toDivisionApiBody(input: DivisionDeportivaInput) {
  return { ...input, estado: ESTADO_DIVISION_DEPORTIVA_A_INT[input.estado] };
}

export async function crearDivision(
  actividadId: string,
  input: DivisionDeportivaInput
): Promise<ActionResult<DivisionDeportiva>> {
  try {
    const division = await apiFetch<DivisionDeportiva>(
      `/api/actividades/${actividadId}/divisiones`,
      {
        method: "POST",
        body: JSON.stringify(toDivisionApiBody(input)),
      }
    );
    revalidatePath(`/actividades/${actividadId}`);
    revalidatePath(`/actividades/${actividadId}/divisiones`);
    return { success: true, data: division };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarDivision(
  actividadId: string,
  divisionId: string,
  input: DivisionDeportivaInput
): Promise<ActionResult<DivisionDeportiva>> {
  try {
    const division = await apiFetch<DivisionDeportiva>(
      `/api/actividades/${actividadId}/divisiones/${divisionId}`,
      {
        method: "PUT",
        body: JSON.stringify(toDivisionApiBody(input)),
      }
    );
    revalidatePath(`/actividades/${actividadId}`);
    revalidatePath(`/actividades/${actividadId}/divisiones`);
    return { success: true, data: division };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `PUT /api/actividades/{id}/divisiones/{divisionId}/instructores` — endpoint dedicado,
 * reemplaza el conjunto completo de instructores de la división (RN-ACT-02, §3.17). El
 * estado de la división se cambia desde `DivisionDialog` (crear/editar), no acá.
 */
export async function setInstructoresDivision(
  actividadId: string,
  divisionId: string,
  input: DivisionInstructoresInput
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/actividades/${actividadId}/divisiones/${divisionId}/instructores`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    revalidatePath(`/actividades/${actividadId}`);
    revalidatePath(`/actividades/${actividadId}/divisiones`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
