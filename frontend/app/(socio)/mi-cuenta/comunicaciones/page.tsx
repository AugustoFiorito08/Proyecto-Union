import { apiFetch } from "@/lib/api";
import type { ConsultaSocio, MeComunicacion, PaginatedResult } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NovedadesList } from "./novedades-list";
import { NuevaConsultaForm } from "./nueva-consulta-form";

export const dynamic = "force-dynamic";

/**
 * `/mi-cuenta/comunicaciones` (SPEC.md §7.1: "Consultas al club (`ConsultaSocio`)";
 * §5 `GET /api/me/comunicaciones`, `GET`/`POST /api/me/consultas`). Dos tabs:
 * "Novedades" (feed in-app de `Comunicacion`, canal Novedad) y "Mis consultas"
 * (alta + historial de `ConsultaSocio`, dirección inversa socio→club).
 * `GET /api/me/*` se asume array plano sin paginar, mismo criterio ya
 * confirmado para `/api/me/reservas`/`/api/me/cuotas` — verificado
 * defensivamente igual que el resto (`Array.isArray`).
 */
export default async function MiCuentaComunicacionesPage() {
  let comunicaciones: MeComunicacion[] = [];
  let comunicacionesError: string | null = null;
  try {
    const result = await apiFetch<PaginatedResult<MeComunicacion> | MeComunicacion[]>(
      "/api/me/comunicaciones"
    );
    comunicaciones = Array.isArray(result) ? result : result.items;
  } catch (error) {
    comunicacionesError =
      error instanceof Error ? error.message : "No se pudieron cargar tus novedades.";
  }

  let consultas: ConsultaSocio[] = [];
  let consultasError: string | null = null;
  try {
    const result = await apiFetch<PaginatedResult<ConsultaSocio> | ConsultaSocio[]>(
      "/api/me/consultas"
    );
    consultas = Array.isArray(result) ? result : result.items;
  } catch (error) {
    consultasError = error instanceof Error ? error.message : "No se pudieron cargar tus consultas.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Comunicaciones</h2>
        <p className="text-sm text-muted-foreground">
          Novedades del club y tus consultas enviadas.
        </p>
      </div>

      <Tabs defaultValue="novedades">
        <TabsList>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
          <TabsTrigger value="consultas">Mis consultas</TabsTrigger>
        </TabsList>

        <TabsContent value="novedades" className="mt-4">
          {comunicacionesError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {comunicacionesError}
            </p>
          ) : (
            <NovedadesList comunicaciones={comunicaciones} />
          )}
        </TabsContent>

        <TabsContent value="consultas" className="mt-4 space-y-6">
          <NuevaConsultaForm />

          {consultasError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {consultasError}
            </p>
          ) : consultas.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              Todavía no enviaste ninguna consulta.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Respuesta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="font-medium">
                        {formatDate(consulta.fechaCreacion)}
                      </TableCell>
                      <TableCell>{consulta.area}</TableCell>
                      <TableCell>{consulta.asunto}</TableCell>
                      <TableCell>
                        <StatusBadge status={consulta.estado} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {consulta.respuesta ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
