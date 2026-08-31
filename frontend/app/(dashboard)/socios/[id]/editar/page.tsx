import { notFound } from "next/navigation";

import { apiFetch, ApiError } from "@/lib/api";
import type { Categoria, CoberturaMedica, Socio } from "@/lib/types";
import { SocioForm } from "../../socio-form";

export const dynamic = "force-dynamic";

interface EditarSocioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarSocioPage({ params }: EditarSocioPageProps) {
  const { id } = await params;

  let socio: Socio;
  try {
    socio = await apiFetch<Socio>(`/api/socios/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const [categorias, coberturas] = await Promise.all([
    apiFetch<Categoria[]>("/api/configuracion/categorias").catch(() => []),
    apiFetch<CoberturaMedica[]>("/api/configuracion/coberturas-medicas").catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Editar socio</h2>
        <p className="mt-0.5 text-muted-foreground">
          {socio.apellido}, {socio.nombres} — N° {socio.numeroSocio}
        </p>
      </div>

      <SocioForm categorias={categorias} coberturas={coberturas} socio={socio} />
    </div>
  );
}
