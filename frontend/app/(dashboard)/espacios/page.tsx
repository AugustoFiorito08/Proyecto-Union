import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Espacio, PaginatedResult } from "@/lib/types";
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
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const UNIDAD_PRECIO_LABEL: Record<string, string> = {
  PorHora: "/hora",
  PorTurno: "/turno",
  PorEvento: "/evento",
};

export default async function EspaciosPage() {
  let espacios: Espacio[] = [];
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PaginatedResult<Espacio> | Espacio[]>("/api/espacios");
    espacios = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Espacios</h2>
          <p className="text-sm text-muted-foreground">
            Canchas, salones y espacios reservables del club.
          </p>
        </div>
        <Link href="/espacios/nuevo" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo espacio
        </Link>
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : espacios.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay espacios cargados.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {espacios.map((espacio) => (
                <TableRow key={espacio.id}>
                  <TableCell className="font-medium">{espacio.nombre}</TableCell>
                  <TableCell>{espacio.tipo}</TableCell>
                  <TableCell>{espacio.capacidad}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    }).format(espacio.precio)}
                    <span className="text-muted-foreground">
                      {UNIDAD_PRECIO_LABEL[espacio.unidadPrecio] ?? ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={espacio.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/espacios/${espacio.id}/editar`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </Link>
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
