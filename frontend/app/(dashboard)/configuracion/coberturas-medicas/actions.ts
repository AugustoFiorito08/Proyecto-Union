"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, ApiError } from "@/lib/api";
import type { CoberturaMedica, CoberturaMedicaInput, Plan, PlanInput } from "@/lib/types";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; message: string };

function toMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

/** Server Actions de Coberturas Médicas y sus Planes (Etapa 1). */
export async function crearCobertura(
  input: CoberturaMedicaInput
): Promise<ActionResult<CoberturaMedica>> {
  try {
    const cobertura = await apiFetch<CoberturaMedica>("/api/configuracion/coberturas-medicas", {
      method: "POST",
      body: JSON.stringify(input),
    });
    revalidatePath("/configuracion/coberturas-medicas");
    return { success: true, data: cobertura };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarCobertura(
  id: string,
  input: CoberturaMedicaInput
): Promise<ActionResult<CoberturaMedica>> {
  try {
    const cobertura = await apiFetch<CoberturaMedica>(
      `/api/configuracion/coberturas-medicas/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/configuracion/coberturas-medicas");
    return { success: true, data: cobertura };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function crearPlan(
  coberturaId: string,
  input: PlanInput
): Promise<ActionResult<Plan>> {
  try {
    const plan = await apiFetch<Plan>(
      `/api/configuracion/coberturas-medicas/${coberturaId}/planes`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/configuracion/coberturas-medicas");
    return { success: true, data: plan };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}

export async function editarPlan(
  coberturaId: string,
  planId: string,
  input: PlanInput
): Promise<ActionResult<Plan>> {
  try {
    const plan = await apiFetch<Plan>(
      `/api/configuracion/coberturas-medicas/${coberturaId}/planes/${planId}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      }
    );
    revalidatePath("/configuracion/coberturas-medicas");
    return { success: true, data: plan };
  } catch (error) {
    return { success: false, message: toMessage(error) };
  }
}
