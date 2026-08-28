import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { Amenity, Espacio } from "@/lib/types";
import { EspacioForm } from "../../espacio-form";

export const dynamic = "force-dynamic";

interface EditarEspacioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarEspacioPage({ params }: EditarEspacioPageProps) {
  const { id } = await params;

  let espacio: Espacio;
  try {
    espacio = await apiFetch<Espacio>(`/api/espacios/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const amenitiesDisponibles = await apiFetch<Amenity[]>("/api/configuracion/amenities").catch(
    () => []
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Editar espacio — {espacio.nombre}</h2>
        <p className="text-sm text-muted-foreground">Actualizá los datos del espacio.</p>
      </div>

      <EspacioForm amenitiesDisponibles={amenitiesDisponibles} espacio={espacio} />
    </div>
  );
}
