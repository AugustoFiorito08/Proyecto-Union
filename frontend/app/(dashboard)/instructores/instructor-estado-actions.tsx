"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import type { EstadoInstructor } from "@/lib/types";
import { cambiarEstadoInstructor } from "./actions";

interface InstructorEstadoActionsProps {
  instructorId: string;
  estado: EstadoInstructor;
}

/**
 * Toggle simple Activo/Inactivo (SPEC.md §7.2 `<StatusDropdown />` menciona
 * "Instructores" como uno de sus usos) — sin motivo obligatorio, a
 * diferencia de la baja de Socio/GrupoFamiliar, porque `Instructor` no
 * modela `MotivoBaja` (ver decisión documentada en `actions.ts`).
 */
export function InstructorEstadoActions({ instructorId, estado }: InstructorEstadoActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nuevoEstado: EstadoInstructor = estado === "Activo" ? "Inactivo" : "Activo";

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await cambiarEstadoInstructor(instructorId, nuevoEstado);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={estado === "Activo" ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? "Guardando..." : estado === "Activo" ? "Desactivar" : "Activar"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
