import { apiFetch } from "@/lib/api";
import type { CoberturaMedica } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { CoberturaDialog } from "./cobertura-dialog";
import { PlanesDialog } from "./planes-dialog";

export const dynamic = "force-dynamic";

export default async function CoberturasMedicasPage() {
  let coberturas: CoberturaMedica[] = [];
  let loadError: string | null = null;

  try {
    coberturas = await apiFetch<CoberturaMedica[]>("/api/configuracion/coberturas-medicas");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Coberturas Médicas</h2>
          <p className="text-sm text-muted-foreground">
            Coberturas médicas disponibles y sus planes.
          </p>
        </div>
        <CoberturaDialog />
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : coberturas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay coberturas médicas cargadas.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coberturas.map((cobertura) => (
                <TableRow key={cobertura.id}>
                  <TableCell className="font-medium">{cobertura.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {cobertura.descripcion ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cobertura.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <PlanesDialog cobertura={cobertura} />
                      <CoberturaDialog cobertura={cobertura} />
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
