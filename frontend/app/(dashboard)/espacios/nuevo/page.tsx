import { apiFetch } from "@/lib/api";
import type { Amenity } from "@/lib/types";
import { EspacioForm } from "../espacio-form";

export const dynamic = "force-dynamic";

export default async function NuevoEspacioPage() {
  const amenitiesDisponibles = await apiFetch<Amenity[]>("/api/configuracion/amenities").catch(
    () => []
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nuevo espacio</h2>
        <p className="text-sm text-muted-foreground">
          Completá los datos para dar de alta un nuevo espacio reservable.
        </p>
      </div>

      <EspacioForm amenitiesDisponibles={amenitiesDisponibles} />
    </div>
  );
}
