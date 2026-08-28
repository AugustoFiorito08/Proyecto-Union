import Link from "next/link";
import { Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Comunicacion, PaginatedResult } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "enviados", label: "Enviados" },
  { value: "borradores", label: "Borradores" },
  { value: "programados", label: "Programados" },
] as const;

type Tab = (typeof TABS)[number]["value"];

async function fetchComunicaciones(tab: Tab): Promise<{
  items: Comunicacion[];
  error: string | null;
}> {
  try {
    const result = await apiFetch<PaginatedResult<Comunicacion> | Comunicacion[]>(
      `/api/comunicaciones?tab=${tab}`
    );
    return { items: Array.isArray(result) ? result : result.items, error: null };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "No se pudo cargar el listado.",
    };
  }
}

function ComunicacionesTable({
  items,
  error,
  tab,
}: {
  items: Comunicacion[];
  error: string | null;
  tab: Tab;
}) {
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        No hay comunicaciones en esta pestaña.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asunto</TableHead>
            <TableHead>Destinatarios</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              {tab === "programados" ? "Programada para" : "Último envío"}
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((comunicacion) => (
            <TableRow key={comunicacion.id}>
              <TableCell className="font-medium">{comunicacion.asunto}</TableCell>
              <TableCell>{comunicacion.cantidadDestinatarios ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge status={comunicacion.estado} />
              </TableCell>
              <TableCell>
                {tab === "programados"
                  ? formatDate(comunicacion.fechaProgramada)
                  : formatDate(comunicacion.fechaUltimoEnvio)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-3 text-sm">
                  {tab === "borradores" || tab === "programados" ? (
                    <Link
                      href={`/comunicaciones/${comunicacion.id}/editar`}
                      className="text-primary hover:underline"
                    >
                      Editar
                    </Link>
                  ) : null}
                  {tab === "enviados" ? (
                    <Link
                      href={`/comunicaciones/${comunicacion.id}/trazabilidad`}
                      className="text-primary hover:underline"
                    >
                      Trazabilidad
                    </Link>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * `/comunicaciones` (SPEC.md §7.1: "Listado — tabs: Enviados / Borradores /
 * Programados"; §5 `GET /api/comunicaciones` "filtro por tab:
 * enviados/borradores/programados"). El filtro viaja literal como `?tab=`
 * (no `?estado=`, a diferencia del resto de listados de Etapas 1-3) — así lo
 * documenta §5 explícitamente. Se traen las 3 pestañas en paralelo (mismo
 * criterio que `<Tabs />` client-side de `/reservas`, que no vuelve a pegarle
 * al backend al cambiar de tab) en vez de un `searchParams.tab` con
 * re-render server-side, porque acá cada tab es una consulta angosta y
 * liviana (filtrada server-side por `tab`), no un listado grande a paginar.
 */
export default async function ComunicacionesPage() {
  const [enviados, borradores, programados] = await Promise.all([
    fetchComunicaciones("enviados"),
    fetchComunicaciones("borradores"),
    fetchComunicaciones("programados"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Comunicaciones</h2>
          <p className="text-sm text-muted-foreground">
            Mensajes institucionales por Email, WhatsApp y Novedades del Portal del Socio.
          </p>
        </div>
        <Link href="/comunicaciones/nueva" className={cn(buttonVariants())}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva comunicación
        </Link>
      </div>

      <Tabs defaultValue="enviados">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="enviados" className="mt-4">
          <ComunicacionesTable items={enviados.items} error={enviados.error} tab="enviados" />
        </TabsContent>
        <TabsContent value="borradores" className="mt-4">
          <ComunicacionesTable
            items={borradores.items}
            error={borradores.error}
            tab="borradores"
          />
        </TabsContent>
        <TabsContent value="programados" className="mt-4">
          <ComunicacionesTable
            items={programados.items}
            error={programados.error}
            tab="programados"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
