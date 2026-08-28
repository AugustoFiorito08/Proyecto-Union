"use server";

import { apiFetch, apiFetchForm, ApiError } from "@/lib/api";
import type { SolicitudMembresia, SolicitudMembresiaInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Actions públicas de `/solicitud-membresia` (Etapa 6, SPEC.md §5
 * "Solicitudes de Membresía"). Sin sesión: `apiFetch`/`apiFetchForm` ya
 * manejan esto solas (`getSessionToken()` devuelve `null`, no se manda header
 * `Authorization`), así que no hace falta ningún cliente aparte — mismo
 * criterio documentado en `lib/api.ts`.
 */
export async function crearSolicitudMembresia(
  input: SolicitudMembresiaInput
): Promise<ActionResult<SolicitudMembresia>> {
  try {
    const solicitud = await apiFetch<SolicitudMembresia>("/api/solicitudes-membresia", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { success: true, data: solicitud };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `POST /api/solicitudes-membresia/{id}/adjuntos` (segundo paso, después de
 * crear la solicitud — mismo patrón en 2 pasos que
 * `comunicaciones/comunicacion-wizard.tsx` para `POST .../{id}/adjuntos`).
 * [SUPUESTO] A diferencia de Comunicaciones (lista de N adjuntos bajo un
 * único campo `archivos`), acá `SolicitudMembresia` modela 2 campos de
 * archivo con nombre propio (`DocumentoIdentidadUrl`/`FichaMedicaUrl`) — se
 * asume que el multipart usa esos 2 nombres de campo (`documentoIdentidad`/
 * `fichaMedica`), uno por archivo, en vez de un array repetido. Devuelve la
 * `SolicitudMembresia` actualizada con las URLs ya seteadas.
 */
export async function subirAdjuntosSolicitud(
  id: string,
  archivos: { documentoIdentidad?: File; fichaMedica?: File }
): Promise<ActionResult<SolicitudMembresia>> {
  try {
    const formData = new FormData();
    if (archivos.documentoIdentidad) {
      formData.append("documentoIdentidad", archivos.documentoIdentidad);
    }
    if (archivos.fichaMedica) {
      formData.append("fichaMedica", archivos.fichaMedica);
    }
    const solicitud = await apiFetchForm<SolicitudMembresia>(
      `/api/solicitudes-membresia/${id}/adjuntos`,
      formData
    );
    return { success: true, data: solicitud };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
