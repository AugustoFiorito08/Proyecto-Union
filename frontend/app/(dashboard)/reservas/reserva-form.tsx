"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
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

import type { Espacio, SocioResumen, TipoReserva } from "@/lib/types";
import { calcularDuracionMinutos } from "@/lib/utils";
import { crearReserva } from "./actions";

const TIPOS_RESERVA: TipoReserva[] = [
  "Partido",
  "Entrenamiento",
  "ReunionDirectiva",
  "Capacitacion",
  "Evento",
  "Otro",
];

const reservaSchema = z
  .object({
    esSocio: z.boolean(),
    socioId: z.string().optional(),
    nombreContacto: z.string().optional(),
    telefonoContacto: z.string().optional(),
    emailContacto: z.string().optional(),
    espacioId: z.string().min(1, "Seleccioná un espacio."),
    fecha: z.string().min(1, "Ingresá la fecha."),
    horaInicio: z.string().min(1, "Ingresá el horario de inicio."),
    horaFin: z.string().min(1, "Ingresá el horario de fin."),
    tipoReserva: z.enum(TIPOS_RESERVA as [TipoReserva, ...TipoReserva[]], {
      message: "Seleccioná un tipo de reserva.",
    }),
    cantidadInvitados: z.number().optional(),
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.esSocio && !data.socioId) {
      ctx.addIssue({ code: "custom", path: ["socioId"], message: "Seleccioná un socio." });
    }
    if (!data.esSocio && !data.nombreContacto?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["nombreContacto"],
        message: "Ingresá el nombre de contacto.",
      });
    }
  });

type ReservaFormValues = z.infer<typeof reservaSchema>;

interface ReservaFormProps {
  espacios: Espacio[];
  socios: SocioResumen[];
}

export function ReservaForm({ espacios, socios }: ReservaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      esSocio: true,
      socioId: "",
      nombreContacto: "",
      telefonoContacto: "",
      emailContacto: "",
      espacioId: "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      tipoReserva: "Entrenamiento",
      cantidadInvitados: undefined,
      observaciones: "",
    },
  });

  const esSocio = useWatch({ control, name: "esSocio" });

  function onSubmit(values: ReservaFormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await crearReserva({
        socioId: values.esSocio ? values.socioId : undefined,
        nombreContacto: values.esSocio ? undefined : values.nombreContacto || undefined,
        telefonoContacto: values.esSocio ? undefined : values.telefonoContacto || undefined,
        emailContacto: values.esSocio ? undefined : values.emailContacto || undefined,
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

      router.push("/reservas");
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Solicitante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={control}
            name="esSocio"
            render={({ field }) => (
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={field.value === true}
                    onChange={() => field.onChange(true)}
                  />
                  Socio existente
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={field.value === false}
                    onChange={() => field.onChange(false)}
                  />
                  No socio (gestionado por staff)
                </label>
              </div>
            )}
          />

          {esSocio ? (
            <div className="space-y-2">
              <Label htmlFor="socioId">Socio</Label>
              <Controller
                control={control}
                name="socioId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="socioId" className="w-full" aria-invalid={!!errors.socioId}>
                      <SelectValue placeholder="Seleccioná un socio" />
                    </SelectTrigger>
                    <SelectContent>
                      {socios.map((socio) => (
                        <SelectItem key={socio.id} value={socio.id}>
                          {socio.apellido}, {socio.nombres} (DNI {socio.dni})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.socioId ? (
                <p className="text-sm text-destructive">{errors.socioId.message}</p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nombreContacto">Nombre</Label>
                <Input
                  id="nombreContacto"
                  aria-invalid={!!errors.nombreContacto}
                  {...register("nombreContacto")}
                />
                {errors.nombreContacto ? (
                  <p className="text-sm text-destructive">{errors.nombreContacto.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefonoContacto">Teléfono</Label>
                <Input id="telefonoContacto" {...register("telefonoContacto")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailContacto">Email</Label>
                <Input id="emailContacto" type="email" {...register("emailContacto")} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            {busy ? "Guardando..." : "Crear reserva"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
