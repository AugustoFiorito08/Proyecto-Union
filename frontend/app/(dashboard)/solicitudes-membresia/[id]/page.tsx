import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { apiFetch, ApiError, API_BASE_URL } from "@/lib/api";
import type { SolicitudMembresia } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDate } from "@/lib/utils";
import { SolicitudDetailActions } from "./solicitud-detail-actions";
import { ObservacionesForm } from "./observaciones-form";

export const dynamic = "force-dynamic";

interface SolicitudDetallePageProps {
  params: Promise<{ id: string }>;
}

interface CampoProps {
  label: string;
  value: React.ReactNode;
}

function Campo({ label, value }: CampoProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

/**
 * `/solicitudes-membresia/{id}` — detalle admin (§5, RF-SOL-13).
 * `GET /api/solicitudes-membresia/{id}` no estaba en la lista original de
 * endpoints de §5, pero existe en el backend real (confirmado): mismo
 * criterio de hueco cerrado que `GET /api/comunicaciones/{id}` en Etapa 4.
 */
export default async function SolicitudDetallePage({ params }: SolicitudDetallePageProps) {
  const { id } = await params;

  let solicitud: SolicitudMembresia;
  try {
    solicitud = await apiFetch<SolicitudMembresia>(`/api/solicitudes-membresia/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/solicitudes-membresia"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Volver al listado
          </Link>
          <p className="text-sm text-muted-foreground">Solicitud N° {solicitud.numeroSolicitud}</p>
          <h2 className="text-xl font-semibold">
            {solicitud.apellido}, {solicitud.nombre}
          </h2>
          <div className="mt-1">
            <StatusBadge status={solicitud.estado} />
          </div>
        </div>

        <SolicitudDetailActions solicitud={solicitud} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo label="Apellido" value={solicitud.apellido} />
          <Campo label="Nombre" value={solicitud.nombre} />
          <Campo label="DNI" value={solicitud.dni} />
          <Campo label="Fecha de nacimiento" value={formatDate(solicitud.fechaNacimiento)} />
          <Campo label="Género" value={solicitud.genero} />
          <Campo label="Categoría pretendida" value={solicitud.categoriaPretendidaNombre} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo label="Email" value={solicitud.email} />
          <Campo label="Teléfono" value={solicitud.telefono} />
          <Campo label="Domicilio" value={solicitud.domicilio} />
          <Campo label="Localidad" value={solicitud.localidad} />
          <Campo label="Provincia" value={solicitud.provincia} />
          <Campo label="Fecha de solicitud" value={formatDate(solicitud.fechaSolicitud)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentación adjunta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {solicitud.documentoIdentidadUrl ? (
            <a
              href={
                solicitud.documentoIdentidadUrl.startsWith("http")
                  ? solicitud.documentoIdentidadUrl
                  : `${API_BASE_URL}${solicitud.documentoIdentidadUrl}`
              }
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <FileText className="size-4" aria-hidden="true" />
              Documento de identidad
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin documento de identidad adjunto.</p>
          )}
          {solicitud.fichaMedicaUrl ? (
            <a
              href={
                solicitud.fichaMedicaUrl.startsWith("http")
                  ? solicitud.fichaMedicaUrl
                  : `${API_BASE_URL}${solicitud.fichaMedicaUrl}`
              }
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <FileText className="size-4" aria-hidden="true" />
              Ficha médica
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin ficha médica adjunta.</p>
          )}
        </CardContent>
      </Card>

      {solicitud.estado === "Rechazada" ? (
        <Card>
          <CardHeader>
            <CardTitle>Motivo del rechazo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{solicitud.motivoRechazo || "No se especificó un motivo."}</p>
          </CardContent>
        </Card>
      ) : null}

      <ObservacionesForm solicitudId={solicitud.id} observaciones={solicitud.observaciones} />
    </div>
  );
}
