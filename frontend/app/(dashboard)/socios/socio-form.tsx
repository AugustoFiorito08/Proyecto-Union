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
  CardDescription,
} from "@/components/ui/card";

import type { Categoria, CoberturaMedica, Socio, SocioInput } from "@/lib/types";
import { crearSocio, editarSocio } from "./actions";

const GENEROS = ["Masculino", "Femenino", "Otro"] as const;
const TIPOS_PAGO = ["Mensual", "Semestral", "Anual", "Estudiante"] as const;
const MODALIDADES = ["Cobrador", "SecretariaWeb"] as const;

const socioSchema = z
  .object({
    apellido: z.string().min(1, "Ingresá el apellido."),
    nombres: z.string().min(1, "Ingresá los nombres."),
    dni: z
      .string()
      .min(1, "Ingresá el DNI.")
      .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
    fechaNacimiento: z.string().min(1, "Ingresá la fecha de nacimiento."),
    genero: z.enum(GENEROS, { message: "Seleccioná un género." }),
    tipoPago: z.enum(TIPOS_PAGO, { message: "Seleccioná un tipo de pago." }),
    modalidad: z.enum(MODALIDADES, { message: "Seleccioná una modalidad." }),
    categoriaId: z.string().min(1, "Seleccioná una categoría."),
    telefono: z.string().optional(),
    email: z.string().min(1, "Ingresá el email.").email("Ingresá un email válido."),
    domicilio: z.string().optional(),
    coberturaMedicaId: z.string().optional(),
    planId: z.string().optional(),
    grupoSanguineo: z.string().optional(),
    observacionesMedicas: z.string().optional(),
    fichaMedicaFechaEmision: z.string().optional(),
    consentimientoDatosSalud: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const hayDatosMedicos = Boolean(
      data.coberturaMedicaId ||
        data.grupoSanguineo ||
        data.observacionesMedicas ||
        data.fichaMedicaFechaEmision
    );
    if (hayDatosMedicos && !data.consentimientoDatosSalud) {
      ctx.addIssue({
        code: "custom",
        path: ["consentimientoDatosSalud"],
        message:
          "Es obligatorio el consentimiento informado para cargar datos de salud (Ley 25.326).",
      });
    }
  });

type SocioFormValues = z.infer<typeof socioSchema>;

interface SocioFormProps {
  categorias: Categoria[];
  coberturas: CoberturaMedica[];
  socio?: Socio;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  // Acepta tanto "2026-08-27" como un ISO completo del backend.
  return value.slice(0, 10);
}

