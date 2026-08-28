"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import type { ConceptoIngresoLibre } from "@/lib/types";
import { darDeBajaConcepto } from "./actions";

interface ConceptoEstadoActionsProps {
  conceptoId: string;
  estado: ConceptoIngresoLibre["estado"];
}

/**
 * Baja de un solo sentido (`DELETE .../{id}` → `Estado=Inactivo`) — el
 * backend real no expone reactivación, mismo criterio que Amenities. Una vez
 * Inactivo no queda ninguna acción disponible acá.
 */
export function ConceptoEstadoActions({ conceptoId, estado }: ConceptoEstadoActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (estado !== "Activo") {
    return null;
  }

  function handleBaja() {
    setError(null);
    startTransition(async () => {
      const result = await darDeBajaConcepto(conceptoId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="destructive" size="sm" onClick={handleBaja} disabled={isPending}>
        {isPending ? "Guardando..." : "Dar de baja"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
