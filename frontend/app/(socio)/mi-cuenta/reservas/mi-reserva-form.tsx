"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { Espacio, TipoReserva } from "@/lib/types";
import { calcularDuracionMinutos } from "@/lib/utils";
import { crearMiReserva } from "./actions";

const TIPOS_RESERVA: TipoReserva[] = [
  "Partido",
  "Entrenamiento",
  "ReunionDirectiva",
  "Capacitacion",
  "Evento",
  "Otro",
];

const miReservaSchema = z.object({
  espacioId: z.string().min(1, "Seleccioná un espacio."),
  fecha: z.string().min(1, "Ingresá la fecha."),
  horaInicio: z.string().min(1, "Ingresá el horario de inicio."),
  horaFin: z.string().min(1, "Ingresá el horario de fin."),
  tipoReserva: z.enum(TIPOS_RESERVA as [TipoReserva, ...TipoReserva[]], {
    message: "Seleccioná un tipo de reserva.",
  }),
  cantidadInvitados: z.number().optional(),
  observaciones: z.string().optional(),
});

type MiReservaFormValues = z.infer<typeof miReservaSchema>;

interface MiReservaFormProps {
  espacios: Espacio[];
}

/**
 * Formulario de "Nueva reserva" del Portal del Socio (SPEC.md §7.1
 * `/mi-cuenta/reservas/nueva`, `POST /api/me/reservas`) — variante reducida
 * de `(dashboard)/reservas/reserva-form.tsx`: no hay selector de "solicitante"
 * (el socio es implícito, resuelto por el backend desde el token — ver
 * `MeReservaInput` en `lib/types.ts`), así que no se piden ni `socioId` ni
 * los campos de contacto de reserva de No Socio.
 */
export function MiReservaForm({ espacios }: MiReservaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MiReservaFormValues>({
    resolver: zodResolver(miReservaSchema),
    defaultValues: {
      espacioId: "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      tipoReserva: "Entrenamiento",
      cantidadInvitados: undefined,
      observaciones: "",
    },
  });

  function onSubmit(values: MiReservaFormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await crearMiReserva({
        espacioId: values.espacioId,
        fecha: values.fecha,
        horaInicio: values.horaInicio,
        horaFin: values.horaFin,
        duracion: calcularDuracionMinutos(values.horaInicio, values.horaFin),
        tipoReserva: values.tipoReserva,
        cantidadInvitados: values.cantidadInvitados,
        observaciones: values.observaciones || undefined,
      });

      if (!result.success) {
        // RF-RES-09 bis: el error de superposición de horarios lo devuelve
        // el backend tal cual — no se revalida acá.
        setServerError(result.message);
        return;
      }

      router.push("/mi-cuenta/reservas");
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos de la reserva</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="espacioId">Espacio</Label>
            <Controller
              control={control}
              name="espacioId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="espacioId"
                    className="w-full"
                    aria-invalid={!!errors.espacioId}
                  >
                    <SelectValue placeholder="Seleccioná un espacio" />
                  </SelectTrigger>
                  <SelectContent>
                    {espacios.map((espacio) => (
                      <SelectItem key={espacio.id} value={espacio.id}>
                        {espacio.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.espacioId ? (
              <p className="text-sm text-destructive">{errors.espacioId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoReserva">Tipo de reserva</Label>
            <Controller
              control={control}
              name="tipoReserva"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipoReserva" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RESERVA.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              aria-invalid={!!errors.fecha}
              {...register("fecha")}
            />
            {errors.fecha ? <p className="text-sm text-destructive">{errors.fecha.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidadInvitados">Cantidad de invitados</Label>
            <Input
              id="cantidadInvitados"
              type="number"
              min="0"
              {...register("cantidadInvitados", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horaInicio">Horario de inicio</Label>
            <Input
              id="horaInicio"
              type="time"
              aria-invalid={!!errors.horaInicio}
              {...register("horaInicio")}
            />
            {errors.horaInicio ? (
              <p className="text-sm text-destructive">{errors.horaInicio.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horaFin">Horario de fin</Label>
            <Input
              id="horaFin"
              type="time"
              aria-invalid={!!errors.horaFin}
              {...register("horaFin")}
            />
            {errors.horaFin ? (
              <p className="text-sm text-destructive">{errors.horaFin.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" rows={3} {...register("observaciones")} />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Reservar"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
