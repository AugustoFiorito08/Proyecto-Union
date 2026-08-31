import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { GrupoFamiliarResumen, PaginatedResult } from "@/lib/types";
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

interface GruposFamiliaresPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function GruposFamiliaresPage({
  searchParams,
}: GruposFamiliaresPageProps) {
  const { q } = await searchParams;

  let grupos: GrupoFamiliarResumen[] = [];
  let loadError: string | null = null;

  try {
    // El backend filtra por `nombre` (nombre O número de grupo) — no tiene
    // un parámetro de búsqueda libre `q`.
    const query = q ? `?nombre=${encodeURIComponent(q)}` : "";
    const result = await apiFetch<
      PaginatedResult<GrupoFamiliarResumen> | GrupoFamiliarResumen[]
    >(`/api/grupos-familiares${query}`);
    grupos = Array.isArray(result) ? result : result.items;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Grupos Familiares</h2>
          <p className="mt-0.5 text-muted-foreground">
            {loadError
              ? "Titulares, integrantes y estado de los grupos familiares."
              : `${grupos.length} ${grupos.length === 1 ? "grupo familiar" : "grupos familiares"}.`}
          </p>
        </div>
        <Link href="/grupos-familiares/nuevo" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo grupo familiar
        </Link>
      </div>

      <form className="flex max-w-sm items-center gap-2" action="/grupos-familiares">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por número, nombre o titular..."
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : grupos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          No se encontraron grupos familiares.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° grupo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Integrantes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map((grupo) => (
                <TableRow key={grupo.id}>
                  <TableCell className="font-medium">{grupo.numeroGrupo}</TableCell>
                  <TableCell>{grupo.nombre}</TableCell>
                  <TableCell>{grupo.titularApellidoNombres}</TableCell>
                  <TableCell>{grupo.tipo}</TableCell>
                  <TableCell>{grupo.integrantes.length}</TableCell>
                  <TableCell>
                    <StatusBadge status={grupo.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/grupos-familiares/${grupo.id}/editar`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Editar
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
