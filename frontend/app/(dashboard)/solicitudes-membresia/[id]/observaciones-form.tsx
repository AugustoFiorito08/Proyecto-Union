"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { actualizarObservacionesSolicitud } from "../actions";

interface ObservacionesFormProps {
  solicitudId: string;
  observaciones?: string | null;
}

/**
 * Campo de observaciones internas de staff (§2.2: "Empleado puede pre-revisar
 * y adjuntar observaciones a una solicitud de membresía"). Ver el comentario
 * largo en `lib/types.ts` (`SolicitudMembresia.observaciones`) y en
 * `actions.ts` (`actualizarObservacionesSolicitud`): es un campo [SUPUESTO],
 * no está en el modelo de entidad de SPEC.md §4.2. Si el endpoint no existe
 * del lado real, "Guardar observaciones" simplemente muestra el error de la
 * API en vez de romper el resto del detalle — el resto de la pantalla
 * (aprobar/rechazar, datos, adjuntos) sigue funcionando igual.
 */
export function ObservacionesForm({ solicitudId, observaciones }: ObservacionesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await actualizarObservacionesSolicitud(solicitudId, {
        observaciones: value.trim(),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observaciones internas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            Observaciones guardadas.
          </p>
        ) : null}
        <Textarea
          rows={3}
          placeholder="Notas de staff sobre esta solicitud — el solicitante las ve en el seguimiento de su solicitud."
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar observaciones"}
        </Button>
      </CardFooter>
    </Card>
  );
}
