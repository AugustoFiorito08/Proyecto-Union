import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil, Wallet } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import type { Socio } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, cn } from "@/lib/utils";
import { SocioDetailActions } from "./socio-detail-actions";
import { CrearAccesoDialog } from "./crear-acceso-dialog";

export const dynamic = "force-dynamic";

interface SocioDetallePageProps {
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

export default async function SocioDetallePage({ params }: SocioDetallePageProps) {
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Socio N° {socio.numeroSocio}</p>
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            {socio.apellido}, {socio.nombres}
          </h2>
          <div className="mt-1">
            <StatusBadge status={socio.estado} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/socios/${socio.id}/carnet`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="size-4" aria-hidden="true" />
            Descargar carnet
          </a>
          <Link
            href={`/socios/${socio.id}/editar`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Link>
          <Link
            href={`/socios/${socio.id}/pagos`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Wallet className="size-4" aria-hidden="true" />
            Pagos y cuotas
          </Link>
          <CrearAccesoDialog socioId={socio.id} />
          <SocioDetailActions socioId={socio.id} estado={socio.estado} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información básica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo label="Apellido" value={socio.apellido} />
          <Campo label="Nombres" value={socio.nombres} />
          <Campo label="DNI" value={socio.dni} />
          <Campo label="CUIL" value={socio.cuil} />
          <Campo label="Fecha de nacimiento" value={formatDate(socio.fechaNacimiento)} />
          <Campo label="Género" value={socio.genero} />
          <Campo label="Nacionalidad" value={socio.nacionalidad} />
          <Campo label="Categoría" value={socio.categoriaNombre} />
          <Campo label="Tipo de pago" value={socio.tipoPago} />
          <Campo label="Modalidad" value={socio.modalidad} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo label="Teléfono" value={socio.telefono} />
          <Campo label="Celular" value={socio.celular} />
          <Campo label="Email" value={socio.email} />
          <Campo label="Domicilio" value={socio.domicilio} />
          <Campo label="Localidad" value={socio.localidad} />
          <Campo label="Provincia" value={socio.provincia} />
          <Campo label="Código postal" value={socio.codigoPostal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ficha médica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {socio.fichaMedicaVigencia ? (
            // Regla transversal (SPEC.md §2.2): sin acceso a la ficha médica
            // completa, el backend solo devuelve el semáforo de vigencia.
            <div className="sm:col-span-2 md:col-span-3">
              <Campo label="Ficha médica" value={<StatusBadge status={socio.fichaMedicaVigencia} />} />
              <p className="mt-1 text-xs text-muted-foreground">
                Tu rol no tiene acceso a los datos clínicos completos de la ficha médica.
              </p>
            </div>
          ) : (
            <>
              <Campo label="Cobertura médica" value={socio.coberturaMedicaNombre} />
              <Campo label="Plan" value={socio.planNombre} />
              <Campo label="Grupo sanguíneo" value={socio.grupoSanguineo} />
              <Campo label="Contacto de emergencia" value={socio.contactoEmergencia} />
              <Campo
                label="Ficha médica — emisión"
                value={formatDate(socio.fichaMedicaFechaEmision)}
              />
              <Campo
                label="Ficha médica — vencimiento"
                value={formatDate(socio.fichaMedicaFechaVencimiento)}
              />
              <div className="space-y-1 sm:col-span-2 md:col-span-3">
                <p className="text-xs font-medium text-muted-foreground">Observaciones médicas</p>
                <p className="text-sm whitespace-pre-wrap">{socio.observacionesMedicas ?? "—"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupo familiar y alta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Campo
            label="Grupo familiar"
            value={
              socio.grupoFamiliarId ? (
                <Link
                  href={`/grupos-familiares/${socio.grupoFamiliarId}/editar`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Ver grupo familiar
                </Link>
              ) : (
                "Sin grupo familiar"
              )
            }
          />
          <Campo label="Parentesco" value={socio.parentesco} />
          <Campo label="Fecha de alta" value={formatDate(socio.fechaAlta)} />
          {socio.fechaBaja ? (
            <>
              <Campo label="Fecha de baja" value={formatDate(socio.fechaBaja)} />
              <Campo label="Motivo de baja" value={socio.motivoBaja} />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
