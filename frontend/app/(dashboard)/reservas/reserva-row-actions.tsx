"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { EstadoReserva } from "@/lib/types";
import { cancelarReserva, confirmarReserva, rechazarReserva } from "./actions";

interface ReservaRowActionsProps {
  reservaId: string;
  estado: EstadoReserva;
}

/**
 * [DECISIÓN — Tarea 3] Acciones de confirmar/rechazar/cancelar inline en la
 * tabla (vía `<DropdownMenu />`), en vez de una página `/reservas/[id]`
 * dedicada — la Tarea 3 dejó esta elección a criterio y no la listó entre
 * las rutas a construir en esta parte.
 */
export function ReservaRowActions({ reservaId, estado }: ReservaRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const [cancelarOpen, setCancelarOpen] = useState(false);

  function handleConfirmar() {
    setError(null);
    startTransition(async () => {
      const result = await confirmarReserva(reservaId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleRechazar() {
    if (!motivoRechazo.trim()) {
      setError("Ingresá el motivo del rechazo.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rechazarReserva(reservaId, motivoRechazo.trim());
      if (!result.success) {
        setError(result.message);
        return;
      }
      setRechazarOpen(false);
      setMotivoRechazo("");
      router.refresh();
    });
  }

  function handleCancelar() {
    setError(null);
    startTransition(async () => {
      const result = await cancelarReserva(reservaId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCancelarOpen(false);
      router.refresh();
    });
  }

  const puedeConfirmar = estado === "PendienteConfirmacion";
  const puedeRechazar = estado === "PendienteConfirmacion";
  const puedeCancelar = estado === "Confirmada" || estado === "Pagada";

  if (!puedeConfirmar && !puedeRechazar && !puedeCancelar) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {puedeConfirmar ? (
            <DropdownMenuItem onClick={handleConfirmar} disabled={isPending}>
              Confirmar
            </DropdownMenuItem>
          ) : null}
          {puedeRechazar ? (
            <DropdownMenuItem onClick={() => setRechazarOpen(true)} disabled={isPending}>
              Rechazar
            </DropdownMenuItem>
          ) : null}
          {puedeCancelar ? (
            <DropdownMenuItem onClick={() => setCancelarOpen(true)} disabled={isPending}>
              Cancelar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar reserva</DialogTitle>
            <DialogDescription>El motivo es obligatorio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivoRechazo">Motivo</Label>
            <Textarea
              id="motivoRechazo"
              rows={3}
              value={motivoRechazo}
              onChange={(event) => setMotivoRechazo(event.target.value)}
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

      <Dialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              Si la reserva estaba Pagada y todavía se está dentro del plazo de la política de
              cancelación del espacio, corresponde reembolso (RN-RES-01) — a gestionar
              manualmente desde Finanzas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelarOpen(false)} disabled={isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelar} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
