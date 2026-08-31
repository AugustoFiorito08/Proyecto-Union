import Link from "next/link";
import { Users } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { ActividadInstructorPortal } from "@/lib/types";
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

/**
 * "Mis actividades asignadas" (SPEC.md §7.1, `GET /api/instructor/actividades`
 * — matriz §2.2: Instructor tiene `L (propias)` sobre Actividades, sin
 * acciones de alta/edición). Shape real: `ActividadInstructorPortalResponse`
 * (propio del mini-portal, no `ActividadResumen` del backoffice) — devuelve
 * una fila por Actividad/División donde el instructor está asignado, así que
 * una misma actividad con varias divisiones propias puede aparecer más de
 * una vez, cada una con su `divisionDeportivaId`.
 */
export default async function InstructorActividadesPage() {
  let actividades: ActividadInstructorPortal[] = [];
  let loadError: string | null = null;

  try {
    actividades = await apiFetch<ActividadInstructorPortal[]>("/api/instructor/actividades");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Mis actividades</h2>
        <p className="mt-0.5 text-muted-foreground">
          Actividades y divisiones deportivas en las que estás asignado como instructor.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : actividades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No tenés actividades asignadas todavía.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>División</TableHead>
                <TableHead>Días y horario</TableHead>
                <TableHead>Cupo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Inscriptos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actividades.map((actividad) => (
                <TableRow key={`${actividad.id}-${actividad.divisionDeportivaId ?? "sin-division"}`}>
                  <TableCell className="font-medium">{actividad.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {actividad.divisionDeportivaNombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {actividad.dias ?? "—"} · {actividad.horarioInicio.slice(0, 5)}-
                    {actividad.horarioFin.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {actividad.cupoOcupado} / {actividad.cupoMaximo}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={actividad.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/instructor/actividades/${actividad.id}/inscriptos`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Users className="size-4" aria-hidden="true" />
                      Ver inscriptos
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
