"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SOLICITUD_MEMBRESIA_STORAGE_KEY } from "@/lib/constants";

import type { Categoria, SolicitudMembresia, SolicitudMembresiaInput } from "@/lib/types";
import { crearSolicitudMembresia, subirAdjuntosSolicitud } from "./actions";

/**
 * Guarda el `id` de la solicitud recién creada en `localStorage` del
 * navegador — es la única forma de que
 * `(auth)/solicitud-membresia/seguimiento/page.tsx` pueda encontrarla
 * después, ya que el flujo real es: crear solicitud (sin sesión) → el
 * solicitante inicia sesión en algún momento posterior → `proxy.ts` lo
 * redirige a `/solicitud-membresia/seguimiento` sin ningún `?id=` (el login
 * de `(auth)/login/page.tsx` siempre hace `router.push("/dashboard")` y deja
 * que `proxy.ts` reubique por rol — no hay forma de pasar el id por la URL a
 * través de ese salto). Con el id ya en este navegador, la página de
 * seguimiento lo recupera vía `<SeguimientoIdResolver />` sin pedírselo al
 * usuario. Si vuelve desde otro dispositivo/navegador, no va a estar — ver
 * el estado vacío documentado ahí.
 */
function guardarIdSolicitudEnNavegador(id: string): void {
  try {
    window.localStorage.setItem(SOLICITUD_MEMBRESIA_STORAGE_KEY, id);
  } catch {
    // localStorage puede no estar disponible (modo privado, storage lleno,
    // etc.) — no es crítico para el flujo, la solicitud ya quedó creada.
  }
}

const GENEROS = ["Masculino", "Femenino", "Otro"] as const;

// RN-LOG-01 (SPEC.md §3.10): mínimo 8 caracteres, una mayúscula, una
// minúscula y un número — misma política y mismo checklist visible que ya
// usa `(auth)/recuperar-password/confirmar/reset-password-form.tsx`.
const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Al menos una mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Al menos una minúscula", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", label: "Al menos un número", test: (v: string) => /[0-9]/.test(v) },
] as const;

