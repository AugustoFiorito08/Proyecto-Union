"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { InstructorAltaResult } from "@/lib/types";
import { crearInstructor } from "./actions";

const instructorSchema = z.object({
  apellido: z.string().min(1, "Ingresá el apellido."),
  nombres: z.string().min(1, "Ingresá los nombres."),
  dni: z
    .string()
    .min(1, "Ingresá el DNI.")
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos."),
  telefono: z.string().optional(),
  email: z.string().min(1, "Ingresá el email.").email("Ingresá un email válido."),
  especialidad: z.string().optional(),
});

type InstructorFormValues = z.infer<typeof instructorSchema>;

const VALORES_INICIALES: InstructorFormValues = {
  apellido: "",
  nombres: "",
  dni: "",
  telefono: "",
  email: "",
  especialidad: "",
};

/**
 * Alta de Instructor (SPEC.md: "el alta debe mostrar la contraseña temporal
 * generada UNA sola vez en un diálogo de confirmación, con aviso de que hay
 * que comunicarla manualmente — el envío por email es Etapa 4"). Se modela
 * como un diálogo de dos pasos: 'form' (mismo patrón que
 * `configuracion/categorias/categoria-dialog.tsx`) y 'password' (solo
 * lectura, no se puede volver a ver la contraseña una vez cerrado).
 */
export function InstructorAltaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "password">("form");
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [creado, setCreado] = useState<InstructorAltaResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorSchema),
    defaultValues: VALORES_INICIALES,
  });

  function onSubmit(values: InstructorFormValues) {
    setServerError(null);
    const input = {
      ...values,
      telefono: values.telefono || undefined,
      especialidad: values.especialidad || undefined,
    };

    startTransition(async () => {
      const result = await crearInstructor(input);
      if (!result.success) {
        setServerError(result.message);
        return;
      }
      setCreado(result.data);
      setStep("password");
      router.refresh();
    });
  }

  function handleClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      reset(VALORES_INICIALES);
      setServerError(null);
      setStep("form");
      setCreado(null);
      setCopiado(false);
    }
  }

  function handleCopiar() {
    if (!creado?.passwordTemporal) return;
    navigator.clipboard?.writeText(creado.passwordTemporal).then(() => {
      setCopiado(true);
    });
  }

  const busy = isSubmitting || isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Nuevo instructor
      </DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <DialogHeader>
              <DialogTitle>Nuevo instructor</DialogTitle>
              <DialogDescription>
                Se crea también su cuenta de acceso al mini-portal del Instructor.
              </DialogDescription>
            </DialogHeader>

            {serverError ? (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {errors.dni ? (
                  <p className="text-sm text-destructive">{errors.dni.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register("telefono")} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="especialidad">Especialidad</Label>
                <Input id="especialidad" placeholder="ej. Natación" {...register("especialidad")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creando..." : "Crear instructor"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Instructor creado</DialogTitle>
              <DialogDescription>
                {creado?.passwordEnviadaPorEmail
                  ? `Se envió la contraseña temporal al email del instructor (${creado?.email}).`
                  : `No se pudo enviar el email a ${creado?.apellido}, ${creado?.nombres}. Comunicále la contraseña manualmente — se muestra una única vez.`}
              </DialogDescription>
            </DialogHeader>

            {creado?.passwordEnviadaPorEmail ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                El instructor ya puede iniciar sesión con la contraseña que recibió por email.
              </p>
            ) : (
              <>
                <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  El envío de email falló. Comunicá esta contraseña temporal manualmente.
                </p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <code className="flex-1 font-mono text-sm">{creado?.passwordTemporal}</code>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCopiar}>
                    <Copy className="size-4" aria-hidden="true" />
                    {copiado ? "Copiada" : "Copiar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Una vez que cierres este diálogo no vas a poder volver a ver esta contraseña.
                </p>
              </>
            )}

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Entendido, cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
