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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { Amenity } from "@/lib/types";
import { crearAmenity, editarAmenity } from "./actions";

const amenitySchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
});

type AmenityFormValues = z.infer<typeof amenitySchema>;

interface AmenityDialogProps {
  amenity?: Amenity;
}

export function AmenityDialog({ amenity }: AmenityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(amenity);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AmenityFormValues>({
    resolver: zodResolver(amenitySchema),
    defaultValues: { nombre: amenity?.nombre ?? "" },
  });

  function onSubmit(values: AmenityFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result =
        isEditing && amenity
          ? await editarAmenity(amenity.id, values)
          : await crearAmenity(values);

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
          reset({ nombre: amenity?.nombre ?? "" });
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
            Nueva amenity
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar amenity" : "Nueva amenity"}</DialogTitle>
            <DialogDescription>
              Comodidad disponible en los espacios del club (ej. Parrillero, Climatizado).
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear amenity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
