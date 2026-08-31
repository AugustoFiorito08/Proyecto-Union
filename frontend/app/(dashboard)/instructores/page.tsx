import Link from "next/link";
import { Pencil } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Instructor, PaginatedResult } from "@/lib/types";
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
import { InstructorAltaDialog } from "./instructor-alta-dialog";
import { InstructorEstadoActions } from "./instructor-estado-actions";

export const dynamic = "force-dynamic";

export default async function InstructoresPage() {
  let instructores: Instructor[] = [];
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PaginatedResult<Instructor> | Instructor[]>(
      "/api/instructores"
    );
    instructores = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Instructores</h2>
          <p className="mt-0.5 text-muted-foreground">
            Instructores con acceso al mini-portal de actividades asignadas.
          </p>
        </div>
        <InstructorAltaDialog />
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : instructores.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No hay instructores cargados.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructores.map((instructor) => (
                <TableRow key={instructor.id}>
                  <TableCell className="font-medium">
                    {instructor.apellido}, {instructor.nombres}
                  </TableCell>
                  <TableCell>{instructor.dni}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {instructor.especialidad ?? "—"}
                  </TableCell>
                  <TableCell>{instructor.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={instructor.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/instructores/${instructor.id}/editar`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </Link>
                      <InstructorEstadoActions
                        instructorId={instructor.id}
                        estado={instructor.estado}
                      />
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
