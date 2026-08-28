"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReservaDatePickerProps {
  fecha: string;
}

/**
 * Date-picker para navegar por fecha en `/reservas` (Tarea 3, `<Calendar />`
 * de shadcn — SPEC.md §7.2 menciona `<ReservationCalendar />` como grid
 * completo de columnas=espacios/filas=horas, que queda fuera de alcance de
 * esta parte; acá solo el selector de fecha). Se envuelve en `<Dialog />`
 * (ya instalado) en vez de un `<Popover />` porque ese componente no forma
 * parte de la lista de componentes ya instalados en Etapa 1 y la Tarea 2
 * pidió instalar puntualmente `calendar`.
 */
export function ReservaDatePicker({ fecha }: ReservaDatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const fechaSeleccionada = new Date(`${fecha}T00:00:00`);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const params = new URLSearchParams(searchParams.toString());
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    params.set("fecha", iso);
    setOpen(false);
    router.push(`/reservas?${params.toString()}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CalendarIcon className="size-4" aria-hidden="true" />
        {fechaSeleccionada.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "UTC",
        })}
      </DialogTrigger>
      <DialogContent className="w-auto">
        <DialogHeader>
          <DialogTitle>Elegí una fecha</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          selected={fechaSeleccionada}
          onSelect={handleSelect}
          defaultMonth={fechaSeleccionada}
        />
      </DialogContent>
    </Dialog>
  );
}
