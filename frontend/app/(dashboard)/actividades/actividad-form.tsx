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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { Actividad, ActividadInput, Categoria, Espacio } from "@/lib/types";
import { crearActividad, editarActividad } from "./actions";

const MODALIDADES = ["HorarioFijo", "PaseLibre"] as const;
const MODALIDAD_LABEL: Record<(typeof MODALIDADES)[number], string> = {
  HorarioFijo: "Horario fijo",
  PaseLibre: "Pase libre",
};

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
] as const;

const actividadSchema = z
  .object({
    nombre: z.string().min(1, "Ingresá el nombre."),
    descripcion: z.string().optional(),
    categoriaId: z.string().min(1, "Seleccioná una categoría."),
    espacioId: z.string().optional(),
    precio: z.number().min(0, "El precio no puede ser negativo.").optional(),
    modalidadInscripcion: z.enum(MODALIDADES, { message: "Seleccioná una modalidad." }),
    cupoMinimo: z.number({ error: "Ingresá el cupo mínimo." }).min(0),
    cupoMaximo: z.number({ error: "Ingresá el cupo máximo." }).min(1),
    dias: z.array(z.enum(DIAS_SEMANA)),
    horarioInicio: z.string().min(1, "Ingresá el horario de inicio."),
    horarioFin: z.string().min(1, "Ingresá el horario de fin."),
    duracion: z.number({ error: "Ingresá la duración." }).min(1),
  })
  .refine((data) => data.cupoMaximo >= data.cupoMinimo, {
    message: "El cupo máximo debe ser mayor o igual al mínimo.",
    path: ["cupoMaximo"],
  });

type ActividadFormValues = z.infer<typeof actividadSchema>;

interface ActividadFormProps {
  categorias: Categoria[];
  espacios: Espacio[];
  actividad?: Actividad;
}

function diasToArray(dias?: string | null): (typeof DIAS_SEMANA)[number][] {
  if (!dias) return [];
  return dias
    .split(",")
    .map((d) => d.trim())
    .filter((d): d is (typeof DIAS_SEMANA)[number] =>
      (DIAS_SEMANA as readonly string[]).includes(d)
    );
}

export function ActividadForm({ categorias, espacios, actividad }: ActividadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditing = Boolean(actividad);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ActividadFormValues>({
    resolver: zodResolver(actividadSchema),
    defaultValues: {
      nombre: actividad?.nombre ?? "",
      descripcion: actividad?.descripcion ?? "",
      categoriaId: actividad?.categoriaId ?? "",
      espacioId: actividad?.espacioId ?? "",
      precio: actividad?.precio ?? undefined,
      modalidadInscripcion: actividad?.modalidadInscripcion ?? "HorarioFijo",
      cupoMinimo: actividad?.cupoMinimo ?? 0,
      cupoMaximo: actividad?.cupoMaximo ?? 1,
      dias: diasToArray(actividad?.dias),
      horarioInicio: actividad?.horarioInicio?.slice(0, 5) ?? "",
      horarioFin: actividad?.horarioFin?.slice(0, 5) ?? "",
      duracion: actividad?.duracion ?? 60,
    },
  });

  function onSubmit(values: ActividadFormValues) {
    setServerError(null);

    const input: ActividadInput = {
      ...values,
      descripcion: values.descripcion || undefined,
      espacioId: values.espacioId || undefined,
      dias: values.dias.length > 0 ? values.dias.join(",") : undefined,
      // Requerido por el backend (CrearActividadRequest/ActualizarActividadRequest); este
      // form no lo expone — el alta siempre crea Suspendida (RN-ACT-02: no puede activarse
      // sin instructor), y la edición preserva el estado actual sin cambios (las
      // transiciones van por ActividadEstadoActions).
      estado: actividad?.estado ?? "Suspendida",
    };

    startTransition(async () => {
      const result =
        isEditing && actividad
          ? await editarActividad(actividad.id, input)
          : await crearActividad(input);

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      router.push(`/actividades/${result.data.id}`);
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
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" aria-invalid={!!errors.nombre} {...register("nombre")} />
            {errors.nombre ? (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" rows={2} {...register("descripcion")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoriaId">Categoría</Label>
            <Controller
              control={control}
              name="categoriaId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="categoriaId"
                    className="w-full"
                    aria-invalid={!!errors.categoriaId}
                  >
                    <SelectValue placeholder="Seleccioná una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoriaId ? (
              <p className="text-sm text-destructive">{errors.categoriaId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="espacioId">Espacio</Label>
            <Controller
              control={control}
              name="espacioId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="espacioId" className="w-full">
                    <SelectValue placeholder="Sin espacio asignado" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio (cuota mensual de la actividad)</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              min="0"
              {...register("precio", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modalidadInscripcion">Modalidad de inscripción</Label>
            <Controller
              control={control}
              name="modalidadInscripcion"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="modalidadInscripcion" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADES.map((modalidad) => (
                      <SelectItem key={modalidad} value={modalidad}>
                        {MODALIDAD_LABEL[modalidad]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cupo y horario</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cupoMinimo">Cupo mínimo</Label>
            <Input
              id="cupoMinimo"
              type="number"
              min="0"
              aria-invalid={!!errors.cupoMinimo}
              {...register("cupoMinimo", { valueAsNumber: true })}
            />
            {errors.cupoMinimo ? (
              <p className="text-sm text-destructive">{errors.cupoMinimo.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cupoMaximo">Cupo máximo</Label>
            <Input
              id="cupoMaximo"
              type="number"
              min="1"
              aria-invalid={!!errors.cupoMaximo}
              {...register("cupoMaximo", { valueAsNumber: true })}
            />
            {errors.cupoMaximo ? (
              <p className="text-sm text-destructive">{errors.cupoMaximo.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horarioInicio">Horario de inicio</Label>
            <Input
              id="horarioInicio"
              type="time"
              aria-invalid={!!errors.horarioInicio}
              {...register("horarioInicio")}
            />
            {errors.horarioInicio ? (
              <p className="text-sm text-destructive">{errors.horarioInicio.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="horarioFin">Horario de fin</Label>
            <Input
              id="horarioFin"
              type="time"
              aria-invalid={!!errors.horarioFin}
              {...register("horarioFin")}
            />
            {errors.horarioFin ? (
              <p className="text-sm text-destructive">{errors.horarioFin.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracion">Duración (minutos)</Label>
            <Input
              id="duracion"
              type="number"
              min="1"
              aria-invalid={!!errors.duracion}
              {...register("duracion", { valueAsNumber: true })}
            />
            {errors.duracion ? (
              <p className="text-sm text-destructive">{errors.duracion.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Días</Label>
            <Controller
              control={control}
              name="dias"
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {DIAS_SEMANA.map((dia) => {
                    const checked = field.value.includes(dia);
                    return (
                      <div key={dia} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`dia-${dia}`}
                          checked={checked}
                          onCheckedChange={(value) => {
                            if (value) {
                              field.onChange([...field.value, dia]);
                            } else {
                              field.onChange(field.value.filter((d) => d !== dia));
                            }
                          }}
                        />
                        <Label htmlFor={`dia-${dia}`} className="font-normal">
                          {dia}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear actividad"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
