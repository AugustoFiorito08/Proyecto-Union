"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { Instructor } from "@/lib/types";
import { setInstructoresActividad } from "../actions";

interface InstructoresManagerProps {
  actividadId: string;
  instructoresAsignadosIds: string[];
  instructoresDisponibles: Instructor[];
}

/**
 * [DECISIÓN — Tarea 3] Se resolvió como parte de la página de detalle
 * (`/actividades/[id]`) en vez de una ruta aparte (`/actividades/[id]/instructores`):
 * es una única llamada `PUT .../instructores` que reemplaza el conjunto
 * completo (RN-ACT-02), sin sub-estados propios ni necesidad de paginar/
 * buscar instructores por separado — no justifica una pantalla dedicada,
 * a diferencia de Divisiones, que sí tiene su propio ABM (`.../divisiones`).
 */
export function InstructoresManager({
  actividadId,
  instructoresAsignadosIds,
  instructoresDisponibles,
}: InstructoresManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seleccion, setSeleccion] = useState<string[]>(instructoresAsignadosIds);
  const [error, setError] = useState<string | null>(null);

  const huboCambios =
    seleccion.length !== instructoresAsignadosIds.length ||
    seleccion.some((id) => !instructoresAsignadosIds.includes(id));

  function handleGuardar() {
    setError(null);
    startTransition(async () => {
      const result = await setInstructoresActividad(actividadId, { instructorIds: seleccion });
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instructores asignados</CardTitle>
      </CardHeader>
      <CardContent>
        {instructoresDisponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay instructores cargados — se pueden crear desde el módulo Instructores.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {instructoresDisponibles.map((instructor) => {
              const checked = seleccion.includes(instructor.id);
              return (
                <div key={instructor.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`instructor-${instructor.id}`}
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSeleccion((prev) =>
                        value ? [...prev, instructor.id] : prev.filter((id) => id !== instructor.id)
                      );
                    }}
                  />
                  <Label htmlFor={`instructor-${instructor.id}`} className="font-normal">
                    {instructor.apellido}, {instructor.nombres}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleGuardar} disabled={isPending || !huboCambios}>
          {isPending ? "Guardando..." : "Guardar instructores"}
        </Button>
      </CardFooter>
    </Card>
  );
}
