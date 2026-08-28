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
  DialogTrigger,
} from "@/components/ui/dialog";

import type { EstadoActividad } from "@/lib/types";
import { cambiarEstadoActividad, finalizarActividad } from "../actions";

interface ActividadEstadoActionsProps {
  actividadId: string;
  estado: EstadoActividad;
}

export function ActividadEstadoActions({ actividadId, estado }: ActividadEstadoActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [finalizarOpen, setFinalizarOpen] = useState(false);

  function handleToggleEstado(nuevoEstado: EstadoActividad) {
    setError(null);
    startTransition(async () => {
      const result = await cambiarEstadoActividad(actividadId, nuevoEstado);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleFinalizar() {
    setError(null);
    startTransition(async () => {
      const result = await finalizarActividad(actividadId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setFinalizarOpen(false);
      router.refresh();
    });
  }

  if (estado === "Finalizada") {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {estado === "Suspendida" ? (
          <Button size="sm" onClick={() => handleToggleEstado("Activa")} disabled={isPending}>
            {isPending ? "Guardando..." : "Activar"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleEstado("Suspendida")}
            disabled={isPending}
          >
            {isPending ? "Guardando..." : "Suspender"}
          </Button>
        )}

        <Dialog open={finalizarOpen} onOpenChange={setFinalizarOpen}>
          <DialogTrigger render={<Button variant="destructive" size="sm" />}>
            Finalizar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar actividad</DialogTitle>
              <DialogDescription>
                La actividad pasa a estado Finalizada de forma permanente. No se puede reactivar
                desde acá.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setFinalizarOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleFinalizar} disabled={isPending}>
                {isPending ? "Guardando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
