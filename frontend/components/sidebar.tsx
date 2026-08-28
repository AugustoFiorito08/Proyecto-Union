import Link from "next/link";
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
} from "lucide-react";

// Navegación de Etapa 1 + Etapa 2 parte 1 + Etapa 3 (Finanzas) + Etapa 4
// (Comunicaciones) + Etapa 5 (Control de Acceso, SPEC.md §7.1, route group
// `(dashboard)`). Control de Acceso no tenía ruta prevista en §7 (nunca pasó
// por la auditoría de Figma) — se agregó acá con label pensado para un
// operador de portería, no para el resto del backoffice. El módulo de etapa
// futura (Solicitudes de Membresía) todavía no se lista — se agrega recién
// cuando se implemente su ruta, para no mostrar ítems que hoy darían 404.
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

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="font-heading text-lg font-semibold">
          Proyecto Unión
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
            <Settings className="size-3.5 shrink-0" aria-hidden="true" />
            Configuración
          </div>
          <ul className="space-y-1">
            {CONFIG_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
