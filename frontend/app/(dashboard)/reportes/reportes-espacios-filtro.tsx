"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReportesEspaciosFiltroProps {
  desde: string;
  hasta: string;
}

/**
 * Filtro de fechas del tab "Espacios" (`GET /api/reportes/espacios?desde=&hasta=`).
 * Recarga la pantalla vía query params en la URL — mismo criterio que
 * `HistorialFiltro` de Control de Acceso (Etapa 5): `router.push` a la misma
 * ruta con los params nuevos, re-ejecuta el Server Component. Se asume
 * formato `yyyy-MM-dd` (el que entrega un `<input type="date">` nativo) para
 * `desde`/`hasta`, sin backend real todavía para confirmarlo. Si ninguno de
 * los dos está seteado, el backend ya trae el mes actual por default (no se
 * simula ese rango acá).
 */
export function ReportesEspaciosFiltro({ desde, hasta }: ReportesEspaciosFiltroProps) {
  const router = useRouter();
  const [desdeValue, setDesdeValue] = useState(desde);
  const [hastaValue, setHastaValue] = useState(hasta);

  function aplicar() {
    const params = new URLSearchParams();
    if (desdeValue) params.set("desde", desdeValue);
    if (hastaValue) params.set("hasta", hastaValue);
    const query = params.toString();
    router.push(query ? `/reportes?${query}` : "/reportes");
  }

  function limpiar() {
    setDesdeValue("");
    setHastaValue("");
    router.push("/reportes");
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="reportes-espacios-desde">Desde</Label>
        <Input
          id="reportes-espacios-desde"
          type="date"
          value={desdeValue}
          onChange={(event) => setDesdeValue(event.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reportes-espacios-hasta">Hasta</Label>
        <Input
          id="reportes-espacios-hasta"
          type="date"
          value={hastaValue}
          onChange={(event) => setHastaValue(event.target.value)}
          className="w-40"
        />
      </div>
      <Button type="button" size="sm" onClick={aplicar}>
        Aplicar
      </Button>
      {desde || hasta ? (
        <Button type="button" variant="outline" size="sm" onClick={limpiar}>
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
