import Link from "next/link";
import { Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { PaginatedResult, Reserva } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { MiReservaRowActions } from "./mi-reserva-row-actions";

export const dynamic = "force-dynamic";

/**
 * "Alquiler de espacios" — listado (SPEC.md §7.1 `/mi-cuenta/reservas`,
 * `GET /api/me/reservas`). [SUPUESTO] Se trata como array simple (no
 * `PaginatedResult`), igual criterio que `GET /api/espacios` en
 * `(dashboard)/reservas/nueva/page.tsx`: es el listado acotado a un único
 * socio, no un listado global del club — aun así se maneja de forma
 * defensiva por si el backend decide paginarlo.
 */
export default async function MiCuentaReservasPage() {
  let reservas: Reserva[] = [];
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PaginatedResult<Reserva> | Reserva[]>("/api/me/reservas");
    reservas = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Mis reservas</h2>
          <p className="mt-0.5 text-muted-foreground">
            Reservas de espacios del club a tu nombre.
          </p>
        </div>
        <Link href="/mi-cuenta/reservas/nueva" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva reserva
        </Link>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : reservas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          Todavía no hiciste ninguna reserva.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservas.map((reserva) => (
                <TableRow key={reserva.id}>
                  <TableCell className="font-medium">{formatDate(reserva.fecha)}</TableCell>
                  <TableCell>
                    {reserva.horaInicio.slice(0, 5)} - {reserva.horaFin.slice(0, 5)}
                  </TableCell>
                  <TableCell>{reserva.espacioNombre}</TableCell>
                  <TableCell>{reserva.tipoReserva}</TableCell>
                  <TableCell>
                    <StatusBadge status={reserva.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MiReservaRowActions reservaId={reserva.id} estado={reserva.estado} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
