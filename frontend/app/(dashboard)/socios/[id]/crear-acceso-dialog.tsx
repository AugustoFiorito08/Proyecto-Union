"use client";

import { useState, useTransition } from "react";

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

import { crearAccesoSocio } from "../actions";

interface CrearAccesoDialogProps {
  socioId: string;
}

/**
 * Otorga acceso al Portal del Socio (prerrequisito de Etapa 2, no autogestión
 * — ver `actions.ts`). La contraseña temporal se muestra una única vez acá;
 * TODO(Etapa 4): enviarla por email en vez de mostrarla en pantalla, mismo
 * pendiente que ya tienen `AuthController.ForgotPassword` e Instructores.
 */
export function CrearAccesoDialog({ socioId }: CrearAccesoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);

  function handleCrearAcceso() {
    setError(null);
    startTransition(async () => {
      const result = await crearAccesoSocio(socioId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setPasswordTemporal(result.data.passwordTemporal);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setError(null);
          setPasswordTemporal(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Crear acceso al portal</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceso al Portal del Socio</DialogTitle>
          <DialogDescription>
            Crea una cuenta de login para que el socio pueda entrar a /mi-cuenta.
          </DialogDescription>
        </DialogHeader>

        {passwordTemporal ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-sm">
              Cuenta creada. Contraseña temporal (comunicala manualmente, no se vuelve a mostrar):
            </p>
            <p className="font-mono text-sm font-semibold">{passwordTemporal}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Se genera una contraseña temporal que tenés que comunicarle al socio vos mismo — el
            envío automático por email llega en Etapa 4.
          </p>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          {!passwordTemporal ? (
            <Button onClick={handleCrearAcceso} disabled={isPending}>
              {isPending ? "Creando..." : "Crear acceso"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
