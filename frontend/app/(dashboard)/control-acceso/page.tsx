import Link from "next/link";
import { History } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ControlAccesoScreen } from "./control-acceso-screen";

export const dynamic = "force-dynamic";

/**
 * `/control-acceso` — pantalla de portería (SPEC.md §3.1 RN-ACC-02 a 05, §5
 * "Control de Acceso"). Este módulo no tiene ruta prevista en §7 (nunca pasó
 * por la auditoría de Figma): la pantalla se diseñó desde cero, priorizando
 * que un operador de portería la pueda leer de lejos (panel de resultado
 * grande, sin tabla ni densidad de información) en vez de replicar el layout
 * denso del resto del backoffice. No trae datos del backend al cargar — toda
 * la interacción pasa por `<ControlAccesoScreen />` (client component) contra
 * la Server Action `validarAcceso`, una llamada por cada escaneo.
 */
export default function ControlAccesoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Control de acceso</h2>
          <p className="mt-0.5 text-muted-foreground">
            Escaneá el QR del carnet para validar el ingreso del socio.
          </p>
        </div>
        <Link href="/control-acceso/historial" className={cn(buttonVariants({ variant: "outline" }))}>
          <History className="size-4" aria-hidden="true" />
          Ver historial
        </Link>
      </div>

      <ControlAccesoScreen />
    </div>
  );
}
