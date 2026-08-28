import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api";
import { getSessionRole } from "@/lib/auth";
import type { SolicitudMembresia } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDate } from "@/lib/utils";
import { SeguimientoIdResolver } from "./seguimiento-id-resolver";

export const dynamic = "force-dynamic";

interface SeguimientoPageProps {
  searchParams: Promise<{ id?: string }>;
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
 * `/solicitud-membresia/seguimiento` (SPEC.md §7.1, `GET
 * /api/solicitudes-membresia/{id}/seguimiento`). Gateada por `proxy.ts` para
 * requerir sesión con rol `NoSocio` — acá solo se repite un chequeo liviano
 * de defensa en profundidad (no redirige, solo evita pegarle a la API con un
 * rol que ya sabemos que no corresponde; `proxy.ts` es la fuente real de
 * autorización de ruta).
 *
 * Resolución del `id` (documentado en el prompt de la tarea, 3 niveles en
 * orden de preferencia):
 * 1. `?id=` en la URL — llega desde el botón "Ver seguimiento" del form de
 *    alta, o de un enlace compartido manualmente.
 * 2. Sin `id`: se intenta `GET /api/me/solicitud-membresia` — variante
 *    [SUPUESTO] que resolvería la solicitud del usuario autenticado desde el
 *    token, mismo criterio que el resto de `/api/me/*` (`GET /api/me/perfil`,
 *    etc.). No está en la lista de endpoints de SPEC.md §5 para este módulo,
 *    así que el intento es defensivo: si el backend responde 404/405 (no
 *    existe), se sigue al paso 3 sin mostrar error.
 * 3. Todavía sin resolver: se delega a `<SeguimientoIdResolver />` (client),
 *    que busca el id en `localStorage` (guardado por el form de alta en el
 *    mismo navegador) y si lo encuentra recarga esta página con `?id=`.
 */
export default async function SeguimientoSolicitudPage({ searchParams }: SeguimientoPageProps) {
  const { id } = await searchParams;

  const rol = await getSessionRole();
  if (rol && rol !== "NoSocio") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Esta página es solo para el seguimiento de una solicitud de membresía.
        </p>
      </div>
    );
  }

  let solicitud: SolicitudMembresia | null = null;
  let loadError: string | null = null;

  if (id) {
    try {
      solicitud = await apiFetch<SolicitudMembresia>(
        `/api/solicitudes-membresia/${id}/seguimiento`
      );
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        loadError = error instanceof Error ? error.message : "No se pudo cargar la solicitud.";
      }
    }
  } else {
    // Paso 2 del comentario de arriba — intento defensivo, sin mostrar error
    // si la variante no existe.
    solicitud = await apiFetch<SolicitudMembresia>("/api/me/solicitud-membresia").catch(
      () => null
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Seguimiento de tu solicitud</h1>
          <p className="text-sm text-muted-foreground">
            Consultá el estado de tu solicitud de membresía al club.
          </p>
        </div>

        {solicitud ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Solicitud N° {solicitud.numeroSolicitud}</CardTitle>
                <StatusBadge status={solicitud.estado} />
              </div>
              <CardDescription>Enviada el {formatDate(solicitud.fechaSolicitud)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nombre" value={`${solicitud.apellido}, ${solicitud.nombre}`} />
                <Campo label="DNI" value={solicitud.dni} />
                <Campo label="Email" value={solicitud.email} />
                <Campo
                  label="Categoría pretendida"
                  value={solicitud.categoriaPretendidaNombre}
                />
              </div>

              {solicitud.estado === "Rechazada" ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p className="font-medium">Motivo del rechazo</p>
                  <p>{solicitud.motivoRechazo || "No se especificó un motivo."}</p>
                </div>
              ) : null}

              {solicitud.estado === "Aprobada" ? (
                <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                  Tu solicitud fue aprobada. Ya sos socio del club — iniciá sesión para acceder a
                  tu portal.
                </div>
              ) : null}

              {solicitud.observaciones ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">Observaciones del club</p>
                  <p className="text-muted-foreground">{solicitud.observaciones}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : loadError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {loadError}
          </p>
        ) : id ? (
          <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            No encontramos ninguna solicitud con ese identificador.
          </p>
        ) : (
          <SeguimientoIdResolver />
        )}

        <div className="text-center">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
