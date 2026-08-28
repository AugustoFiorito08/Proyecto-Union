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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Amenity, Espacio, EspacioInput } from "@/lib/types";
import { crearEspacio, editarEspacio } from "./actions";

const TIPOS = ["Deportivo", "Recreativo", "Eventos"] as const;
const UNIDADES_PRECIO = ["PorHora", "PorTurno", "PorEvento"] as const;

const UNIDAD_PRECIO_LABEL: Record<(typeof UNIDADES_PRECIO)[number], string> = {
  PorHora: "Por hora",
  PorTurno: "Por turno",
  PorEvento: "Por evento",
};

const espacioSchema = z.object({
  nombre: z.string().min(1, "Ingresá el nombre."),
  descripcion: z.string().optional(),
  ubicacion: z.string().optional(),
  tipo: z.enum(TIPOS, { message: "Seleccioná un tipo." }),
  capacidad: z.number({ error: "Ingresá la capacidad." }).min(1, "La capacidad debe ser mayor a 0."),
  precio: z.number({ error: "Ingresá el precio." }).min(0, "El precio no puede ser negativo."),
  unidadPrecio: z.enum(UNIDADES_PRECIO, { message: "Seleccioná una unidad de precio." }),
  solicitarEvaluacion: z.boolean(),
  permitirNoSocios: z.boolean(),
  politicaCancelacionHoras: z.number().optional(),
  porcentajeReembolso: z.number().optional(),
  amenityIds: z.array(z.string()),
});

type EspacioFormValues = z.infer<typeof espacioSchema>;

interface EspacioFormProps {
  amenitiesDisponibles: Amenity[];
  espacio?: Espacio;
}

export function EspacioForm({ amenitiesDisponibles, espacio }: EspacioFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditing = Boolean(espacio);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EspacioFormValues>({
    resolver: zodResolver(espacioSchema),
    defaultValues: {
      nombre: espacio?.nombre ?? "",
      descripcion: espacio?.descripcion ?? "",
      ubicacion: espacio?.ubicacion ?? "",
      tipo: espacio?.tipo ?? "Deportivo",
      capacidad: espacio?.capacidad ?? 1,
      precio: espacio?.precio ?? 0,
      unidadPrecio: espacio?.unidadPrecio ?? "PorHora",
      solicitarEvaluacion: espacio?.solicitarEvaluacion ?? false,
      permitirNoSocios: espacio?.permitirNoSocios ?? false,
      politicaCancelacionHoras: espacio?.politicaCancelacionHoras ?? undefined,
      porcentajeReembolso: espacio?.porcentajeReembolso ?? undefined,
      amenityIds: espacio?.amenities.map((amenity) => amenity.id) ?? [],
    },
  });

  async function onSubmit(values: EspacioFormValues) {
    setServerError(null);

    const input: EspacioInput = {
      ...values,
      descripcion: values.descripcion || undefined,
      ubicacion: values.ubicacion || undefined,
    };

    startTransition(async () => {
      const result =
        isEditing && espacio
          ? await editarEspacio(espacio.id, input)
          : await crearEspacio(input);

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      router.push("/espacios");
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
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input id="ubicacion" {...register("ubicacion")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipo" className="w-full" aria-invalid={!!errors.tipo}>
                    <SelectValue placeholder="Seleccioná un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipo ? <p className="text-sm text-destructive">{errors.tipo.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacidad">Capacidad</Label>
            <Input
              id="capacidad"
              type="number"
              min="1"
              aria-invalid={!!errors.capacidad}
              {...register("capacidad", { valueAsNumber: true })}
            />
            {errors.capacidad ? (
              <p className="text-sm text-destructive">{errors.capacidad.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={!!errors.precio}
              {...register("precio", { valueAsNumber: true })}
            />
            {errors.precio ? (
              <p className="text-sm text-destructive">{errors.precio.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidadPrecio">Unidad de precio</Label>
            <Controller
              control={control}
              name="unidadPrecio"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unidadPrecio" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_PRECIO.map((unidad) => (
                      <SelectItem key={unidad} value={unidad}>
                        {UNIDAD_PRECIO_LABEL[unidad]}
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
          <CardTitle>Disponibilidad y políticas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="solicitarEvaluacion"
              render={({ field }) => (
                <Checkbox
                  id="solicitarEvaluacion"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="solicitarEvaluacion" className="font-normal">
              Requiere evaluación antes de confirmar la reserva
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="permitirNoSocios"
              render={({ field }) => (
                <Checkbox
                  id="permitirNoSocios"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="permitirNoSocios" className="font-normal">
              Permite reservas de No Socios
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="politicaCancelacionHoras">
              Antelación mínima de cancelación (hs)
            </Label>
            <Input
              id="politicaCancelacionHoras"
              type="number"
              min="0"
              {...register("politicaCancelacionHoras", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="porcentajeReembolso">Porcentaje de reembolso (%)</Label>
            <Input
              id="porcentajeReembolso"
              type="number"
              min="0"
              max="100"
              {...register("porcentajeReembolso", { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          {amenitiesDisponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay amenities cargadas — se pueden crear desde Configuración.
            </p>
          ) : (
            <Controller
              control={control}
              name="amenityIds"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {amenitiesDisponibles.map((amenity) => {
                    const checked = field.value.includes(amenity.id);
                    return (
                      <div key={amenity.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          checked={checked}
                          onCheckedChange={(value) => {
                            if (value) {
                              field.onChange([...field.value, amenity.id]);
                            } else {
                              field.onChange(field.value.filter((id) => id !== amenity.id));
                            }
                          }}
                        />
                        <Label htmlFor={`amenity-${amenity.id}`} className="font-normal">
                          {amenity.nombre}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          )}
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear espacio"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
