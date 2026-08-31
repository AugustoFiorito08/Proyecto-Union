import Link from "next/link";
import { Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { ESTADO_RESERVA_A_INT } from "@/lib/enums";
import type { Espacio, EstadoReserva, PaginatedResult, Reserva } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { ReservaDatePicker } from "./reserva-date-picker";
import { ReservaRowActions } from "./reserva-row-actions";
import { ReservasDia } from "./reservas-dia";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoReserva[] = [
  "PendienteConfirmacion",
  "Confirmada",
  "Rechazada",
  "Pagada",
  "Cancelada",
];

function hoyIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;
}

interface ReservasPageProps {
  searchParams: Promise<{ fecha?: string; estado?: string; espacioId?: string }>;
}

export default async function ReservasPage({ searchParams }: ReservasPageProps) {
  const params = await searchParams;
  const fecha = params.fecha ?? hoyIso();

  // `GET /api/espacios` devuelve `PagedResult`, no un array plano: tipado como
  // array, `espacios.map` rompía la pantalla entera con "espacios.map is not a
  // function". Mismo chequeo defensivo que ya usan Socios, Consultas y
  // Solicitudes de Membresía — patrón recurrente desde Etapa 3.
  const espaciosRaw = await apiFetch<PaginatedResult<Espacio> | Espacio[]>(
    "/api/espacios",
  ).catch(() => [] as Espacio[]);
  const espacios = Array.isArray(espaciosRaw) ? espaciosRaw : espaciosRaw.items;

  let reservas: Reserva[] = [];
  let loadError: string | null = null;

  try {
    const query = new URLSearchParams({ fecha });
    if (params.espacioId) query.set("espacioId", params.espacioId);
    if (params.estado && ESTADOS.includes(params.estado as EstadoReserva)) {
      // El filtro `estado` viaja como número, mismo criterio que `?estado=`
      // en `GET /api/socios` (ver `SociosController.cs`).
      query.set("estado", String(ESTADO_RESERVA_A_INT[params.estado as EstadoReserva]));
    }
    // Mismo caso que `/api/espacios` de arriba: la respuesta es `PagedResult`.
    const resultado = await apiFetch<PaginatedResult<Reserva> | Reserva[]>(
      `/api/reservas?${query.toString()}`,
    );
    reservas = Array.isArray(resultado) ? resultado : resultado.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Reservas</h2>
          <p className="mt-0.5 text-muted-foreground">
            Reservas de espacios del club para el día seleccionado.
          </p>
        </div>
        <Link href="/reservas/nueva" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva reserva
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <ReservaDatePicker fecha={fecha} />

        <form className="flex flex-wrap items-end gap-3" action="/reservas">
          <input type="hidden" name="fecha" value={fecha} />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="espacioId">
              Espacio
            </label>
            <select
              id="espacioId"
              name="espacioId"
              defaultValue={params.espacioId ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {espacios.map((espacio) => (
                <option key={espacio.id} value={espacio.id}>
                  {espacio.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="estado">
              Estado
            </label>
            <select
              id="estado"
              name="estado"
              defaultValue={params.estado ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : (
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="dia">Por espacio</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            {reservas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
                No hay reservas para los filtros seleccionados.
              </p>
            ) : (
              <div className="rounded-lg border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horario</TableHead>
                      <TableHead>Espacio</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservas.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell className="font-medium">
                          {reserva.horaInicio.slice(0, 5)} - {reserva.horaFin.slice(0, 5)}
                        </TableCell>
                        <TableCell>{reserva.espacioNombre}</TableCell>
                        <TableCell>
                          {reserva.socioApellidoNombres ?? reserva.nombreContacto ?? "—"}
                        </TableCell>
                        <TableCell>{reserva.tipoReserva}</TableCell>
                        <TableCell>
                          <StatusBadge status={reserva.estado} />
                        </TableCell>
                        <TableCell className="text-right">
                          <ReservaRowActions reservaId={reserva.id} estado={reserva.estado} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dia" className="mt-4">
            <ReservasDia espacios={espacios} reservas={reservas} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
