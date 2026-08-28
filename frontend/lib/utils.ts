import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha ISO (`"2026-08-27"` o `"2026-08-27T00:00:00Z"`) devuelta
 * por la API .NET al formato local `dd/mm/aaaa`. Devuelve `"—"` si no hay
 * valor, para usar directo en JSX sin chequeos extra en cada pantalla.
 */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * `Reserva.Duracion` (minutos) es un campo requerido por el backend
 * (`CrearReservaRequest`/`CrearMeReservaRequest`), pero el form solo pide
 * horaInicio/horaFin — se deriva acá en vez de pedirlo dos veces y arriesgar
 * que queden inconsistentes entre sí.
 */
export function calcularDuracionMinutos(horaInicio: string, horaFin: string): number {
  const [inicioH, inicioM] = horaInicio.split(":").map(Number);
  const [finH, finM] = horaFin.split(":").map(Number);
  const minutos = finH * 60 + finM - (inicioH * 60 + inicioM);
  return minutos > 0 ? minutos : 0;
}
