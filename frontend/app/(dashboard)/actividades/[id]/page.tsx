import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { apiFetch, apiFetchList, ApiError } from "@/lib/api";
import type { Actividad, Instructor } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { InstructoresManager } from "./instructores-manager";
import { ActividadEstadoActions } from "./actividad-estado-actions";

export const dynamic = "force-dynamic";

interface ActividadDetallePageProps {
  params: Promise<{ id: string }>;
}

interface CampoProps {
  label: string;
  value: React.ReactNode;
}

function Campo({ label, value }: CampoProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

export default async function ActividadDetallePage({ params }: ActividadDetallePageProps) {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{actividad.categoriaNombre}</p>
          <h2 className="font-heading text-2xl font-bold tracking-tight">{actividad.nombre}</h2>
          <div className="mt-1">
            <StatusBadge status={actividad.estado} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/actividades/${actividad.id}/editar`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Link>
          <Link
            href={`/actividades/${actividad.id}/divisiones`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Divisiones ({actividad.divisiones.length})
          </Link>
          <ActividadEstadoActions actividadId={actividad.id} estado={actividad.estado} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo label="Descripción" value={actividad.descripcion} />
          <Campo label="Espacio" value={actividad.espacioNombre} />
          <Campo
            label="Precio"
            value={
              actividad.precio != null
                ? new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  }).format(actividad.precio)
                : "Sin costo adicional"
            }
          />
          <Campo label="Modalidad de inscripción" value={actividad.modalidadInscripcion} />
          <Campo label="Cupo" value={`${actividad.cupoOcupado} / ${actividad.cupoMaximo}`} />
          <Campo label="Cupo mínimo" value={actividad.cupoMinimo} />
          <Campo label="Días" value={actividad.dias} />
          <Campo
            label="Horario"
            value={`${actividad.horarioInicio.slice(0, 5)} a ${actividad.horarioFin.slice(0, 5)}`}
          />
          <Campo label="Duración" value={`${actividad.duracion} min`} />
        </CardContent>
      </Card>

      <InstructoresManager
        actividadId={actividad.id}
        instructoresAsignadosIds={actividad.instructores.map((i) => i.instructorId)}
        instructoresDisponibles={instructoresDisponibles}
      />

      <Card>
        <CardHeader>
          <CardTitle>Divisiones deportivas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actividad.divisiones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta actividad no tiene divisiones cargadas.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {actividad.divisiones.map((division) => (
                <li key={division.id} className="flex items-center justify-between">
                  <span>{division.nombre}</span>
                  <StatusBadge status={division.estado} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/actividades/${actividad.id}/divisiones`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Gestionar divisiones
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
