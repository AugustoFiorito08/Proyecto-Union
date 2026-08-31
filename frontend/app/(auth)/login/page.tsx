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
    /* El login comparte el fondo verde profundo, la tipografía y la forma de
       los botones de la landing: quien entra tiene que sentir que cruza la
       puerta del mismo club, no que aterrizó en un formulario cualquiera. A
       diferencia del resto de la app, fija su paleta explícitamente (es una
       pantalla de marca, no debe cambiar con el tema del sistema). */
    /* Corte duro entre los dos campos de color en vez de una tarjeta flotando
       sobre el fondo: se lee como una puerta, no como un widget. En pantallas
       chicas el mismo corte rota — banda verde con la identidad arriba,
       formulario abajo — para que el escudo nunca desaparezca. */
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ---------- Identidad ---------- */}
      <aside className="flex flex-col items-center justify-center gap-5 bg-[#062A19] px-6 py-10 text-center lg:w-[45%] lg:gap-6 lg:py-12">
        <LogoCau className="size-20 lg:size-44" />
        <div>
          <h2 className="font-display text-xl uppercase leading-tight tracking-tight text-white lg:text-3xl">
            Club Atlético Unión
          </h2>
          <div className="mx-auto mt-4 h-px w-16 bg-white/25 lg:mt-5" />
          <p className="mt-4 font-condensed text-xs font-semibold uppercase tracking-[0.32em] text-[#4FD98A] lg:mt-5 lg:text-sm">
            Pasión · Compromiso · Familia
          </p>
        </div>
      </aside>

      {/* ---------- Formulario ---------- */}
      <main className="flex flex-1 items-center justify-center bg-[#F2F5F1] px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl uppercase leading-tight tracking-tight text-[#062A19]">
            Ingresá al club
          </h1>
          <p className="mt-2 text-[#062A19]/60">Acceso para socios y staff.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {serverError ? (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {serverError}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-[#062A19]/70"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@club.com"
                aria-invalid={!!errors.email}
                className="h-12 rounded-xl border-[#062A19]/15 bg-white text-base shadow-none focus-visible:border-[#00923F] focus-visible:ring-[#00923F]/25"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label
                  htmlFor="password"
                  className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-[#062A19]/70"
                >
                  Contraseña
                </Label>
                <Link
                  href="/recuperar-password"
                  className="rounded text-sm text-[#00923F] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00923F]"
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="h-12 rounded-xl border-[#062A19]/15 bg-white text-base shadow-none focus-visible:border-[#00923F] focus-visible:ring-[#00923F]/25"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-full bg-[#00923F] font-condensed text-base font-bold uppercase tracking-widest text-white hover:bg-[#00A648] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00923F]"
            >
              {isSubmitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          {/* SPEC.md §7.1: "el de socio agrega CTA 'Solicitar una cuenta'" — un
              único componente de login sirve a staff/instructor/socio, así que
              el CTA se muestra siempre en vez de bifurcar el componente por
              audiencia (no hay forma de saber, antes de loguearse, si quien
              visita `/login` es un aspirante a socio o un empleado). Usa el
              mismo vocabulario que la landing ("Sumate al club"). */}
          <p className="mt-8 border-t border-[#062A19]/10 pt-6 text-center text-sm text-[#062A19]/60">
            ¿Todavía no sos socio?{" "}
            <Link
              href="/solicitud-membresia"
              className="rounded font-semibold text-[#00923F] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00923F]"
            >
              Sumate al club
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
