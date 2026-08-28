"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import { MODALIDAD_A_INT, TIPO_PAGO_A_INT } from "@/lib/enums";
import type { CrearAccesoResponse, Socio, SocioInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/**
 * `SocioInput` usa enums "amigables" (string) para la UI; el backend los
 * espera como número en el body (ver `lib/enums.ts`). Esta es la única
 * traducción entre ambos formatos — el resto de los campos viajan igual.
 */
function toApiBody(input: SocioInput) {
  return {
    ...input,
    tipoPago: TIPO_PAGO_A_INT[input.tipoPago],
    modalidad: MODALIDAD_A_INT[input.modalidad],
  };
}

/**
 * Server Actions de Socios (Etapa 1). No usan `redirect()` acá: devuelven un
 * resultado tipado y es el Client Component (`socio-form.tsx`) el que decide
 * la navegación con `useRouter`, siguiendo el mismo patrón que ya usa
 * `app/(auth)/login/page.tsx` (fetch -> chequear -> `router.push`). Evita el
 * problema conocido de mezclar `redirect()` de servidor con un
 * try/catch del lado del cliente (el redirect también lanza una excepción
 * especial que un catch genérico terminaría atrapando).
 */
export async function crearSocio(input: SocioInput): Promise<ActionResult<Socio>> {
  try {
    const socio = await apiFetch<Socio>("/api/socios", {
      method: "POST",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/socios");
    return { success: true, data: socio };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarSocio(
  id: string,
  input: SocioInput
): Promise<ActionResult<Socio>> {
  try {
    const socio = await apiFetch<Socio>(`/api/socios/${id}`, {
      method: "PUT",
      body: JSON.stringify(toApiBody(input)),
    });
    revalidatePath("/socios");
    revalidatePath(`/socios/${id}`);
    return { success: true, data: socio };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function darDeBajaSocio(
  id: string,
  motivoBaja: string
): Promise<ActionResult> {
  try {
    await apiFetch(`/api/socios/${id}/baja`, {
      method: "POST",
      body: JSON.stringify({ motivo: motivoBaja }),
    });
    revalidatePath("/socios");
    revalidatePath(`/socios/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function reactivarSocio(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/api/socios/${id}/reactivar`, { method: "POST" });
    revalidatePath("/socios");
    revalidatePath(`/socios/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

/**
 * `POST /api/socios/{id}/crear-acceso` (prerrequisito de Etapa 2 para el Portal
 * del Socio, no una función de autogestión — esa es Etapa 6). `SocioResponse`
 * no expone si el socio ya tiene cuenta, así que el botón siempre está
 * disponible; si ya la tiene, el backend responde 400 y se muestra tal cual.
 */
export async function crearAccesoSocio(id: string): Promise<ActionResult<CrearAccesoResponse>> {
  try {
    const respuesta = await apiFetch<CrearAccesoResponse>(`/api/socios/${id}/crear-acceso`, {
      method: "POST",
    });
    return { success: true, data: respuesta };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
