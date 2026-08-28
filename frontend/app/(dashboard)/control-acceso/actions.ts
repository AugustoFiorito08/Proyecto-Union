"use server";

import { apiFetch, ApiError } from "@/lib/api";
import type { ValidarAccesoInput, ValidarAccesoResponse } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Action de la pantalla de portería `/control-acceso`
 * (`POST /api/control-acceso/validar`, RN-ACC-02/03/04/05, §5 "Control de
 * Acceso"). Recibe el token opaco escaneado (RN-ACC-05: nunca un id en
 * claro) y devuelve el resultado de la validación en cascada de RN-ACC-02
 * (Socio existe → Estado del Socio → Estado de la cuota con tolerancia
 * parametrizada → Ficha Médica vigente). Un `ApiError`/error de red acá NO es
 * lo mismo que "Denegado": es una falla de la pantalla en sí (backend caído,
 * 401/403, etc.), que `<ControlAccesoScreen />` muestra aparte del panel
 * verde/rojo de resultado.
 */
export async function validarAcceso(
  input: ValidarAccesoInput
): Promise<ActionResult<ValidarAccesoResponse>> {
  try {
    const resultado = await apiFetch<ValidarAccesoResponse>("/api/control-acceso/validar", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { success: true, data: resultado };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
