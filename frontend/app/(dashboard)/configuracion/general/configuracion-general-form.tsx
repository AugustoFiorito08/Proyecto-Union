"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { ConfiguracionGeneral, TipoTarifaFamiliar } from "@/lib/types";
import { actualizarConfiguracionGeneral } from "./actions";

const TIPOS_TARIFA_FAMILIAR: { value: TipoTarifaFamiliar; label: string }[] = [
  { value: "TarifaPlanaGrupo", label: "Tarifa plana por grupo" },
  { value: "SumaCategoriasIndividuales", label: "Suma de categorías individuales" },
];

const configuracionSchema = z.object({
  maximaDeudaEnMeses: z
    .number({ error: "Ingresá la máxima deuda en meses." })
    .int("Tiene que ser un número entero.")
    .min(1, "Tiene que ser al menos 1 mes."),
  tipoTarifaFamiliar: z.enum(
    ["TarifaPlanaGrupo", "SumaCategoriasIndividuales"] as [TipoTarifaFamiliar, ...TipoTarifaFamiliar[]],
    { message: "Seleccioná el modo de cálculo." }
  ),
  tarifaPlanaGrupoImporte: z.number().optional(),
  toleranciaAccesoDiasCuotaVencida: z
    .number({ error: "Ingresá la tolerancia en días." })
    .int("Tiene que ser un número entero.")
    .min(0, "No puede ser negativo."),
});

type ConfiguracionFormValues = z.infer<typeof configuracionSchema>;

interface ConfiguracionGeneralFormProps {
  configuracion: ConfiguracionGeneral | null;
}

/**
 * Form de `/configuracion/general` (RN-FIN-02 §3.2: `MaximaDeudaEnMeses`,
 * base del job diario de suspensión automática por mora; RN-FIN-03 §3.5:
 * `TipoTarifaFamiliar` + `TarifaPlanaGrupoImporte`, solo habilitado/visible
 * cuando el modo elegido es tarifa plana).
 */
export function ConfiguracionGeneralForm({ configuracion }: ConfiguracionGeneralFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ConfiguracionFormValues>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: {
      maximaDeudaEnMeses: configuracion?.maximaDeudaEnMeses ?? 2,
      tipoTarifaFamiliar: configuracion?.tipoTarifaFamiliar ?? "TarifaPlanaGrupo",
      tarifaPlanaGrupoImporte: configuracion?.tarifaPlanaGrupoImporte ?? undefined,
      toleranciaAccesoDiasCuotaVencida: configuracion?.toleranciaAccesoDiasCuotaVencida ?? 0,
    },
  });

  const tipoTarifaFamiliar = useWatch({ control, name: "tipoTarifaFamiliar" });
  const esTarifaPlana = tipoTarifaFamiliar === "TarifaPlanaGrupo";

  function onSubmit(values: ConfiguracionFormValues) {
    setServerError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await actualizarConfiguracionGeneral({
        maximaDeudaEnMeses: values.maximaDeudaEnMeses,
        tipoTarifaFamiliar: values.tipoTarifaFamiliar,
        tarifaPlanaGrupoImporte: esTarifaPlana ? values.tarifaPlanaGrupoImporte : undefined,
        toleranciaAccesoDiasCuotaVencida: values.toleranciaAccesoDiasCuotaVencida,
      });

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          Configuración guardada.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mora y suspensión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="maximaDeudaEnMeses">Máxima deuda en meses</Label>
          <Input
            id="maximaDeudaEnMeses"
            type="number"
            min="1"
            step="1"
            className="max-w-40"
            aria-invalid={!!errors.maximaDeudaEnMeses}
            {...register("maximaDeudaEnMeses", { valueAsNumber: true })}
          />
          {errors.maximaDeudaEnMeses ? (
            <p className="text-sm text-destructive">{errors.maximaDeudaEnMeses.message}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Cuando la mora de un socio supera este número de meses, el job diario lo suspende
            automáticamente (RN-FIN-02). La reactivación tras regularizar el pago no es
            automática: requiere confirmación de un Administrador/Empleado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuota de grupo familiar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipoTarifaFamiliar">Modo de cálculo</Label>
            <Controller
              control={control}
              name="tipoTarifaFamiliar"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipoTarifaFamiliar" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TARIFA_FAMILIAR.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              RN-FIN-03: ambos modos pueden convivir históricamente sobre cuotas ya emitidas — un
              cambio acá solo aplica a partir del próximo período que se genere.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarifaPlanaGrupoImporte">Importe de la tarifa plana por grupo</Label>
            <Input
              id="tarifaPlanaGrupoImporte"
              type="number"
              step="0.01"
              min="0"
              className="max-w-52"
              disabled={!esTarifaPlana}
              {...register("tarifaPlanaGrupoImporte", { valueAsNumber: true })}
            />
            {!esTarifaPlana ? (
              <p className="text-xs text-muted-foreground">
                Solo aplica cuando el modo de cálculo es &quot;Tarifa plana por grupo&quot;.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control de acceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="toleranciaAccesoDiasCuotaVencida">
            Tolerancia de cuota vencida (días)
          </Label>
          <Input
            id="toleranciaAccesoDiasCuotaVencida"
            type="number"
            min="0"
            step="1"
            className="max-w-40"
            aria-invalid={!!errors.toleranciaAccesoDiasCuotaVencida}
            {...register("toleranciaAccesoDiasCuotaVencida", { valueAsNumber: true })}
          />
          {errors.toleranciaAccesoDiasCuotaVencida ? (
            <p className="text-sm text-destructive">
              {errors.toleranciaAccesoDiasCuotaVencida.message}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Cantidad de días después del vencimiento de una cuota durante los cuales el Control
            de Acceso todavía permite el ingreso en portería (RN-ACC-02). Superada la tolerancia,
            el escaneo del carnet se deniega con motivo &quot;Cuota vencida&quot; hasta que el
            socio regularice el pago.
          </p>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
