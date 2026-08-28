"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ConsultaSocio } from "@/lib/types";
import { responderConsulta } from "./actions";

interface ResponderConsultaDialogProps {
  consulta: ConsultaSocio;
}

/**
 * "Responder" una `ConsultaSocio` (`PUT /api/consultas/{id}/responder`,
 * SPEC.md §5). Ya respondidas se pueden reabrir/corregir la respuesta (el
 * backend decide si lo permite u obliga a Cerrada — no se bloquea del lado
 * del frontend).
 */
export function ResponderConsultaDialog({ consulta }: ResponderConsultaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [respuesta, setRespuesta] = useState(consulta.respuesta ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!respuesta.trim()) {
      setError("Escribí una respuesta.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await responderConsulta(consulta.id, { respuesta: respuesta.trim() });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {consulta.estado === "Pendiente" ? "Responder" : "Ver respuesta"}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{consulta.asunto}</DialogTitle>
          <DialogDescription>
            {consulta.socioNombre} · {consulta.area}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            {consulta.detalle}
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="respuesta">Respuesta</Label>
            <Textarea
              id="respuesta"
              rows={5}
              value={respuesta}
              onChange={(event) => setRespuesta(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : "Enviar respuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
