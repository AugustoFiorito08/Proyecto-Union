"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  UsersRound,
  Settings,
  IdCard,
  HeartPulse,
  Dumbbell,
  Contact,
  Building2,
  CalendarClock,
  Sparkles,
  Receipt,
  LineChart,
  SlidersHorizontal,
  Tags,
  Mail,
  MessageCircleQuestion,
  ScanLine,
  History,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

import { LogoCau } from "@/components/logo-cau";
import { cn } from "@/lib/utils";

// Navegación de Etapa 1 + Etapa 2 parte 1 + Etapa 3 (Finanzas) + Etapa 4
// (Comunicaciones) + Etapa 5 (Control de Acceso) + Etapa 6 (Solicitudes de
// Membresía) + Etapa 7 (Reportes, SPEC.md §7.1, route group `(dashboard)`).
// Control de Acceso, Solicitudes de Membresía y Reportes no tenían ruta
// prevista en §7 (nunca pasaron por la auditoría de Figma) — se agregan acá
// con el mismo criterio ya usado para Control de Acceso en Etapa 5. Reportes
// se ubica al final de la navegación principal (antes de "Configuración"),
// siguiendo el mismo criterio que Finanzas: es una pantalla de consulta
// transversal a varios módulos, no un listado de un recurso puntual.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/socios", label: "Socios", icon: Users },
  { href: "/grupos-familiares", label: "Grupos Familiares", icon: UsersRound },
  { href: "/actividades", label: "Actividades", icon: Dumbbell },
  { href: "/instructores", label: "Instructores", icon: Contact },
  { href: "/espacios", label: "Espacios", icon: Building2 },
  { href: "/reservas", label: "Reservas", icon: CalendarClock },
  { href: "/control-acceso", label: "Control de Acceso", icon: ScanLine },
  { href: "/control-acceso/historial", label: "Historial de Accesos", icon: History },
  { href: "/pagos", label: "Pagos", icon: Receipt },
  { href: "/finanzas/dashboard", label: "Finanzas", icon: LineChart },
  { href: "/comunicaciones", label: "Comunicaciones", icon: Mail },
  { href: "/consultas", label: "Consultas del Socio", icon: MessageCircleQuestion },
  { href: "/solicitudes-membresia", label: "Solicitudes de Membresía", icon: ClipboardCheck },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
] as const;

const CONFIG_ITEMS = [
  { href: "/configuracion/categorias", label: "Categorías", icon: IdCard },
  {
    href: "/configuracion/coberturas-medicas",
    label: "Coberturas Médicas",
    icon: HeartPulse,
  },
  { href: "/configuracion/amenities", label: "Amenities", icon: Sparkles },
  {
    href: "/configuracion/conceptos-ingreso-libre",
    label: "Conceptos de Ingreso",
    icon: Tags,
  },
  { href: "/configuracion/general", label: "General", icon: SlidersHorizontal },
] as const;

/**
 * Ítem de navegación con estado activo (píldora blanca sobre el verde
 * institucional, como en el diseño de Figma). El estado activo se resuelve con
 * `usePathname()` — por eso el sidebar es un Client Component: sin él, con el
 * fondo verde sólido, todos los ítems se ven iguales y no hay forma de saber en
 * qué sección estás.
 */
function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
}) {
  // Coincidencia exacta o de prefijo de segmento, para que `/socios/123` marque
  // "Socios" pero `/control-acceso/historial` no marque también "Control de
  // Acceso" (ambas rutas conviven en la navegación como ítems distintos).
  const activo =
    pathname === href ||
    (pathname.startsWith(`${href}/`) &&
      !NAV_ITEMS.some((otro) => otro.href !== href && otro.href === pathname));

  return (
    <li>
      <Link
        href={href}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          activo
            ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoCau className="size-8 shrink-0" />
          <span className="font-heading text-base font-bold leading-tight">
            Club Atlético Unión
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </ul>

        <div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
            <Settings className="size-3.5 shrink-0" aria-hidden="true" />
            Configuración
          </div>
          <ul className="space-y-1">
            {CONFIG_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
