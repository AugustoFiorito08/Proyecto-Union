import { apiFetch } from "@/lib/api";
import type { Categoria } from "@/lib/types";
import { SolicitudMembresiaForm } from "./solicitud-membresia-form";

export const dynamic = "force-dynamic";

/**
 * `/solicitud-membresia` (SPEC.md §7.1: "Formulario de alta de No Socio").
 * Página pública, sin sesión. `GET /api/configuracion/categorias` es CRUD
 * admin en Etapas 3/5 — no hay confirmación de que acepte llamadas sin auth;
 * se intenta igual y, si el backend responde 401/403 (o cualquier otro
 * error), el select de categoría del form queda simplemente sin opciones
 * cargadas en vez de romper la página — es un campo opcional del alta
 * (`CategoriaPretendidaId` nullable), no bloquea la solicitud.
 */
export default async function SolicitudMembresiaPage() {
  const categorias = await apiFetch<Categoria[]>("/api/configuracion/categorias").catch(
    () => [] as Categoria[]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Solicitud de membresía</h1>
          <p className="text-sm text-muted-foreground">
            Completá tus datos para solicitar el ingreso al club. Un administrador va a revisar
            tu solicitud.
          </p>
        </div>
        <SolicitudMembresiaForm categorias={categorias} />
      </div>
    </div>
  );
}
