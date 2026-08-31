"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { Instructor } from "@/lib/types";
import { editarInstructor } from "../../actions";

const editarInstructorSchema = z.object({
  apellido: z.string().min(1, "Ingresá el apellido."),
  nombres: z.string().min(1, "Ingresá los nombres."),
  telefono: z.string().optional(),
  email: z.string().min(1, "Ingresá el email.").email("Ingresá un email válido."),
  especialidad: z.string().optional(),
});

type EditarInstructorFormValues = z.infer<typeof editarInstructorSchema>;

interface EditarInstructorFormProps {
  instructor: Instructor;
}

export function EditarInstructorForm({ instructor }: EditarInstructorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditarInstructorFormValues>({
    resolver: zodResolver(editarInstructorSchema),
    defaultValues: {
      apellido: instructor.apellido,
      nombres: instructor.nombres,
      telefono: instructor.telefono ?? "",
      email: instructor.email,
      especialidad: instructor.especialidad ?? "",
    },
  });

  function onSubmit(values: EditarInstructorFormValues) {
    setServerError(null);
    const input = {
      ...values,
      telefono: values.telefono || undefined,
      especialidad: values.especialidad || undefined,
    };

    startTransition(async () => {
      const result = await editarInstructor(instructor.id, input);
      if (!result.success) {
        setServerError(result.message);
        return;
      }
      router.push("/instructores");
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
          <CardTitle>Datos del instructor</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" aria-invalid={!!errors.apellido} {...register("apellido")} />
            {errors.apellido ? (
              <p className="text-sm text-destructive">{errors.apellido.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" aria-invalid={!!errors.nombres} {...register("nombres")} />
            {errors.nombres ? (
              <p className="text-sm text-destructive">{errors.nombres.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" value={instructor.dni} disabled />
            <p className="text-xs text-muted-foreground">El DNI no se puede modificar.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" {...register("telefono")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="especialidad">Especialidad</Label>
            <Input id="especialidad" {...register("especialidad")} />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
