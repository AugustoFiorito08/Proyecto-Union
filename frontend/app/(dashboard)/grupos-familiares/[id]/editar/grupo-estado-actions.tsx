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

import { darDeBajaGrupoFamiliar, reactivarGrupoFamiliar } from "../../actions";

interface GrupoEstadoActionsProps {
  grupoId: string;
  estado: "Activo" | "Inactivo";
}

/** Mismo patrón que `socios/[id]/socio-detail-actions.tsx`, aplicado a Grupo Familiar. */
export function GrupoEstadoActions({ grupoId, estado }: GrupoEstadoActionsProps) {
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
      const result = await darDeBajaGrupoFamiliar(grupoId, motivoBaja.trim());
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
      const result = await reactivarGrupoFamiliar(grupoId);
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
        <DialogTrigger render={<Button variant="destructive" size="sm" />}>
          Dar de baja
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja al grupo familiar</DialogTitle>
            <DialogDescription>El motivo es obligatorio.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivoBajaGrupo">Motivo de la baja</Label>
            <Textarea
              id="motivoBajaGrupo"
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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Reactivar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivar grupo familiar</DialogTitle>
          <DialogDescription>El grupo vuelve a estado Activo.</DialogDescription>
        </DialogHeader>

        {reactivarError ? (
          <p className="text-sm text-destructive">{reactivarError}</p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setReactivarOpen(false)}
            disabled={isPending}
          >
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
