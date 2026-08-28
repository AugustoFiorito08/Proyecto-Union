"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { EstadoReserva } from "@/lib/types";
import { cancelarMiReserva } from "./actions";

interface MiReservaRowActionsProps {
  reservaId: string;
  estado: EstadoReserva;
}

/**
 * Cancelar una reserva propia — solo disponible mientras no esté ya
 * Rechazada/Cancelada (ver decisión en `actions.ts`). Mismo patrón de
 * confirmación en `<Dialog />` que `(dashboard)/reservas/reserva-row-actions.tsx`.
 */
export function MiReservaRowActions({ reservaId, estado }: MiReservaRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const puedeCancelar =
    estado === "PendienteConfirmacion" || estado === "Confirmada" || estado === "Pagada";

  if (!puedeCancelar) return null;

  function handleCancelar() {
    setError(null);
    startTransition(async () => {
      const result = await cancelarMiReserva(reservaId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Cancelar
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              Si la reserva estaba Pagada, aplica la política de reembolso del espacio
              (RN-RES-01) y el reembolso lo gestiona el club de forma manual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelar} disabled={isPending}>
              {isPending ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
