import Link from "next/link";

import { apiFetch } from "@/lib/api";
import type { PaginatedResult, RegistroAcceso, SocioResumen } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
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
import { HistorialFiltro } from "./historial-filtro";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface HistorialPageProps {
  searchParams: Promise<{ page?: string; socioId?: string }>;
}

/**
 * Formatea fecha+hora (`RegistroAcceso.FechaHora`) — a diferencia de
 * `formatDate` (`lib/utils.ts`), acá sí importa la hora: es un registro de
 * portería, no una fecha de vigencia de un documento.
 */
function formatFechaHora(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paginaHref(page: number, socioId?: string): string {
  const params = new URLSearchParams({ page: String(page) });
  if (socioId) params.set("socioId", socioId);
  return `/control-acceso/historial?${params.toString()}`;
}

/**
 * `/control-acceso/historial` (`GET /api/control-acceso/historial?socioId=`,
 * §5). Este módulo no tiene ruta prevista en §7 — layout de tabla paginada
 * calcado del resto del backoffice (mismo patrón que `/pagos`), a diferencia
 * de `/control-acceso` que sí es una pantalla de diseño propio (panel grande
 * de portería, no una tabla).
 */
export default async function ControlAccesoHistorialPage({ searchParams }: HistorialPageProps) {
  const { page: pageParam, socioId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let registros: RegistroAcceso[] = [];
  let totalCount = 0;
  let loadError: string | null = null;

  try {
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (socioId) query.set("socioId", socioId);
    // Igual que `/pagos` y `/cuotas`: se asume que el listado siempre viaja
    // paginado (`{ items, page, pageSize, totalCount }`), pero se chequea
    // defensivamente por si el backend real termina devolviendo un array
    // plano — bug real ya encontrado en la reconciliación de Etapas 3/4.
    const result = await apiFetch<PaginatedResult<RegistroAcceso> | RegistroAcceso[]>(
      `/api/control-acceso/historial?${query.toString()}`
    );
    if (Array.isArray(result)) {
      registros = result;
      totalCount = result.length;
    } else {
      registros = result.items;
      totalCount = result.totalCount;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el historial.";
  }

  const socios = await apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>("/api/socios")
    .then((result) => (Array.isArray(result) ? result : result.items))
    .catch(() => [] as SocioResumen[]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Historial de accesos</h2>
        <p className="text-sm text-muted-foreground">
          Registro de cada intento de ingreso por portería, permitido o denegado (RN-ACC-03).
        </p>
      </div>

      <HistorialFiltro socios={socios} socioId={socioId ?? ""} />

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : registros.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay registros de acceso.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Operador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-medium">
                      {formatFechaHora(registro.fechaHora)}
                    </TableCell>
                    <TableCell>
                      {registro.socioApellidoNombres ?? (
                        <span className="text-muted-foreground">QR no reconocido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={registro.resultado} />
                    </TableCell>
                    <TableCell>{registro.motivoDenegacion ?? "—"}</TableCell>
                    <TableCell>{registro.operadorEmail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Link
                  href={paginaHref(page - 1, socioId)}
                  aria-disabled={page <= 1}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                >
                  Anterior
                </Link>
                <Link
                  href={paginaHref(page + 1, socioId)}
                  aria-disabled={page >= totalPages}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    page >= totalPages && "pointer-events-none opacity-50"
                  )}
                >
                  Siguiente
                </Link>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
