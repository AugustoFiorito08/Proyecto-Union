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
 * — ver `actions.ts`). Etapa 4 cerró el TODO pendiente: la contraseña
 * temporal se envía por email real; solo se muestra en pantalla como
 * fallback si ese envío falla (`passwordEnviadaPorEmail === false`).
 */
export function CrearAccesoDialog({ socioId }: CrearAccesoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    passwordEnviadaPorEmail: boolean;
    passwordTemporal?: string | null;
  } | null>(null);

  function handleCrearAcceso() {
    setError(null);
    startTransition(async () => {
      const result = await crearAccesoSocio(socioId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setResultado(result.data);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setError(null);
          setResultado(null);
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

        {resultado ? (
          resultado.passwordEnviadaPorEmail ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
              <p className="text-sm">
                Cuenta creada. Se envió la contraseña temporal al email del socio.
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
              <p className="text-sm text-destructive">
                Cuenta creada, pero el envío de email falló. Comunicá esta contraseña temporal
                manualmente (no se vuelve a mostrar):
              </p>
              <p className="font-mono text-sm font-semibold">{resultado.passwordTemporal}</p>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Se genera una contraseña temporal y se le envía al socio por email. Si el envío
            falla, se te va a mostrar acá para que se la comuniques vos mismo.
          </p>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          {!resultado ? (
            <Button onClick={handleCrearAcceso} disabled={isPending}>
              {isPending ? "Creando..." : "Crear acceso"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
