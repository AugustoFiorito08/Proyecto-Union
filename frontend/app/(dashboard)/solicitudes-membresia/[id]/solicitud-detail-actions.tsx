"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { SolicitudMembresia } from "@/lib/types";
import { aprobarSolicitud, rechazarSolicitud } from "../actions";

interface SolicitudDetailActionsProps {
  solicitud: SolicitudMembresia;
}

/**
 * Botones "Aprobar"/"Rechazar" del detalle de solicitud (RF-SOL-13, §2.2).
 * Se muestran siempre que la solicitud está `Pendiente`, sin ocultarlos por
 * rol: la matriz §2.2 dice que Empleado puede revisar pero NO aprobar/
 * rechazar (eso es exclusivo de Administrador/SuperAdmin), pero `proxy.ts`
 * no filtra por permiso dentro de `(dashboard)` — así que si un Empleado
 * hace clic y el backend devuelve 403, el mensaje real se muestra en el
 * diálogo tal cual (mismo criterio que `configuracion/general`, que hace
 * exactamente esto para las acciones exclusivas de SuperAdmin).
 *
 * `POST .../aprobar` NO acepta body (confirmado contra el controller real):
 * el backend resuelve la categoría del nuevo Socio solo (usa
 * `categoriaPretendidaId` de la solicitud, o cae a la primera Categoría
 * Activa si vino null) — no hay selector de categoría acá, sería un campo
 * que el backend nunca leería.
 */
export function SolicitudDetailActions({ solicitud }: SolicitudDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [aprobarOpen, setAprobarOpen] = useState(false);
  const [aprobarError, setAprobarError] = useState<string | null>(null);

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [rechazarError, setRechazarError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  if (solicitud.estado !== "Pendiente") {
    return null;
  }

  function handleAprobar() {
    setAprobarError(null);
    startTransition(async () => {
      const result = await aprobarSolicitud(solicitud.id);
      if (!result.success) {
        setAprobarError(result.message);
        return;
      }
      setAprobarOpen(false);
      router.refresh();
    });
  }

  function handleRechazar() {
    if (!motivo.trim()) {
      setRechazarError("Ingresá el motivo del rechazo.");
      return;
    }
    setRechazarError(null);
    startTransition(async () => {
      const result = await rechazarSolicitud(solicitud.id, { motivoRechazo: motivo.trim() });
      if (!result.success) {
        setRechazarError(result.message);
        return;
      }
      setRechazarOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="destructive" onClick={() => setRechazarOpen(true)} disabled={isPending}>
        <X className="size-4" aria-hidden="true" />
        Rechazar
      </Button>
      <Button onClick={() => setAprobarOpen(true)} disabled={isPending}>
        <Check className="size-4" aria-hidden="true" />
        Aprobar
      </Button>

      <Dialog open={aprobarOpen} onOpenChange={setAprobarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar solicitud</DialogTitle>
            <DialogDescription>
              Da de alta un Socio a partir de esta solicitud (RF-SOL-13). Es una acción
              irreversible con impacto en facturación.
            </DialogDescription>
          </DialogHeader>

          {aprobarError ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {aprobarError}
            </p>
          ) : null}

          {solicitud.categoriaPretendidaId ? (
            <p className="text-sm text-muted-foreground">
              Categoría pretendida: <span className="font-medium text-foreground">{solicitud.categoriaPretendidaNombre}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              La solicitud no especificó una categoría pretendida — el backend le asigna
              automáticamente la primera categoría activa del club al aprobar.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleAprobar} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar aprobación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>El motivo es obligatorio y lo va a ver el solicitante.</DialogDescription>
          </DialogHeader>

          {rechazarError ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {rechazarError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="motivoRechazo">Motivo</Label>
            <Textarea
              id="motivoRechazo"
              rows={3}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