export function SocioForm({ categorias, coberturas, socio }: SocioFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditing = Boolean(socio);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SocioFormValues>({
    resolver: zodResolver(socioSchema),
    defaultValues: {
      apellido: socio?.apellido ?? "",
      nombres: socio?.nombres ?? "",
      dni: socio?.dni ?? "",
      fechaNacimiento: toDateInputValue(socio?.fechaNacimiento),
      genero: socio?.genero ?? "Masculino",
      tipoPago: socio?.tipoPago ?? "Mensual",
      modalidad: socio?.modalidad ?? "Cobrador",
      categoriaId: socio?.categoriaId ?? "",
      telefono: socio?.telefono ?? "",
      email: socio?.email ?? "",
      domicilio: socio?.domicilio ?? "",
      coberturaMedicaId: socio?.coberturaMedicaId ?? "",
      planId: socio?.planId ?? "",
      grupoSanguineo: socio?.grupoSanguineo ?? "",
      observacionesMedicas: socio?.observacionesMedicas ?? "",
      fichaMedicaFechaEmision: toDateInputValue(socio?.fichaMedicaFechaEmision),
      consentimientoDatosSalud: Boolean(
        socio?.grupoSanguineo || socio?.observacionesMedicas || socio?.coberturaMedicaId
      ),
    },
  });

  const coberturaSeleccionadaId = useWatch({ control, name: "coberturaMedicaId" });
  const planesDisponibles =
    coberturas.find((c) => c.id === coberturaSeleccionadaId)?.planes ?? [];

  const [grupoSanguineoW, observacionesW, fichaFechaW] = useWatch({
    control,
    name: ["grupoSanguineo", "observacionesMedicas", "fichaMedicaFechaEmision"],
  });
  const hayDatosMedicosCargados = Boolean(
    coberturaSeleccionadaId || grupoSanguineoW || observacionesW || fichaFechaW
  );

  async function onSubmit(values: SocioFormValues) {
    setServerError(null);

    const input: SocioInput = {
      ...values,
      coberturaMedicaId: values.coberturaMedicaId || undefined,
      planId: values.planId || undefined,
      telefono: values.telefono || undefined,
      domicilio: values.domicilio || undefined,
      grupoSanguineo: values.grupoSanguineo || undefined,
      observacionesMedicas: values.observacionesMedicas || undefined,
      fichaMedicaFechaEmision: values.fichaMedicaFechaEmision || undefined,
    };

    startTransition(async () => {
      const result =
        isEditing && socio
          ? await editarSocio(socio.id, input)
          : await crearSocio(input);

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      router.push(`/socios/${result.data.id}`);
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
          <CardTitle>Información básica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" aria-invalid={!!errors.apellido} {...register("apellido")} />
            {errors.apellido ? (
              <p className="text-sm text-destructive">{errors.apellido.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" aria-invalid={!!errors.nombres} {...register("nombres")} />
            {errors.nombres ? (
              <p className="text-sm text-destructive">{errors.nombres.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input id="dni" aria-invalid={!!errors.dni} {...register("dni")} />
            {errors.dni ? <p className="text-sm text-destructive">{errors.dni.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
            <Input
              id="fechaNacimiento"
              type="date"
              aria-invalid={!!errors.fechaNacimiento}
              {...register("fechaNacimiento")}
            />
            {errors.fechaNacimiento ? (
              <p className="text-sm text-destructive">{errors.fechaNacimiento.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="genero">Género</Label>
            <Controller
              control={control}
              name="genero"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="genero" className="w-full" aria-invalid={!!errors.genero}>
                    <SelectValue placeholder="Seleccioná un género" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map((genero) => (
                      <SelectItem key={genero} value={genero}>
                        {genero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.genero ? (
              <p className="text-sm text-destructive">{errors.genero.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoPago">Tipo de pago</Label>
            <Controller
              control={control}
              name="tipoPago"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipoPago" className="w-full" aria-invalid={!!errors.tipoPago}>
                    <SelectValue placeholder="Seleccioná un tipo de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PAGO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipoPago ? (
              <p className="text-sm text-destructive">{errors.tipoPago.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modalidad">Modalidad de cobro</Label>
            <Controller
              control={control}
              name="modalidad"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="modalidad" className="w-full" aria-invalid={!!errors.modalidad}>
                    <SelectValue placeholder="Seleccioná una modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADES.map((modalidad) => (
                      <SelectItem key={modalidad} value={modalidad}>
                        {modalidad === "Cobrador" ? "Cobrador" : "Secretaría Web"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.modalidad ? (
              <p className="text-sm text-destructive">{errors.modalidad.message}</p>
            ) : null}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" {...register("telefono")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="domicilio">Domicilio</Label>
            <Input id="domicilio" {...register("domicilio")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del socio / Ficha médica</CardTitle>
          <CardDescription>
            Dato sensible (Ley 25.326) — requiere consentimiento informado para cargarse.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coberturaMedicaId">Cobertura médica</Label>
            <Controller
              control={control}
              name="coberturaMedicaId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="coberturaMedicaId" className="w-full">
                    <SelectValue placeholder="Sin cobertura" />
                  </SelectTrigger>
                  <SelectContent>
                    {coberturas.map((cobertura) => (
                      <SelectItem key={cobertura.id} value={cobertura.id}>
                        {cobertura.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planId">Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={planesDisponibles.length === 0}
                >
                  <SelectTrigger id="planId" className="w-full">
                    <SelectValue placeholder="Sin plan específico" />
                  </SelectTrigger>
                  <SelectContent>
                    {planesDisponibles.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grupoSanguineo">Grupo sanguíneo</Label>
            <Input id="grupoSanguineo" placeholder="ej. O+" {...register("grupoSanguineo")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fichaMedicaFechaEmision">Ficha médica — fecha de emisión</Label>
            <Input
              id="fichaMedicaFechaEmision"
              type="date"
              {...register("fichaMedicaFechaEmision")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="observacionesMedicas">Observaciones médicas</Label>
            <Textarea id="observacionesMedicas" rows={3} {...register("observacionesMedicas")} />
          </div>

          <div className="flex items-start gap-2 sm:col-span-2">
            <Controller
              control={control}
              name="consentimientoDatosSalud"
              render={({ field }) => (
                <Checkbox
                  id="consentimientoDatosSalud"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={!!errors.consentimientoDatosSalud}
                />
              )}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor="consentimientoDatosSalud" className="font-normal">
                El socio presta consentimiento informado para el tratamiento de sus datos
                de salud{hayDatosMedicosCargados ? " (obligatorio: hay datos médicos cargados)" : ""}.
              </Label>
              {errors.consentimientoDatosSalud ? (
                <p className="text-sm text-destructive">
                  {errors.consentimientoDatosSalud.message}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear socio"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
