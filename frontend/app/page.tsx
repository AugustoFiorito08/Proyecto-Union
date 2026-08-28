import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Landing pública (SPEC.md §7.1) — placeholder de Etapa 0. El contenido
// real se construye en una etapa posterior; por ahora solo habilita el
// acceso al login.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Proyecto Unión</h1>
        <p className="text-muted-foreground">
          Sistema de gestión del Club Atlético Unión (CAU).
        </p>
      </div>
      <Link href="/login" className={cn(buttonVariants())}>
        Iniciar sesión
      </Link>
    </div>
  );
}
