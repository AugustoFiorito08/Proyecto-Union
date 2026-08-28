import { apiFetch } from "@/lib/api";
import type { Categoria } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { CategoriaDialog } from "./categoria-dialog";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  let categorias: Categoria[] = [];
  let loadError: string | null = null;

  try {
    categorias = await apiFetch<Categoria[]>("/api/configuracion/categorias");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            Categorías de socio y valor de cuota asociado.
          </p>
        </div>
        <CategoriaDialog />
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : categorias.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay categorías cargadas.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Valor de cuota</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoria.descripcion ?? "—"}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    }).format(categoria.valorCuota)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={categoria.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CategoriaDialog categoria={categoria} />
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
