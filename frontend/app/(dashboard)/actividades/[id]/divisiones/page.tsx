import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { apiFetch, apiFetchList, ApiError } from "@/lib/api";
import type { Actividad, Instructor } from "@/lib/types";
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
import { DivisionDialog } from "./division-dialog";
import { DivisionInstructoresDialog } from "./division-instructores-dialog";

export const dynamic = "force-dynamic";

interface DivisionesPageProps {
  params: Promise<{ id: string }>;
}

export default async function DivisionesPage({ params }: DivisionesPageProps) {
  const { id } = await params;

  let actividad: Actividad;
  try {
    actividad = await apiFetch<Actividad>(`/api/actividades/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const instructoresDisponibles = await apiFetchList<Instructor>("/api/instructores").catch(
    () => [] as Instructor[]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/actividades/${actividad.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a {actividad.nombre}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Divisiones deportivas</h2>
          <p className="text-sm text-muted-foreground">
            Divisiones por edad/género de {actividad.nombre} (RN-ACT-02, SPEC.md §3.17).
          </p>
        </div>
        <DivisionDialog actividadId={actividad.id} />
      </div>

      {actividad.divisiones.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay divisiones cargadas.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Género</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Instructores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actividad.divisiones.map((division) => (
                <TableRow key={division.id}>
                  <TableCell className="font-medium">{division.nombre}</TableCell>
                  <TableCell>
                    {division.edadMinima ?? "—"} a {division.edadMaxima ?? "—"}
                  </TableCell>
                  <TableCell>{division.genero ?? "—"}</TableCell>
                  <TableCell>
                    {division.horarioInicio.slice(0, 5)} a {division.horarioFin.slice(0, 5)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {division.instructores.length === 0
                      ? "Sin asignar"
                      : division.instructores.map((i) => i.instructorApellidoNombres).join(", ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={division.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <DivisionInstructoresDialog
                        actividadId={actividad.id}
                        division={division}
                        instructoresDisponibles={instructoresDisponibles}
                      />
                      <DivisionDialog actividadId={actividad.id} division={division} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Link href={`/actividades/${actividad.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
        Volver al detalle
      </Link>
    </div>
  );
}
