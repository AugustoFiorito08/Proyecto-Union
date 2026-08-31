import Link from "next/link";
import { Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { ESTADO_ACTIVIDAD_A_INT } from "@/lib/enums";
import type { ActividadResumen, Categoria, EstadoActividad, PaginatedResult } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
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

const ESTADOS: EstadoActividad[] = ["Activa", "Suspendida", "Finalizada"];

interface ActividadesPageProps {
  searchParams: Promise<{ categoriaId?: string; estado?: string }>;
}

export default async function ActividadesPage({ searchParams }: ActividadesPageProps) {
  const { categoriaId, estado } = await searchParams;

  const categorias = await apiFetch<Categoria[]>("/api/configuracion/categorias").catch(
    () => [] as Categoria[]
  );

  let actividades: ActividadResumen[] = [];
  let loadError: string | null = null;

  try {
    const params = new URLSearchParams();
    if (categoriaId) params.set("categoriaId", categoriaId);
    if (estado && ESTADOS.includes(estado as EstadoActividad)) {
      // El backend espera el filtro `estado` como número (mismo criterio que
      // `?estado=` en `GET /api/socios`, ver `SociosController.cs`).
      params.set("estado", String(ESTADO_ACTIVIDAD_A_INT[estado as EstadoActividad]));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const result = await apiFetch<PaginatedResult<ActividadResumen> | ActividadResumen[]>(
      `/api/actividades${query}`
    );
    actividades = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Actividades</h2>
          <p className="mt-0.5 text-muted-foreground">
            Actividades deportivas y recreativas del club.
          </p>
        </div>
        <Link href="/actividades/nueva" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva actividad
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/actividades">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="categoriaId">
            Categoría
          </label>
          <select
            id="categoriaId"
            name="categoriaId"
            defaultValue={categoriaId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="estado">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : actividades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No se encontraron actividades.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Instructores</TableHead>
                <TableHead>Cupo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actividades.map((actividad) => (
                <TableRow key={actividad.id}>
                  <TableCell className="font-medium">{actividad.nombre}</TableCell>
                  <TableCell>{actividad.categoriaNombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {actividad.instructores.length === 0
                      ? "Sin asignar"
                      : actividad.instructores.map((i) => i.instructorApellidoNombres).join(", ")}
                  </TableCell>
                  <TableCell>
                    {actividad.cupoOcupado} / {actividad.cupoMaximo}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={actividad.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/actividades/${actividad.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Ver
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
