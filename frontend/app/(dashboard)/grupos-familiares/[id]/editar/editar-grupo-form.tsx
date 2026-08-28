"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { GrupoFamiliar } from "@/lib/types";
import { editarGrupoFamiliar } from "../../actions";

const grupoSchema = z.object({
  nombre: z.string().optional(),
  observaciones: z.string().optional(),
});

type GrupoFormValues = z.infer<typeof grupoSchema>;

interface EditarGrupoFormProps {
  grupo: GrupoFamiliar;
}

export function EditarGrupoForm({ grupo }: EditarGrupoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<GrupoFormValues>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nombre: grupo.nombre ?? "",
      observaciones: grupo.observaciones ?? "",
    },
  });

  function onSubmit(values: GrupoFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await editarGrupoFamiliar(grupo.id, {
        titularSocioId: grupo.titularSocioId,
        nombre: values.nombre || undefined,
        observaciones: values.observaciones || undefined,
      });

      if (!result.success) {
        setServerError(result.message);
        return;
      }

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

      <Card>
        <CardHeader>
          <CardTitle>Datos del grupo familiar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Titular</Label>
            <p className="text-sm">
              {grupo.titularApellidoNombres}{" "}
              <span className="text-muted-foreground">
                — usá &quot;Cambiar titular&quot; abajo para modificarlo.
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input id="nombre" {...register("nombre")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={3} {...register("observaciones")} />
          </div>
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
