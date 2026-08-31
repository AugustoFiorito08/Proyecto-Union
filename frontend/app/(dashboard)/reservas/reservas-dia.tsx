import type { Espacio, Reserva } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ReservaRowActions } from "./reserva-row-actions";

interface ReservasDiaProps {
  espacios: Espacio[];
  reservas: Reserva[];
}

/**
 * Vista del día: grid/lista simple de horarios ocupados por espacio (Tarea
 * 3 — "no hace falta librería de calendario completa"). Una tarjeta por
 * espacio con sus bloques horarios del día seleccionado, en vez del grid
 * completo columnas=espacios/filas=horas de `<ReservationCalendar />`
 * (SPEC.md §7.2), que queda para una iteración con más volumen de datos real
 * para justificarlo.
 */
export function ReservasDia({ espacios, reservas }: ReservasDiaProps) {
  if (espacios.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
        No hay espacios cargados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {espacios.map((espacio) => {
        const reservasEspacio = reservas
          .filter((reserva) => reserva.espacioId === espacio.id)
          .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

        return (
          <Card key={espacio.id}>
            <CardHeader>
              <CardTitle className="text-base">{espacio.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reservasEspacio.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin reservas este día.</p>
              ) : (
                reservasEspacio.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {reserva.horaInicio.slice(0, 5)} - {reserva.horaFin.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reserva.socioApellidoNombres ?? reserva.nombreContacto ?? "Sin nombre"} ·{" "}
                        {reserva.tipoReserva}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={reserva.estado} />
                      <ReservaRowActions reservaId={reserva.id} estado={reserva.estado} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
