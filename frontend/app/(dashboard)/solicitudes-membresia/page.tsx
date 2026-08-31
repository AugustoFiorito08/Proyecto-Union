import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { ESTADO_SOLICITUD_MEMBRESIA_A_INT } from "@/lib/enums";
import type { EstadoSolicitudMembresia, PaginatedResult, SolicitudMembresia } from "@/lib/types";
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
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS: { value: EstadoSolicitudMembresia; label: string }[] = [
  { value: "Pendiente", label: "Pendientes" },
  { value: "Aprobada", label: "Aprobadas" },
  { value: "Rechazada", label: "Rechazadas" },
];

async function fetchSolicitudes(
  estado: EstadoSolicitudMembresia
): Promise<{ items: SolicitudMembresia[]; error: string | null }> {
  try {
    // `?estado=` numérico — mismo criterio que el resto de listados admin
    // (Socios, Reservas, Consultas). `PagedResult` vs array plano: se
    // verifica defensivamente, patrón recurrente desde Etapa 3 (varios
    // listados devuelven `PagedResult` incluso sin paginar explícitamente).
    const result = await apiFetch<PaginatedResult<SolicitudMembresia> | SolicitudMembresia[]>(
      `/api/solicitudes-membresia?estado=${ESTADO_SOLICITUD_MEMBRESIA_A_INT[estado]}`
    );
    return { items: Array.isArray(result) ? result : result.items, error: null };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "No se pudo cargar el listado.",
    };
  }
}

function SolicitudesTable({
  items,
  error,
}: {
  items: SolicitudMembresia[];
  error: string | null;
}) {
  if (error) {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
        No hay solicitudes en esta pestaña.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Solicitud</TableHead>
            <TableHead>Apellido y nombre</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Categoría pretendida</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((solicitud) => (
            <TableRow key={solicitud.id}>
              <TableCell className="font-medium">{solicitud.numeroSolicitud}</TableCell>
              <TableCell>
                {solicitud.apellido}, {solicitud.nombre}
              </TableCell>
              <TableCell>{solicitud.dni}</TableCell>
              <TableCell>{solicitud.categoriaPretendidaNombre ?? "—"}</TableCell>
              <TableCell>{formatDate(solicitud.fechaSolicitud)}</TableCell>
              <TableCell>
                <StatusBadge status={solicitud.estado} />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/solicitudes-membresia/${solicitud.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver detalle
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * `/solicitudes-membresia` (SPEC.md §5 "Solicitudes de Membresía": `GET
 * /api/solicitudes-membresia` admin, §2.2: CLMB SuperAdmin/Administrador, CL
 * Empleado sin aprobar/rechazar). No estaba en la tabla de rutas de §7.1
 * (nunca pasó por la auditoría de Figma, igual que `/control-acceso`) — se
 * agrega siguiendo el mismo criterio ya usado ahí y en `/consultas`: listado
 * admin de un recurso cuyo alta ocurre fuera de `(dashboard)`. Mismo patrón
 * de tabs por estado que `/comunicaciones` (`<Tabs />` client-side, las 3
 * pestañas se traen en paralelo server-side).
 */
export default async function SolicitudesMembresiaPage() {
  const [pendientes, aprobadas, rechazadas] = await Promise.all([
    fetchSolicitudes("Pendiente"),
    fetchSolicitudes("Aprobada"),
    fetchSolicitudes("Rechazada"),
  ]);

  const resultados: Record<EstadoSolicitudMembresia, { items: SolicitudMembresia[]; error: string | null }> = {
    Pendiente: pendientes,
    Aprobada: aprobadas,
    Rechazada: rechazadas,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Solicitudes de Membresía</h2>
        <p className="mt-0.5 text-muted-foreground">
          Solicitudes de alta enviadas desde el portal público (RF-SOL-13).
        </p>
      </div>

      <Tabs defaultValue="Pendiente">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({resultados[tab.value].items.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <SolicitudesTable items={resultados[tab.value].items} error={resultados[tab.value].error} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
