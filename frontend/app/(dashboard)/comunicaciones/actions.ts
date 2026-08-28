"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, apiFetchForm, ApiError } from "@/lib/api";
import { CANAL_COMUNICACION_A_INT, TIPO_COMUNICACION_A_INT } from "@/lib/enums";
import type {
  Comunicacion,
  ComunicacionAdjunto,
  ComunicacionInput,
  ProgramarComunicacionInput,
} from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/** Body real enviado al backend: enums como número (`lib/enums.ts`), nunca como string. */
function toWireBody(input: ComunicacionInput) {
  return {
    asunto: input.asunto,
    descripcion: input.descripcion || undefined,
    contenidoHtml: input.contenidoHtml,
    tipoComunicacion: TIPO_COMUNICACION_A_INT[input.tipoComunicacion],
    segmento: input.segmento,
    canales: input.canales.map((canal) => CANAL_COMUNICACION_A_INT[canal]),
  };
}

/**
 * Server Actions de Comunicaciones (Etapa 4, SPEC.md §4.2/§5). `<ComunicacionWizard />`
 * (`comunicacion-wizard.tsx`) siempre crea/edita un borrador primero
 * (`POST`/`PUT /api/comunicaciones[/{id}]`) y recién después dispara
 * `enviar`/`programar` — mismo criterio en dos pasos que ya usa
 * `RegistrarPagoDialog` (armar el recurso, después la acción sobre él), no
 * hay un endpoint combinado "crear y enviar" en §5.
 */
export async function crearComunicacion(
  input: ComunicacionInput
): Promise<ActionResult<Comunicacion>> {
  try {
    const comunicacion = await apiFetch<Comunicacion>("/api/comunicaciones", {
      method: "POST",
      body: JSON.stringify(toWireBody(input)),
    });
    revalidatePath("/comunicaciones");
    return { success: true, data: comunicacion };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function actualizarComunicacion(
  id: string,
  input: ComunicacionInput
): Promise<ActionResult<Comunicacion>> {
  try {
    const comunicacion = await apiFetch<Comunicacion>(`/api/comunicaciones/${id}`, {
      method: "PUT",
      body: JSON.stringify(toWireBody(input)),
    });
    revalidatePath("/comunicaciones");
    revalidatePath(`/comunicaciones/${id}/editar`);
    return { success: true, data: comunicacion };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function eliminarComunicacion(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/comunicaciones/${id}`, { method: "DELETE" });
    revalidatePath("/comunicaciones");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function enviarComunicacion(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/comunicaciones/${id}/enviar`, { method: "POST" });
    revalidatePath("/comunicaciones");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function programarComunicacion(
  id: string,
  input: ProgramarComunicacionInput
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/comunicaciones/${id}/programar`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/comunicaciones");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `POST /api/comunicaciones/{id}/adjuntos` (§5, hasta 5 archivos por
 * comunicación — `ComunicacionAdjunto`, §4.2). [SUPUESTO] nombre de campo
 * `archivos` (multipart, repetido uno por archivo) — sin backend real
 * todavía para confirmar el nombre exacto del campo.
 */
export async function subirAdjuntosComunicacion(
  id: string,
  archivos: File[]
): Promise<ActionResult<ComunicacionAdjunto[]>> {
  try {
    const formData = new FormData();
    for (const archivo of archivos) {
      formData.append("archivos", archivo);
    }
    const adjuntos = await apiFetchForm<ComunicacionAdjunto[]>(
      `/api/comunicaciones/${id}/adjuntos`,
      formData
    );
    revalidatePath("/comunicaciones");
    return { success: true, data: adjuntos };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

