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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Socios</h2>
          <p className="text-sm text-muted-foreground">
            Listado de socios del club.
          </p>
        </div>
        <Link href="/socios/nuevo" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo socio
        </Link>
      </div>

      <form className="flex max-w-sm items-center gap-2" action="/socios">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : socios.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No se encontraron socios.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((socio) => (
                <TableRow key={socio.id}>
                  <TableCell className="font-medium">
                    {socio.apellido}, {socio.nombres}
                  </TableCell>
                  <TableCell>{socio.dni}</TableCell>
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
