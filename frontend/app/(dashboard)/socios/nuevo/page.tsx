import { apiFetch } from "@/lib/api";
import type { Categoria, CoberturaMedica } from "@/lib/types";
import { SocioForm } from "../socio-form";

export const dynamic = "force-dynamic";

export default async function NuevoSocioPage() {
  const [categorias, coberturas] = await Promise.all([
    apiFetch<Categoria[]>("/api/configuracion/categorias").catch(() => []),
    apiFetch<CoberturaMedica[]>("/api/configuracion/coberturas-medicas").catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nuevo socio</h2>
        <p className="text-sm text-muted-foreground">
          Completá los datos para dar de alta un nuevo socio.
        </p>
      </div>

      <SocioForm categorias={categorias} coberturas={coberturas} />
    </div>
  );
}
