"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import type { CoberturaMedica } from "@/lib/types";
import { crearCobertura, editarCobertura } from "./actions";

// Sin campo `estado`: `CoberturaMedicaRequest` (backend) no lo acepta en
// alta/edición — la baja es un endpoint aparte
// (`POST /api/configuracion/coberturas-medicas/{id}/baja`).
const coberturaSchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
  descripcion: z.string().optional(),
});

type CoberturaFormValues = z.infer<typeof coberturaSchema>;

interface CoberturaDialogProps {
  cobertura?: CoberturaMedica;
}

export function CoberturaDialog({ cobertura }: CoberturaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(cobertura);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CoberturaFormValues>({
    resolver: zodResolver(coberturaSchema),
    defaultValues: {
      nombre: cobertura?.nombre ?? "",
      descripcion: cobertura?.descripcion ?? "",
    },
  });

  function onSubmit(values: CoberturaFormValues) {
    setServerError(null);
    const input = { ...values, descripcion: values.descripcion || undefined };

    startTransition(async () => {
      const result =
        isEditing && cobertura
          ? await editarCobertura(cobertura.id, input)
          : await crearCobertura(input);

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          reset({
            nombre: cobertura?.nombre ?? "",
            descripcion: cobertura?.descripcion ?? "",
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger
        render={isEditing ? <Button variant="outline" size="sm" /> : <Button />}
      >
        {isEditing ? (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Nueva cobertura
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar cobertura médica" : "Nueva cobertura médica"}</DialogTitle>
            <DialogDescription>
              Los planes específicos de la cobertura se gestionan desde &quot;Planes&quot;.
            </DialogDescription>
          </DialogHeader>

          {serverError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="nombreCobertura">Nombre</Label>
            <Input
              id="nombreCobertura"
              aria-invalid={!!errors.nombre}
              {...register("nombre")}
            />
            {errors.nombre ? (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcionCobertura">Descripción</Label>
            <Textarea id="descripcionCobertura" rows={2} {...register("descripcion")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cobertura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
