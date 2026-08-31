import { apiFetch } from "@/lib/api";
import type { Amenity } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AmenityDialog } from "./amenity-dialog";
import { AmenityRowActions } from "./amenity-row-actions";

export const dynamic = "force-dynamic";

export default async function AmenitiesPage() {
  let amenities: Amenity[] = [];
  let loadError: string | null = null;

  try {
    amenities = await apiFetch<Amenity[]>("/api/configuracion/amenities");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Amenities</h2>
          <p className="mt-0.5 text-muted-foreground">
            Catálogo de comodidades disponibles para los espacios del club.
          </p>
        </div>
        <AmenityDialog />
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : amenities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No hay amenities cargadas.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amenities.map((amenity) => (
                <TableRow key={amenity.id}>
                  <TableCell className="font-medium">{amenity.nombre}</TableCell>
                  <TableCell className="text-right">
                    <AmenityRowActions amenity={amenity} />
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
