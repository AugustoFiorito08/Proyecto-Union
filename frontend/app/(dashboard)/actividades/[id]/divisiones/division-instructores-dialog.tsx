"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import type { DivisionDeportiva, Instructor } from "@/lib/types";
import { setInstructoresDivision } from "../../actions";

interface DivisionInstructoresDialogProps {
  actividadId: string;
  division: DivisionDeportiva;
  instructoresDisponibles: Instructor[];
}

/**
 * `PUT /api/actividades/{id}/divisiones/{divisionId}/instructores` — endpoint dedicado y
 * separado del alta/edición de la división (RN-ACT-02, SPEC.md §3.17), mismo patrón que
 * `InstructoresManager` a nivel Actividad.
 */
export function DivisionInstructoresDialog({
  actividadId,
  division,
  instructoresDisponibles,
}: DivisionInstructoresDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>(
    division.instructores.map((i) => i.instructorId)
  );

  function handleGuardar() {
    setError(null);
    startTransition(async () => {
      const result = await setInstructoresDivision(actividadId, division.id, {
        instructorIds: seleccion,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSeleccion(division.instructores.map((i) => i.instructorId));
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Users className="size-4" aria-hidden="true" />
        Instructores
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instructores de {division.nombre}</DialogTitle>
          <DialogDescription>
            Reemplaza el conjunto completo de instructores asignados a esta división (RN-ACT-02).
          </DialogDescription>
        </DialogHeader>

        {instructoresDisponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay instructores cargados — se pueden crear desde el módulo Instructores.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {instructoresDisponibles.map((instructor) => {
              const checked = seleccion.includes(instructor.id);
              return (
                <div key={instructor.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`division-${division.id}-instructor-${instructor.id}`}
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSeleccion((prev) =>
                        value
                          ? [...prev, instructor.id]
                          : prev.filter((id) => id !== instructor.id)
                      );
                    }}
                  />
                  <Label
                    htmlFor={`division-${division.id}-instructor-${instructor.id}`}
                    className="font-normal"
                  >
                    {instructor.apellido}, {instructor.nombres}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
