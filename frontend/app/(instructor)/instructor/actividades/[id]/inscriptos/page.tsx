import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { ActividadInstructorPortal, InscriptoActividad } from "@/lib/types";
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
 * Inscriptos de una actividad propia (SPEC.md §7.1: `/instructor/actividades/
 * [id]/inscriptos` — se usa la ruta tal como la define §7.1, en vez de
 * `/instructor/actividades/[id]` mencionada de forma abreviada en el
 * encargo de esta parte, para no crear dos convenciones de URL distintas
 * dentro del mismo route group). Solo lectura, sin acciones de
 * edición/baja de inscripción (matriz §2.2: Instructor tiene `L (propias,
 * sin editar)` sobre Inscripciones).
 *
 * `GET /api/instructor/actividades/{id}/inscriptos` reutiliza el DTO
 * `InscripcionResponse` (mismo shape que el backoffice) — sin DNI del socio.
 * SPEC.md §5 no define un endpoint aparte para el nombre/datos de la
 * actividad en el encabezado, así que se busca en el listado de
 * `GET /api/instructor/actividades` (que trae una fila por división propia).
 */
interface InstructorInscriptosPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorInscriptosPage({
  params,
}: InstructorInscriptosPageProps) {
  const { id } = await params;

  const [actividadesResult, inscriptosResult] = await Promise.allSettled([
    apiFetch<ActividadInstructorPortal[]>("/api/instructor/actividades"),
    apiFetch<InscriptoActividad[]>(`/api/instructor/actividades/${id}/inscriptos`),
  ]);

  const actividades = actividadesResult.status === "fulfilled" ? actividadesResult.value : [];
  const actividad = actividades.find((item) => item.id === id);

  let inscriptos: InscriptoActividad[] = [];
  let loadError: string | null = null;
  if (inscriptosResult.status === "fulfilled") {
    inscriptos = inscriptosResult.value;
  } else {
    const error = inscriptosResult.reason;
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/instructor/actividades"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Mis actividades
        </Link>
        <h2 className="text-xl font-semibold">{actividad?.nombre ?? "Inscriptos"}</h2>
        {actividad ? (
          <p className="text-sm text-muted-foreground">
            {actividad.dias ?? "—"} · {actividad.horarioInicio.slice(0, 5)}-
            {actividad.horarioFin.slice(0, 5)} · {actividad.cupoOcupado} /{" "}
            {actividad.cupoMaximo} inscriptos
          </p>
        ) : null}
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : inscriptos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay socios inscriptos en esta actividad.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>División</TableHead>
                <TableHead>Fecha de inscripción</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscriptos.map((inscripto) => (
                <TableRow key={inscripto.id}>
                  <TableCell className="font-medium">{inscripto.socioApellidoNombres}</TableCell>
                  <TableCell>{inscripto.divisionDeportivaNombre ?? "—"}</TableCell>
                  <TableCell>
                    {new Date(inscripto.fechaInscripcion).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inscripto.estado} />
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
