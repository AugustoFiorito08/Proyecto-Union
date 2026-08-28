import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { Actividad, Categoria, Espacio } from "@/lib/types";
import { ActividadForm } from "../../actividad-form";

export const dynamic = "force-dynamic";

interface EditarActividadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarActividadPage({ params }: EditarActividadPageProps) {
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

  const [categorias, espacios] = await Promise.all([
    apiFetch<Categoria[]>("/api/configuracion/categorias").catch(() => []),
    apiFetch<Espacio[]>("/api/espacios").catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Editar actividad — {actividad.nombre}</h2>
        <p className="text-sm text-muted-foreground">Actualizá los datos de la actividad.</p>
      </div>

      <ActividadForm categorias={categorias} espacios={espacios} actividad={actividad} />
    </div>
  );
}
