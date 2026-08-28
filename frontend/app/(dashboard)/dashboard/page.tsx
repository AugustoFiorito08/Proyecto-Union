import Link from "next/link";
import { Users, UsersRound, IdCard, HeartPulse, ArrowRight } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    href: "/socios",
    label: "Socios",
    description: "Alta, edición, baja y reactivación de socios.",
    icon: Users,
  },
  {
    href: "/grupos-familiares",
    label: "Grupos Familiares",
    description: "Titulares, integrantes y cuota familiar.",
    icon: UsersRound,
  },
  {
    href: "/configuracion/categorias",
    label: "Categorías",
    description: "Categorías de socio y valor de cuota.",
    icon: IdCard,
  },
  {
    href: "/configuracion/coberturas-medicas",
    label: "Coberturas Médicas",
    description: "Coberturas médicas y sus planes.",
    icon: HeartPulse,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Inicio</h2>
        <p className="text-sm text-muted-foreground">
          Club Atlético Unión — panel de administración.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((module) => (
          <Card key={module.href}>
            <CardHeader>
              <module.icon className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="mt-2">{module.label}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                href={module.href}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Ir al módulo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
