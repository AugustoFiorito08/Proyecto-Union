import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import type { ComunicacionDestinatario, EstadoComunicacion } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface TrazabilidadPageProps {
  params: Promise<{ id: string }>;
}

/**
 * `ComunicacionTrazabilidadResponse` real: `{ comunicacionId, asunto, estado,
 * destinatarios }` — un objeto, no un array ni un `PagedResult`. No existe un
 * `GET /api/comunicaciones/{id}` singular en el backend real (no estaba en
 * el §5 original), así que `asunto`/`estado` salen de acá directamente, sin
 * una segunda llamada.
 */
interface ComunicacionTrazabilidadResponse {
  comunicacionId: string;
  asunto: string;
  estado: EstadoComunicacion;
  destinatarios: ComunicacionDestinatario[];
}

/**
 * `/comunicaciones/[id]/trazabilidad` (SPEC.md §5
 * `GET /api/comunicaciones/{id}/trazabilidad`, §4.2 `ComunicacionDestinatario`).
 * Fila por destinatario/canal — Email y WhatsApp muestran fecha de envío,
 * Novedad además puede traer fecha de lectura (in-app, RF-COM-36).
 */
export default async function TrazabilidadPage({ params }: TrazabilidadPageProps) {
  const { id } = await params;

  let asunto = "";
  let destinatarios: ComunicacionDestinatario[] = [];
  let loadError: string | null = null;
  try {
    const trazabilidad = await apiFetch<ComunicacionTrazabilidadResponse>(
      `/api/comunicaciones/${id}/trazabilidad`
    );
    asunto = trazabilidad.asunto;
    destinatarios = trazabilidad.destinatarios;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    loadError = error instanceof Error ? error.message : "No se pudo cargar la trazabilidad.";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/comunicaciones"
          className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Volver a Comunicaciones
        </Link>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Trazabilidad — {asunto}</h2>
        <p className="mt-0.5 text-muted-foreground">
          Estado de envío y lectura por destinatario y canal.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : destinatarios.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          Todavía no hay destinatarios registrados para esta comunicación.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatario</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado de envío</TableHead>
                <TableHead>Fecha de envío</TableHead>
                <TableHead>Fecha de lectura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinatarios.map((destinatario) => (
                <TableRow key={destinatario.id}>
                  <TableCell className="font-medium">
                    {destinatario.socioNombre ?? "—"}
                  </TableCell>
                  <TableCell>{destinatario.canal}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={destinatario.estadoEnvio} />
                      {destinatario.motivoFallo ? (
                        <span className="text-xs text-muted-foreground">
                          {destinatario.motivoFallo}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(destinatario.fechaEnvio)}</TableCell>
                  <TableCell>{formatDate(destinatario.fechaLectura)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
