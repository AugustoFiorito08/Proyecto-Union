import { apiFetch } from "@/lib/api";
import { ESTADO_CONSULTA_A_INT } from "@/lib/enums";
import type { ConsultaSocio, EstadoConsulta, PaginatedResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
import { ResponderConsultaDialog } from "./responder-consulta-dialog";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoConsulta[] = ["Pendiente", "Respondida", "Cerrada"];

interface ConsultasPageProps {
  searchParams: Promise<{ estado?: string }>;
}

/**
 * `/consultas` (SPEC.md §5 "Consultas del Socio": `GET /api/consultas`
 * admin/empleado, `PUT /api/consultas/{id}/responder`). Dirección inversa a
 * `Comunicacion` (socio → club, §4.2 `ConsultaSocio`) — no tiene ruta propia
 * en la tabla de §7.1 (que solo lista `/mi-cuenta/comunicaciones` del lado
 * del socio), pero sí endpoints admin en §5, así que se agrega bajo
 * `(dashboard)` siguiendo el mismo criterio que `/pagos` (vista global de
 * staff sobre un recurso cuyo alta vive del lado del Portal del Socio).
 */
export default async function ConsultasPage({ searchParams }: ConsultasPageProps) {
  const { estado } = await searchParams;

  let consultas: ConsultaSocio[] = [];
  let loadError: string | null = null;

  try {
    // [SUPUESTO] SPEC.md §5 no lista filtros para `GET /api/consultas` — se
    // asume `?estado=` (número) por el mismo criterio que el resto de
    // listados admin (`?estado=` en Socios/Reservas), a reconciliar contra
    // el backend real.
    const query = new URLSearchParams();
    if (estado && ESTADOS.includes(estado as EstadoConsulta)) {
      query.set("estado", String(ESTADO_CONSULTA_A_INT[estado as EstadoConsulta]));
    }
    const qs = query.toString();
    const result = await apiFetch<PaginatedResult<ConsultaSocio> | ConsultaSocio[]>(
      `/api/consultas${qs ? `?${qs}` : ""}`
    );
    consultas = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Consultas del Socio</h2>
        <p className="mt-0.5 text-muted-foreground">
          Mensajes que los socios enviaron al club desde su portal.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/consultas">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="estado">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {ESTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : consultas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No hay consultas para los filtros seleccionados.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Socio</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultas.map((consulta) => (
                <TableRow key={consulta.id}>
                  <TableCell className="font-medium">{formatDate(consulta.fechaCreacion)}</TableCell>
                  <TableCell>{consulta.socioNombre}</TableCell>
                  <TableCell>{consulta.area}</TableCell>
                  <TableCell>{consulta.asunto}</TableCell>
                  <TableCell>
                    <StatusBadge status={consulta.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ResponderConsultaDialog consulta={consulta} />
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
