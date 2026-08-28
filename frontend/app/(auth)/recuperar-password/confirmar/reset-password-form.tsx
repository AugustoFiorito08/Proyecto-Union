"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CardContent, CardFooter } from "@/components/ui/card";

// RN-LOG-01 (SPEC.md §3.10): mínimo 8 caracteres, una mayúscula, una
// minúscula y un número. Configurable a futuro desde Configuración General;
// por ahora es la política por defecto, hardcodeada acá y en el checklist.
const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Al menos una mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Al menos una minúscula", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", label: "Al menos un número", test: (v: string) => /[0-9]/.test(v) },
] as const;

const resetPasswordSchema = z
  .object({
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

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = useWatch({ control, name: "password" }) ?? "";

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);

    if (!token) {
      setServerError(
        "El enlace no incluye un token válido. Solicitá uno nuevo desde 'Recuperar contraseña'."
      );
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setServerError(
          (data as { message?: string } | null)?.message ??
            "No se pudo restablecer la contraseña."
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError("No se pudo conectar con el servidor. Intentá nuevamente.");
    }
  }

  if (submitted) {
    return (
      <CardContent className="space-y-4">
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
          Tu contraseña se actualizó correctamente. Ya podés iniciar sesión.
        </p>
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Ir a iniciar sesión
        </Link>
      </CardContent>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <CardContent className="space-y-4">
        {serverError ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
        </Button>
        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </CardFooter>
    </form>
  );
}
