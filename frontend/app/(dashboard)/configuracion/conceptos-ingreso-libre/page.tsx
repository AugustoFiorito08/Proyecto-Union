import { apiFetch } from "@/lib/api";
import type { ConceptoIngresoLibre } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ConceptoDialog } from "./concepto-dialog";
import { ConceptoEstadoActions } from "./concepto-estado-actions";

export const dynamic = "force-dynamic";

/**
 * `/configuracion/conceptos-ingreso-libre` (RN-FIN-09, §3.20) — catálogo de
 * ingresos sin Cuota ni Reserva asociada (ej. "Jardín", "Eventos", "Otros
 * ingresos", visto en el dashboard financiero de Figma). Estructura idéntica
 * a `configuracion/categorias/page.tsx`.
 */
export default async function ConceptosIngresoLibrePage() {
  let conceptos: ConceptoIngresoLibre[] = [];
  let loadError: string | null = null;

  try {
    conceptos = await apiFetch<ConceptoIngresoLibre[]>(
      "/api/configuracion/conceptos-ingreso-libre"
    );
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Conceptos de ingreso libre</h2>
          <p className="text-sm text-muted-foreground">
            Categorías de ingreso que no corresponden a una cuota social ni a la reserva de un
            espacio (RN-FIN-09).
          </p>
        </div>
        <ConceptoDialog />
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : conceptos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay conceptos cargados.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conceptos.map((concepto) => (
                <TableRow key={concepto.id}>
                  <TableCell className="font-medium">{concepto.nombre}</TableCell>
                  <TableCell>
                    <StatusBadge status={concepto.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ConceptoDialog concepto={concepto} />
                      <ConceptoEstadoActions conceptoId={concepto.id} estado={concepto.estado} />
                    </div>
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
