import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { PaginatedResult, SocioResumen } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Iniciales para el avatar del listado: ancla visual para recorrer filas con la vista. */
function iniciales(apellido: string, nombres: string): string {
  return `${apellido.charAt(0)}${nombres.charAt(0)}`.toUpperCase();
}

interface SociosPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SociosPage({ searchParams }: SociosPageProps) {
  const { q } = await searchParams;

  let socios: SocioResumen[] = [];
  let loadError: string | null = null;

  try {
    // El backend filtra por `nombre` (apellido O nombres) — no tiene un
    // parámetro de búsqueda libre `q`.
    const query = q ? `?nombre=${encodeURIComponent(q)}` : "";
    const result = await apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>(
      `/api/socios${query}`
    );
    socios = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  const buscando = Boolean(q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Socios</h2>
          <p className="mt-0.5 text-muted-foreground">
            {loadError
              ? "Listado de socios del club."
              : `${socios.length} ${socios.length === 1 ? "socio" : "socios"}${
                  buscando ? " encontrados" : " en el club"
                }.`}
          </p>
        </div>
        <Link href="/socios/nuevo" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo socio
        </Link>
      </div>

      {/* El campo envía solo con Enter además del botón: buscar es la acción
          más repetida de esta pantalla y obligar a apuntar al botón la frena. */}
      <form className="flex w-full max-w-md items-center gap-2" action="/socios">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o apellido…"
            aria-label="Buscar socios por nombre o apellido"
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="h-11">
          Buscar
        </Button>
      </form>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : socios.length === 0 ? (
        /* Se distingue "la búsqueda no encontró nada" de "todavía no hay
           socios": son dos situaciones distintas y la salida también. */
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <p className="font-medium">
            {buscando ? `No hay socios que coincidan con “${q}”.` : "Todavía no hay socios."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {buscando
              ? "Probá con otro nombre o apellido."
              : "Cuando des de alta al primero, va a aparecer acá."}
          </p>
          {buscando ? (
            <Link
              href="/socios"
              className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
            >
              Ver todos los socios
            </Link>
          ) : (
            <Link href="/socios/nuevo" className={cn(buttonVariants(), "mt-5")}>
              <Plus className="size-4" aria-hidden="true" />
              Dar de alta un socio
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((socio) => (
                <TableRow key={socio.id}>
                  {/* Nombre + número de socio juntos: el número es la identidad
                      del socio dentro del club y el listado no lo mostraba. */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
                        aria-hidden="true"
                      >
                        {iniciales(socio.apellido, socio.nombres)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/socios/${socio.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {socio.apellido}, {socio.nombres}
                        </Link>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          N° {socio.numeroSocio}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{socio.dni}</TableCell>
                  <TableCell>{socio.categoriaNombre}</TableCell>
                  <TableCell>
                    <StatusBadge status={socio.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/socios/${socio.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/socios/${socio.id}/editar`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Editar
                      </Link>
                    </div>
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
