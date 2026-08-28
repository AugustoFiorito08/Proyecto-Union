"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { crearConsulta } from "./actions";

const VALORES_INICIALES = { area: "", asunto: "", detalle: "" };

/**
 * Alta de `ConsultaSocio` (`POST /api/me/consultas`, SPEC.md §5). `Area` es
 * texto libre (§4.2 no lo modela como enum), igual que en el backoffice
 * (`ResponderConsultaDialog` la muestra tal cual).
 */
export function NuevaConsultaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(VALORES_INICIALES);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit() {
    if (!values.area.trim() || !values.asunto.trim() || !values.detalle.trim()) {
      setError("Completá área, asunto y detalle.");
      return;
    }
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await crearConsulta({
        area: values.area.trim(),
        asunto: values.asunto.trim(),
        detalle: values.detalle.trim(),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setValues(VALORES_INICIALES);
      setOk(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva consulta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        {ok ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            Tu consulta se envió correctamente.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="area">Área</Label>
          <Input
            id="area"
            placeholder="Ej.: Cuotas, Actividades, Reservas..."
            value={values.area}
            onChange={(event) => setValues((prev) => ({ ...prev, area: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asunto">Asunto</Label>
          <Input
            id="asunto"
            value={values.asunto}
            onChange={(event) => setValues((prev) => ({ ...prev, asunto: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="detalle">Detalle</Label>
          <Textarea
            id="detalle"
            rows={4}
            value={values.detalle}
            onChange={(event) => setValues((prev) => ({ ...prev, detalle: event.target.value }))}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar consulta"}
        </Button>
      </CardFooter>
    </Card>
  );
}
