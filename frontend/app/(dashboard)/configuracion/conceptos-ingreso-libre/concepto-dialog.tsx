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

import type { ConceptoIngresoLibre } from "@/lib/types";
import { crearConcepto, editarConcepto } from "./actions";

const conceptoSchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
});

type ConceptoFormValues = z.infer<typeof conceptoSchema>;

interface ConceptoDialogProps {
  concepto?: ConceptoIngresoLibre;
}

/** Mismo patrón que `configuracion/amenities/amenity-dialog.tsx`. */
export function ConceptoDialog({ concepto }: ConceptoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(concepto);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConceptoFormValues>({
    resolver: zodResolver(conceptoSchema),
    defaultValues: { nombre: concepto?.nombre ?? "" },
  });

  function onSubmit(values: ConceptoFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result =
        isEditing && concepto
          ? await editarConcepto(concepto.id, values)
          : await crearConcepto(values);

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
          reset({ nombre: concepto?.nombre ?? "" });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger render={isEditing ? <Button variant="outline" size="sm" /> : <Button />}>
        {isEditing ? (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo concepto
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar concepto" : "Nuevo concepto de ingreso libre"}</DialogTitle>
            <DialogDescription>
              Categoría de ingreso sin Cuota ni Reserva asociada (ej. Jardín Maternal, Eventos).
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
              {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear concepto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
