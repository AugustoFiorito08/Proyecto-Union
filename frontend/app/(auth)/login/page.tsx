"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoCau } from "@/components/logo-cau";

const loginSchema = z.object({
  email: z.string().min(1, "Ingresá tu email.").email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setServerError(
          (data as { message?: string } | null)?.message ??
            "No se pudo iniciar sesión. Verificá tus datos."
        );
        return;
      }

      router.push("/dashboard");
    } catch {
      setServerError("No se pudo conectar con el servidor. Intentá nuevamente.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Panel partido del diseño de Figma: identidad del club a la izquierda,
          formulario a la derecha. En mobile el panel verde se oculta y queda
          solo el formulario, con el escudo arriba (ver `<CardHeader>`). */}
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-sm md:grid-cols-2">
        <aside className="relative hidden flex-col items-center justify-center gap-1 overflow-hidden bg-[#0E663B] p-10 text-center text-white md:flex">
          {/* Escudo grande de marca de agua, detrás del logo principal. */}
          <LogoCau
            variant="monocromo"
            className="pointer-events-none absolute inset-0 m-auto size-[115%] opacity-[0.06]"
            aria-hidden="true"
          />
          <LogoCau className="relative size-40 drop-shadow-sm" />
          <h1 className="relative mt-5 font-heading text-2xl font-bold uppercase tracking-tight">
            Club Atlético Unión
          </h1>
          <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-white/75">
            Pasión · Compromiso · Familia
          </p>
        </aside>

        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="items-center text-center">
            <LogoCau className="mx-auto mb-2 size-14 md:hidden" />
            <CardTitle className="text-2xl">Bienvenido</CardTitle>
            <CardDescription>Iniciá sesión para continuar</CardDescription>
          </CardHeader>

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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@club.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
            <Link
              href="/recuperar-password"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            {/* SPEC.md §7.1: "el de socio agrega CTA 'Solicitar una cuenta'"
                — un único componente de login sirve a staff/instructor/socio,
                así que el CTA se muestra siempre en vez de bifurcar el
                componente por audiencia (no hay forma de saber, antes de
                loguearse, si quien visita `/login` es un aspirante a socio o
                un empleado). */}
            <Link
              href="/solicitud-membresia"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              Solicitar una cuenta
            </Link>
          </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
