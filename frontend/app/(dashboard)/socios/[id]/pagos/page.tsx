import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import type { Cuota, Pago, PaginatedResult, Socio } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const dynamic = "force-dynamic";

interface SocioPagosPageProps {
  params: Promise<{ id: string }>;
}

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

/**
 * `/socios/[id]/pagos` (SPEC.md §7.1 — ya prevista, nunca construida). Tab
 * de "Pagos y cuotas" del detalle de socio, como página aparte en vez de un
 * `<Tabs />` client-side dentro de `socios/[id]/page.tsx`: ese archivo hoy es
 * 100% Server Component sin estado de cliente, y las dos secciones (cuotas +
 * pagos) ya alcanzan para justificar su propia ruta (mismo criterio que
 * `/actividades/[id]/divisiones`, ruta aparte en vez de tab embebido).
 *
 * `GET /api/cuotas`/`GET /api/pagos` filtrados por `socioId` — confirmado
 * contra `CuotasController`/`PagosController`, mismo criterio que `?nombre=`
 * en `GET /api/socios` (Etapa 1). Ambos devuelven siempre `PagedResult`
 * (nunca un array plano) — a diferencia de `GET /api/me/cuotas`.
 */
export default async function SocioPagosPage({ params }: SocioPagosPageProps) {
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

  const [cuotas, pagos] = await Promise.all([
    apiFetch<PaginatedResult<Cuota>>(`/api/cuotas?socioId=${id}&pageSize=200`)
      .then((result) => result.items)
      .catch(() => [] as Cuota[]),
    apiFetch<PaginatedResult<Pago>>(`/api/pagos?socioId=${id}&pageSize=200`)
      .then((result) => result.items)
      .catch(() => [] as Pago[]),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/socios/${id}`}
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Volver al socio
          </Link>
          <h2 className="text-xl font-semibold">
            Pagos y cuotas — {socio.apellido}, {socio.nombres}
          </h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuotas</CardTitle>
        </CardHeader>
        <CardContent>
          {cuotas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cuotas generadas todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Recargo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuotas.map((cuota) => (
                  <TableRow key={cuota.id}>
                    <TableCell className="font-medium">{cuota.periodo}</TableCell>
                    <TableCell>{formatDate(cuota.fechaVencimiento)}</TableCell>
                    <TableCell className="tabular-nums">{currency(cuota.importe)}</TableCell>
                    <TableCell className="tabular-nums">
                      {cuota.recargoMora ? currency(cuota.recargoMora) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={cuota.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