const solicitudSchema = z
  .object({
    nombre: z.string().min(1, "Ingresá el nombre."),
    apellido: z.string().min(1, "Ingresá el apellido."),
    dni: z
      .string()
      .min(1, "Ingresá el DNI.")
      .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
    fechaNacimiento: z.string().min(1, "Ingresá la fecha de nacimiento."),
    genero: z.enum(GENEROS, { message: "Seleccioná un género." }),
    email: z.string().min(1, "Ingresá el email.").email("Ingresá un email válido."),
    telefono: z.string().optional(),
    domicilio: z.string().optional(),
    localidad: z.string().optional(),
    provincia: z.string().optional(),
    categoriaPretendidaId: z.string().optional(),
    password: z
      .string()
      .min(8, "La contraseña debe cumplir todos los requisitos.")
      .regex(/[A-Z]/, "La contraseña debe cumplir todos los requisitos.")
      .regex(/[a-z]/, "La contraseña debe cumplir todos los requisitos.")
      .regex(/[0-9]/, "La contraseña debe cumplir todos los requisitos."),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type SolicitudFormValues = z.infer<typeof solicitudSchema>;

interface SolicitudMembresiaFormProps {
  categorias: Categoria[];
}

export function SolicitudMembresiaForm({ categorias }: SolicitudMembresiaFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [solicitudCreada, setSolicitudCreada] = useState<SolicitudMembresia | null>(null);

  const [documentoIdentidad, setDocumentoIdentidad] = useState<File | null>(null);
  const [fichaMedica, setFichaMedica] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      dni: "",
      fechaNacimiento: "",
      genero: "Masculino",
      email: "",
      telefono: "",
      domicilio: "",
      localidad: "",
      provincia: "",
      categoriaPretendidaId: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";

  function onSubmit(values: SolicitudFormValues) {
    setServerError(null);
    setUploadWarning(null);

    const input: SolicitudMembresiaInput = {
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      dni: values.dni,
      fechaNacimiento: values.fechaNacimiento,
      genero: values.genero,
      email: values.email.trim(),
      telefono: values.telefono || undefined,
      domicilio: values.domicilio || undefined,
      localidad: values.localidad || undefined,
      provincia: values.provincia || undefined,
      categoriaPretendidaId: values.categoriaPretendidaId || undefined,
      password: values.password,
    };

    startTransition(async () => {
      const result = await crearSolicitudMembresia(input);
      if (!result.success) {
        setServerError(result.message);
        return;
      }

      const solicitud = result.data;
      guardarIdSolicitudEnNavegador(solicitud.id);

      if (documentoIdentidad || fichaMedica) {
        const subida = await subirAdjuntosSolicitud(solicitud.id, {
          documentoIdentidad: documentoIdentidad ?? undefined,
          fichaMedica: fichaMedica ?? undefined,
        });
        if (!subida.success) {
          setUploadWarning(
            `La solicitud se registró, pero falló la subida de adjuntos: ${subida.message}. Podés reintentar más adelante desde el seguimiento de tu solicitud.`
          );
          setSolicitudCreada(solicitud);
          return;
        }
        setSolicitudCreada(subida.data);
        return;
      }

      setSolicitudCreada(solicitud);
    });
  }

  if (solicitudCreada) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solicitud enviada</CardTitle>
          <CardDescription>
            Tu solicitud quedó registrada con el número{" "}
            <span className="font-semibold text-foreground">
              {solicitudCreada.numeroSolicitud}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El club va a revisar tu solicitud. Vas a poder consultar el estado iniciando sesión
            con el email y la contraseña que acabás de crear.
          </p>
          {uploadWarning ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {uploadWarning}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className={cn(buttonVariants(), "w-full")}>
            Ir a iniciar sesión
          </Link>
          <Link
            href={`/solicitud-membresia/seguimiento?id=${solicitudCreada.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Ver seguimiento
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" aria-invalid={!!errors.nombre} {...register("nombre")} />
            {errors.nombre ? (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" aria-invalid={!!errors.apellido} {...register("apellido")} />
            {errors.apellido ? (
              <p className="text-sm text-destructive">{errors.apellido.message}</p>
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
            <Label htmlFor="categoriaPretendidaId">Categoría pretendida (opcional)</Label>
            <Controller
              control={control}
              name="categoriaPretendidaId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={categorias.length === 0}
                >
                  <SelectTrigger id="categoriaPretendidaId" className="w-full">
                    <SelectValue
                      placeholder={
                        categorias.length === 0 ? "No disponible" : "Seleccioná una categoría"
                      }
                    />
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
            {categorias.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No se pudieron cargar las categorías. Podés dejar este campo vacío — el club te
                asigna una categoría al aprobar la solicitud.
              </p>
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" {...register("telefono")} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="domicilio">Domicilio</Label>
            <Input id="domicilio" {...register("domicilio")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localidad">Localidad</Label>
            <Input id="localidad" {...register("localidad")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Input id="provincia" {...register("provincia")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentación (opcional)</CardTitle>
          <CardDescription>
            Podés adjuntarla ahora o más adelante — no bloquea el envío de la solicitud.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="documentoIdentidad">Documento de identidad</Label>
            <Input
              id="documentoIdentidad"
              type="file"
              onChange={(event) => setDocumentoIdentidad(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fichaMedica">Ficha médica</Label>
            <Input
              id="fichaMedica"
              type="file"
              onChange={(event) => setFichaMedica(event.target.files?.[0] ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contraseña de tu cuenta</CardTitle>
          <CardDescription>
            La vas a usar para consultar el estado de tu solicitud e iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>

          <ul className="space-y-1" aria-label="Requisitos de la contraseña">
            {PASSWORD_REQUIREMENTS.map((requirement) => {
              const met = requirement.test(passwordValue);
              return (
                <li
                  key={requirement.key}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    met ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {met ? (
                    <Check className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <X className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  {requirement.label}
                </li>
              );
            })}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground hover:underline"
          >
            Ya tengo una cuenta
          </Link>
        </CardFooter>
      </Card>
    </form>
  );
}
