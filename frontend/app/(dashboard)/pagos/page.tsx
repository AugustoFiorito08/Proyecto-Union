import Link from "next/link";
import { Download } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type {
  ConceptoIngresoLibre,
  Cuota,
  Pago,
  PaginatedResult,
  Reserva,
  SocioResumen,
} from "@/lib/types";

const DIALOG_PAGE_SIZE = 200;
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
import { cn, formatDate } from "@/lib/utils";
import { RegistrarPagoDialog } from "./registrar-pago-dialog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PagosPageProps {
  searchParams: Promise<{ page?: string }>;
}

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

/**
 * `/pagos` (SPEC.md §7.1: "Pagos — vista global, registrar pago manual"; §5
 * `GET/POST /api/pagos`). Trae, además del listado, los datos de soporte que
 * necesita `<RegistrarPagoDialog />` (socios, cuotas, reservas, conceptos) —
 * mismo criterio que `(dashboard)/reservas/nueva/page.tsx` trayendo
 * `espacios`/`socios` para el form. `page`/`pageSize` sí se usan acá (a
 * diferencia de otros listados de Etapas 1-2, que tratan la respuesta como
 * array simple): es el único listado de todo el frontend con paginación real
 * pedida explícitamente para esta pantalla.
 */
export default async function PagosPage({ searchParams }: PagosPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let pagos: Pago[] = [];
  let totalCount = 0;
  let loadError: string | null = null;

  try {
    const result = await apiFetch<PaginatedResult<Pago> | Pago[]>(
      `/api/pagos?page=${page}&pageSize=${PAGE_SIZE}`
    );
    if (Array.isArray(result)) {
      pagos = result;
      totalCount = result.length;
    } else {
      pagos = result.items;
      totalCount = result.totalCount;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  const [socios, cuotas, reservas, conceptos] = await Promise.all([
    apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>("/api/socios")
      .then((result) => (Array.isArray(result) ? result : result.items))
      .catch(() => [] as SocioResumen[]),
    // `GET /api/cuotas` siempre devuelve `PagedResult<CuotaResponse>` (nunca
    // un array plano, confirmado contra `CuotasController.Listar`) — pageSize
    // alto para que el dialog tenga todas las cuotas pendientes disponibles.
    apiFetch<PaginatedResult<Cuota>>(`/api/cuotas?pageSize=${DIALOG_PAGE_SIZE}`)
      .then((result) => result.items)
      .catch(() => [] as Cuota[]),
    // Mismo caso que `/api/cuotas`: `ReservasController.Listar` devuelve
    // `PagedResult<ReservaResponse>`, nunca un array plano — bug real
    // encontrado en la reconciliación de Etapa 3 (`reservas.filter is not a
    // function` en runtime, invisible a `npm run build`/lint).
    apiFetch<PaginatedResult<Reserva>>(`/api/reservas?pageSize=${DIALOG_PAGE_SIZE}`)
      .then((result) => result.items)
      .catch(() => [] as Reserva[]),
    apiFetch<ConceptoIngresoLibre[]>("/api/configuracion/conceptos-ingreso-libre").catch(
      () => [] as ConceptoIngresoLibre[]
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pagos</h2>
          <p className="text-sm text-muted-foreground">
            Listado global de pagos registrados (manuales y de Mercado Pago).
          </p>
        </div>
        <RegistrarPagoDialog
          socios={socios}
          cuotas={cuotas}
          reservas={reservas}
          conceptos={conceptos}
        />
      </div>

      {loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : pagos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          No hay pagos registrados.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Medio de pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="font-medium">{formatDate(pago.fecha)}</TableCell>
                    <TableCell>{pago.concepto}</TableCell>
                    <TableCell>{pago.socioApellidoNombres ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{currency(pago.importe)}</TableCell>
                    <TableCell>{pago.medioPago}</TableCell>
                    <TableCell>
                      <StatusBadge status={pago.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/pagos/${pago.id}/comprobante`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Download className="size-4" aria-hidden="true" />
                        PDF
                      </a>
                    </TableCell>
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
                  href={`/pagos?page=${page - 1}`}
                  aria-disabled={page <= 1}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                >
                  Anterior
                </Link>
                <Link
                  href={`/pagos?page=${page + 1}`}
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
