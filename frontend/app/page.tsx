import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { ConfiguracionPublica } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Landing pública (SPEC.md §7.1) — esta es la etapa que reemplaza el
 * placeholder de Etapa 0 ("el contenido real se construye en una etapa
 * posterior — esta es esa etapa"). Consume `GET /api/configuracion/publica`
 * ([NUEVO-SPEC-UI], §5 "Configuración" + `lib/types.ts` `ConfiguracionPublica`
 * — sin sesión, subconjunto de `ConfiguracionGeneral` sin datos financieros/
 * de acceso ni `cuit`). Defensivo a propósito: si el SuperAdmin nunca cargó
 * estos datos institucionales, o el fetch falla por cualquier motivo, la
 * landing igual se muestra completa — la sección institucional simplemente
 * no aparece, nunca rompe la página pública.
 */
export default async function Home() {
  const configuracion = await apiFetch<ConfiguracionPublica>("/api/configuracion/publica").catch(
    () => null
  );

  const tieneDatosInstitucionales =
    configuracion &&
    (configuracion.direccion ||
      configuracion.telefono ||
      configuracion.emailContacto ||
      configuracion.horariosFuncionamiento);

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {configuracion?.nombreClub || "Proyecto Unión"}
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Sistema de gestión del Club Atlético Unión (CAU): socios, actividades, reservas de
          espacios y pagos, todo en un mismo lugar.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/solicitud-membresia" className={cn(buttonVariants({ size: "lg" }))}>
          Sumate al club
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Iniciar sesión
        </Link>
      </div>

      {tieneDatosInstitucionales ? (
        <Card className="w-full max-w-lg text-left">
          <CardContent className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
            {configuracion.direccion ? (
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dirección</p>
                  <p className="text-sm">{configuracion.direccion}</p>
                </div>
              </div>
            ) : null}
            {configuracion.telefono ? (
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-sm">{configuracion.telefono}</p>
                </div>
              </div>
            ) : null}
            {configuracion.emailContacto ? (
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{configuracion.emailContacto}</p>
                </div>
              </div>
            ) : null}
            {configuracion.horariosFuncionamiento ? (
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Horarios</p>
                  <p className="text-sm">{configuracion.horariosFuncionamiento}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
