"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SocioResumen } from "@/lib/types";

const TODOS = "__todos__";

interface HistorialFiltroProps {
  socios: SocioResumen[];
  socioId: string;
}

/**
 * Filtro de `/control-acceso/historial` (`GET /api/control-acceso/historial?socioId=`).
 * El backend filtra por `socioId` exacto, no por texto libre (a diferencia
 * del buscador de `/socios`), así que el filtro es un `<Select />` con el
 * listado completo de socios en vez de un input de búsqueda — mismo
 * componente que ya usa `<RegistrarPagoDialog />` para elegir socio.
 */
export function HistorialFiltro({ socios, socioId }: HistorialFiltroProps) {
  const router = useRouter();

  return (
    <div className="flex max-w-sm items-center gap-2">
      <Select
        value={socioId || TODOS}
        onValueChange={(value) => {
          router.push(
            !value || value === TODOS
              ? "/control-acceso/historial"
              : `/control-acceso/historial?socioId=${value}`
          );
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Filtrar por socio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos los socios</SelectItem>
          {socios.map((socio) => (
            <SelectItem key={socio.id} value={socio.id}>
              {socio.apellido}, {socio.nombres} (DNI {socio.dni})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {socioId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/control-acceso/historial")}
        >
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
