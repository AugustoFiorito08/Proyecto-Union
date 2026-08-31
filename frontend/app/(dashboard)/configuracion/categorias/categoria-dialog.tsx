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

import type { Categoria } from "@/lib/types";
import { crearCategoria, editarCategoria } from "./actions";

// Sin campo `estado`: `CategoriaRequest` (backend) no lo acepta en alta/edición
// — el alta siempre crea en Activo, y la baja es un endpoint aparte
// (`POST /api/configuracion/categorias/{id}/baja`), no un valor de este form.
const categoriaSchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
  descripcion: z.string().optional(),
  valorCuota: z
    .number({ error: "Ingresá el valor de cuota." })
    .min(0, "El valor de cuota no puede ser negativo."),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

interface CategoriaDialogProps {
  categoria?: Categoria;
}

export function CategoriaDialog({ categoria }: CategoriaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(categoria);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? "",
      descripcion: categoria?.descripcion ?? "",
      valorCuota: categoria?.valorCuota ?? 0,
    },
  });

  function onSubmit(values: CategoriaFormValues) {
    setServerError(null);
    const input = { ...values, descripcion: values.descripcion || undefined };

    startTransition(async () => {
      const result =
        isEditing && categoria
          ? await editarCategoria(categoria.id, input)
          : await crearCategoria(input);

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
            nombre: categoria?.nombre ?? "",
            descripcion: categoria?.descripcion ?? "",
            valorCuota: categoria?.valorCuota ?? 0,
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="outline" size="sm" />
          ) : (
            <Button />
          )
        }
      >
        {isEditing ? (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Nueva categoría
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              Categoría de socio y valor de cuota asociado.
            </DialogDescription>
          </DialogHeader>

          {serverError ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" aria-invalid={!!errors.nombre} {...register("nombre")} />
            {errors.nombre ? (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={2} {...register("descripcion")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorCuota">Valor de cuota</Label>
            <Input
              id="valorCuota"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.valorCuota}
              {...register("valorCuota", { valueAsNumber: true })}
            />
            {errors.valorCuota ? (
              <p className="text-sm text-destructive">{errors.valorCuota.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
