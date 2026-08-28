"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { SocioEstado } from "@/lib/types";
import { darDeBajaSocio, reactivarSocio } from "../actions";

interface SocioDetailActionsProps {
  socioId: string;
  estado: SocioEstado;
}

/**
 * Acciones de estado del socio (RF-SOC-12 bis / RN-SOC-01): dar de baja con
 * motivo obligatorio, o reactivar. Client Component separado del detalle
 * (Server Component) porque necesita estado local para el modal y
 * `useTransition` al llamar la Server Action, siguiendo el mismo patrón que
 * `socio-form.tsx`.
 */
export function SocioDetailActions({ socioId, estado }: SocioDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [bajaOpen, setBajaOpen] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [bajaError, setBajaError] = useState<string | null>(null);

  const [reactivarOpen, setReactivarOpen] = useState(false);
  const [reactivarError, setReactivarError] = useState<string | null>(null);

  function handleDarDeBaja() {
    if (!motivoBaja.trim()) {
      setBajaError("Ingresá el motivo de la baja.");
      return;
    }
    setBajaError(null);
    startTransition(async () => {
      const result = await darDeBajaSocio(socioId, motivoBaja.trim());
      if (!result.success) {
        setBajaError(result.message);
        return;
      }
      setBajaOpen(false);
      setMotivoBaja("");
      router.refresh();
    });
  }

  function handleReactivar() {
    setReactivarError(null);
    startTransition(async () => {
      const result = await reactivarSocio(socioId);
      if (!result.success) {
        setReactivarError(result.message);
        return;
      }
      setReactivarOpen(false);
      router.refresh();
    });
  }

  if (estado === "Activo") {
    return (
      <Dialog open={bajaOpen} onOpenChange={setBajaOpen}>
        <DialogTrigger render={<Button variant="destructive" />}>Dar de baja</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja al socio</DialogTitle>
            <DialogDescription>
              El motivo es obligatorio y queda registrado en el historial del socio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivoBaja">Motivo de la baja</Label>
            <Textarea
              id="motivoBaja"
              rows={3}
              value={motivoBaja}
              onChange={(event) => setMotivoBaja(event.target.value)}
              aria-invalid={!!bajaError}
            />
            {bajaError ? <p className="text-sm text-destructive">{bajaError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBajaOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDarDeBaja} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={reactivarOpen} onOpenChange={setReactivarOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Reactivar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar socio</DialogTitle>
          <DialogDescription>
            El socio vuelve a estado Activo y recupera el acceso a los beneficios del club.
          </DialogDescription>
        </DialogHeader>

        {reactivarError ? (
          <p className="text-sm text-destructive">{reactivarError}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setReactivarOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleReactivar} disabled={isPending}>
            {isPending ? "Guardando..." : "Confirmar reactivación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
