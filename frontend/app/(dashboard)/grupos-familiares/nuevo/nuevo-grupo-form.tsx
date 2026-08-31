"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { SocioResumen } from "@/lib/types";
import { crearGrupoFamiliar } from "../actions";

const grupoSchema = z.object({
  titularSocioId: z.string().min(1, "Seleccioná un titular."),
  nombre: z.string().optional(),
  observaciones: z.string().optional(),
});

type GrupoFormValues = z.infer<typeof grupoSchema>;

interface NuevoGrupoFormProps {
  sociosDisponibles: SocioResumen[];
}

export function NuevoGrupoForm({ sociosDisponibles }: NuevoGrupoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GrupoFormValues>({
    resolver: zodResolver(grupoSchema),
    defaultValues: { titularSocioId: "", nombre: "", observaciones: "" },
  });

  function onSubmit(values: GrupoFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await crearGrupoFamiliar({
        titularSocioId: values.titularSocioId,
        nombre: values.nombre || undefined,
        observaciones: values.observaciones || undefined,
      });

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      router.push(`/grupos-familiares/${result.data.id}/editar`);
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos del grupo familiar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="titularSocioId">Titular</Label>
            <Controller
              control={control}
              name="titularSocioId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="titularSocioId"
                    className="w-full"
                    aria-invalid={!!errors.titularSocioId}
                  >
                    <SelectValue placeholder="Seleccioná el socio titular" />
                  </SelectTrigger>
                  <SelectContent>
                    {sociosDisponibles.map((socio) => (
                      <SelectItem key={socio.id} value={socio.id}>
                        {socio.apellido}, {socio.nombres} (DNI {socio.dni})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.titularSocioId ? (
              <p className="text-sm text-destructive">{errors.titularSocioId.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Solo se listan socios que todavía no pertenecen a otro grupo familiar. Los demás
              integrantes (cónyuge, hijos) se agregan después de crear el grupo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del grupo (opcional)</Label>
            <Input id="nombre" {...register("nombre")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={3} {...register("observaciones")} />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Crear grupo familiar"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
