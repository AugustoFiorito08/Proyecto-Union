import { Suspense } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export default function ConfirmarRecuperarPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Elegí una nueva contraseña</CardTitle>
          <CardDescription>
            Ingresá y confirmá tu nueva contraseña para completar la recuperación.
          </CardDescription>
        </CardHeader>

        <Suspense
          fallback={
            <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando...</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}
