"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { DivisionDeportiva, EstadoDivisionDeportiva } from "@/lib/types";
import { crearDivision, editarDivision } from "../../actions";

const ESTADOS: EstadoDivisionDeportiva[] = ["Activa", "Inactiva"];

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
] as const;

const divisionSchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
  edadMinima: z.number().optional(),
  edadMaxima: z.number().optional(),
  genero: z.string().optional(),
  dias: z.array(z.enum(DIAS_SEMANA)),
  horarioInicio: z.string().min(1, "Ingresá el horario de inicio."),
  horarioFin: z.string().min(1, "Ingresá el horario de fin."),
  estado: z.enum(ESTADOS, { message: "Seleccioná un estado." }),
});

type DivisionFormValues = z.infer<typeof divisionSchema>;

interface DivisionDialogProps {
  actividadId: string;
  division?: DivisionDeportiva;
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

function valoresIniciales(division?: DivisionDeportiva): DivisionFormValues {
  return {
    nombre: division?.nombre ?? "",
    edadMinima: division?.edadMinima ?? undefined,
    edadMaxima: division?.edadMaxima ?? undefined,
    genero: division?.genero ?? "",
    dias: diasToArray(division?.dias),
    horarioInicio: division?.horarioInicio?.slice(0, 5) ?? "",
    horarioFin: division?.horarioFin?.slice(0, 5) ?? "",
    estado: division?.estado ?? "Activa",
  };
}

export function DivisionDialog({
  actividadId,
  division,
}: DivisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(division);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DivisionFormValues>({
    resolver: zodResolver(divisionSchema),
    defaultValues: valoresIniciales(division),
  });

  function onSubmit(values: DivisionFormValues) {
    setServerError(null);
    const input = {
      ...values,
      genero: values.genero || undefined,
      dias: values.dias.length > 0 ? values.dias.join(",") : undefined,
    };

    startTransition(async () => {
      const result =
        isEditing && division
          ? await editarDivision(actividadId, division.id, input)
          : await crearDivision(actividadId, input);

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          reset(valoresIniciales(division));
          setServerError(null);
        }
      }}
    >
      <DialogTrigger render={isEditing ? <Button variant="outline" size="sm" /> : <Button />}>
        {isEditing ? (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Nueva división
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar división" : "Nueva división"}</DialogTitle>
            <DialogDescription>
              División por edad/género dentro de la actividad (RN-ACT-02, SPEC.md §3.17).
            </DialogDescription>
          </DialogHeader>

          {serverError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="ej. Fútbol Infantil Sub13"
                aria-invalid={!!errors.nombre}
                {...register("nombre")}
              />
              {errors.nombre ? (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edadMinima">Edad mínima</Label>
              <Input
                id="edadMinima"
                type="number"
                min="0"
                {...register("edadMinima", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edadMaxima">Edad máxima</Label>
              <Input
                id="edadMaxima"
                type="number"
                min="0"
                {...register("edadMaxima", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero">Género</Label>
              <Input id="genero" placeholder="ej. Mixto" {...register("genero")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horarioInicio">Horario de inicio</Label>
              <Input
                id="horarioInicio"
                type="time"
                aria-invalid={!!errors.horarioInicio}
                {...register("horarioInicio")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horarioFin">Horario de fin</Label>
              <Input
                id="horarioFin"
                type="time"
                aria-invalid={!!errors.horarioFin}
                {...register("horarioFin")}
              />
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
                            id={`division-dia-${dia}`}
                            checked={checked}
                            onCheckedChange={(value) => {
                              if (value) {
                                field.onChange([...field.value, dia]);
                              } else {
                                field.onChange(field.value.filter((d) => d !== dia));
                              }
                            }}
                          />
                          <Label htmlFor={`division-dia-${dia}`} className="font-normal">
                            {dia}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Controller
                control={control}
                name="estado"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="estado" className="w-full" aria-invalid={!!errors.estado}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.estado ? (
                <p className="text-sm text-destructive">{errors.estado.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Los instructores de la división se asignan desde el botón &quot;Instructores&quot;
                de la tabla (después de crearla).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear división"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
