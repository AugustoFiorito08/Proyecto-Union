"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { TIPO_TARIFA_FAMILIAR_A_INT } from "@/lib/enums";
import type { ConfiguracionGeneral, ConfiguracionGeneralInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * Server Action de `/configuracion/general` (RN-FIN-02/RN-FIN-03, §3.2/§3.5).
 * Pantalla exclusiva de SuperAdmin (§2.2: "Configuración General | CLMB | —").
 * `proxy.ts` solo filtra por route group (`(dashboard)`), no por sub-ruta ni
 * rol específico dentro del grupo — si el backend responde 403 (Administrador
 * u otro rol intentando guardar), se propaga el mensaje tal cual para que la
 * pantalla lo muestre en vez de asumir que el rol-check de UI ya lo cubrió.
 */
export async function actualizarConfiguracionGeneral(
  input: ConfiguracionGeneralInput
): Promise<ActionResult<ConfiguracionGeneral>> {
  try {
    const configuracion = await apiFetch<ConfiguracionGeneral>("/api/configuracion/general", {
      method: "PUT",
      body: JSON.stringify({
        ...input,
        tipoTarifaFamiliar: TIPO_TARIFA_FAMILIAR_A_INT[input.tipoTarifaFamiliar],
      }),
    });
    revalidatePath("/configuracion/general");
    return { success: true, data: configuracion };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
