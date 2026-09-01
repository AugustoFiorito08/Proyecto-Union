import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  MessageCircleQuestion,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import { apiFetch, apiFetchList } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";
import { decodeJwtPayload, nombreParaMostrar, type SessionClaims } from "@/lib/jwt";
import { ESTADO_CONSULTA_A_INT, ESTADO_SOLICITUD_MEMBRESIA_A_INT } from "@/lib/enums";
import type {
  ActividadResumen,
  Comunicacion,
  ConsultaSocio,
  FinanzasDashboard,
  Reserva,
  ReporteActividadItem,
  ReporteSocios,
  SolicitudMembresia,
} from "@/lib/types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarrasActividades, DonutCategorias } from "@/components/dashboard-charts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Un fetch fallido devuelve `null` y su sección no se dibuja. Que un rol no
 * tenga permiso es un caso normal, no un error: la matriz §2.2 no le da
 * Finanzas ni Reportes a Empleado/Secretaría, y el panel es la pantalla de
 * inicio de TODOS los roles de staff.
 */
async function traer<T>(fn: () => Promise<T>): Promise<T | null> {
  return fn().catch(() => null);
}

function moneda(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function isoDeDia(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Tarjeta de indicador con el ícono en círculo tintado, como en el diseño.
 *
 * `variacion` solo se pasa cuando se puede calcular de verdad contra datos
 * reales. El mockup muestra un "↑8.5% vs mes anterior" en Socios y otro en
 * Ingresos, pero no hay ningún endpoint que devuelva la serie histórica: esos
 * porcentajes serían inventados, así que la tarjeta simplemente no los muestra.
 */
function Indicador({
  etiqueta,
  valor,
  icono: Icono,
  tono,
  variacion,
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Users;
  tono: "verde" | "azul" | "naranja";
  variacion?: { pct: number; contra: string };
}) {
  const tonos = {
    verde: "bg-primary/12 text-primary",
    azul: "bg-[#145EC8]/12 text-[#145EC8] dark:text-[#6FA8F0]",
    naranja: "bg-[#F47338]/15 text-[#C6541D] dark:text-[#F49460]",
  } as const;

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full",
            tonos[tono],
          )}
        >
          <Icono className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{etiqueta}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{valor}</span>
            {variacion ? (
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  variacion.pct >= 0 ? "text-primary" : "text-destructive",
                )}
              >
                {variacion.pct >= 0 ? "↑" : "↓"} {Math.abs(variacion.pct)}%
              </span>
            ) : null}
          </p>
          {variacion ? (
            <p className="text-xs text-muted-foreground">{variacion.contra}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Aviso accionable. Solo se dibuja cuando hay algo pendiente de verdad. */
function Pendiente({
  href,
  texto,
  cantidad,
  icono: Icono,
  urgente,
}: {
  href: string;
  texto: string;
  cantidad: number;
  icono: typeof Users;
  urgente?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        urgente
          ? "border-destructive/25 bg-destructive/5 hover:bg-destructive/10"
          : "border-primary/20 bg-primary/5 hover:bg-primary/10",
      )}
    >
      <Icono
        className={cn("size-5 shrink-0", urgente ? "text-destructive" : "text-primary")}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-sm">
        <span
          className={cn(
            "font-bold tabular-nums",
            urgente ? "text-destructive" : "text-primary",
          )}
        >
          {cantidad}
        </span>{" "}
        {texto}
      </p>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Panel de inicio del staff (`/dashboard`), alineado con el diseño de Figma
 * ("CAU - Inicio", nodo 942:7104): saludo, tres indicadores con ícono en
 * círculo, y debajo composición de socios, comunicaciones recientes y
 * actividades, más el gráfico de deportistas por actividad.
 *
 * Dos desvíos deliberados respecto del mockup, ambos por honestidad con los
 * datos que el sistema realmente tiene:
 *  - No se muestran variaciones porcentuales donde no hay serie histórica que
 *    permita calcularlas (ver `<Indicador />`). La única real es reservas de
 *    hoy contra ayer, que sí se puede consultar.
 *  - El panel "Actividades próximas" del diseño lista eventos con fecha
 *    ("Torneo de Tenis, 24-26 de mayo"). El sistema no modela eventos: las
 *    Actividades tienen agenda semanal (`dias`, `horarioInicio`). Se muestra
 *    esa agenda, que es el dato equivalente que sí existe.
 *
 * Se conserva además la franja de pendientes accionables, que el diseño no
 * tiene: desaparece por completo cuando no hay nada esperando, así que en
 * estado normal la pantalla coincide con el mockup.
 */
export default async function DashboardPage() {
  const token = await getSessionToken();
  const nombre = nombreParaMostrar(token ? decodeJwtPayload<SessionClaims>(token) : null);

  const hoy = isoDeDia();
  const ayer = isoDeDia(-1);

  const [
    socios,
    finanzas,
    ocupacion,
    actividades,
    comunicaciones,
    reservasHoy,
    reservasAyer,
    solicitudes,
    consultas,
  ] = await Promise.all([
    traer(() => apiFetch<ReporteSocios>("/api/reportes/socios")),
    traer(() => apiFetch<FinanzasDashboard>("/api/finanzas/dashboard")),
    traer(() => apiFetchList<ReporteActividadItem>("/api/reportes/actividades")),
    traer(() => apiFetchList<ActividadResumen>("/api/actividades")),
    traer(() => apiFetchList<Comunicacion>("/api/comunicaciones")),
    traer(() => apiFetchList<Reserva>(`/api/reservas?fecha=${hoy}`)),
    traer(() => apiFetchList<Reserva>(`/api/reservas?fecha=${ayer}`)),
    traer(() =>
      apiFetchList<SolicitudMembresia>(
        `/api/solicitudes-membresia?estado=${ESTADO_SOLICITUD_MEMBRESIA_A_INT.Pendiente}`,
      ),
    ),
    traer(() =>
      apiFetchList<ConsultaSocio>(`/api/consultas?estado=${ESTADO_CONSULTA_A_INT.Pendiente}`),
    ),
  ]);

  const cantidadPorEstado = (estado: string) =>
    socios?.porEstado.find((f) => f.estado === estado)?.cantidad ?? 0;

  // Única variación calculable con datos reales: cuántas reservas hay hoy
  // contra las de ayer. Si ayer no hubo ninguna, no hay base para un
  // porcentaje y se omite en vez de mostrar algo engañoso.
  const variacionReservas =
    reservasHoy && reservasAyer && reservasAyer.length > 0
      ? {
          pct: Math.round(((reservasHoy.length - reservasAyer.length) / reservasAyer.length) * 100),
          contra: "vs. ayer",
        }
      : undefined;

  const pendientes = [
    solicitudes?.length
      ? {
          href: "/solicitudes-membresia",
          cantidad: solicitudes.length,
          texto:
            solicitudes.length === 1 ? "solicitud por revisar" : "solicitudes por revisar",
          icono: ClipboardCheck,
        }
      : null,
    consultas?.length
      ? {
          href: "/consultas",
          cantidad: consultas.length,
          texto:
            consultas.length === 1 ? "consulta sin responder" : "consultas sin responder",
          icono: MessageCircleQuestion,
        }
      : null,
    finanzas?.cuotasVencidas
      ? {
          href: "/pagos",
          cantidad: finanzas.cuotasVencidas,
          texto: finanzas.cuotasVencidas === 1 ? "cuota vencida" : "cuotas vencidas",
          icono: Receipt,
          urgente: true,
        }
      : null,
  ].filter((p): p is NonNullable<typeof p> => p !== null);

  const comunicacionesRecientes = (comunicaciones ?? []).slice(0, 3);
  const actividadesConAgenda = (actividades ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          ¡Bienvenido{nombre ? `, ${nombre}` : ""}!
        </h2>
        <p className="mt-0.5 text-muted-foreground">
          Acá tenés un resumen de la gestión del club.
        </p>
      </header>

      {pendientes.length > 0 ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pendientes.map((p) => (
            <Pendiente key={p.href} {...p} />
          ))}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {socios ? (
          <Indicador
            etiqueta="Socios activos"
            valor={String(cantidadPorEstado("Activo"))}
            icono={Users}
            tono="verde"
          />
        ) : null}
        {reservasHoy ? (
          <Indicador
            etiqueta="Reservas hoy"
            valor={String(reservasHoy.length)}
            icono={CalendarDays}
            tono="azul"
            variacion={variacionReservas}
          />
        ) : null}
        {finanzas ? (
          <Indicador
            etiqueta="Ingresos del mes"
            valor={moneda(finanzas.ingresosMesActual)}
            icono={Wallet}
            tono="naranja"
          />
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {socios ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Socios por categoría</CardTitle>
              <CardAction>
                <Link
                  href="/reportes"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Ver reporte
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DonutCategorias
                porciones={socios.porCategoria.map((c) => ({
                  clave: c.categoriaId,
                  etiqueta: c.categoriaNombre,
                  cantidad: c.cantidad,
                }))}
              />
            </CardContent>
          </Card>
        ) : null}

        {comunicaciones ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comunicaciones recientes</CardTitle>
              <CardAction>
                <Link
                  href="/comunicaciones"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Ver todas
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {comunicacionesRecientes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  Todavía no se envió ninguna comunicación.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {comunicacionesRecientes.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <MessageCircleQuestion className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.asunto}</p>
                        {c.descripcion ? (
                          <p className="truncate text-xs text-muted-foreground">{c.descripcion}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {FECHA_CORTA.format(new Date(c.fechaCreacion))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {actividades ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividades</CardTitle>
              <CardAction>
                <Link
                  href="/actividades"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Ver todas
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {actividadesConAgenda.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  Todavía no hay actividades cargadas.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {actividadesConAgenda.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <CalendarDays className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[a.dias, `${a.horarioInicio.slice(0, 5)} a ${a.horarioFin.slice(0, 5)}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {a.cupoOcupado}/{a.cupoMaximo}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {ocupacion ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deportistas por actividad</CardTitle>
          </CardHeader>
          <CardContent>
            <BarrasActividades
              barras={ocupacion.map((a) => ({
                clave: a.actividadId,
                etiqueta: a.nombre,
                valor: a.inscriptosActivos,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      {!socios && !finanzas && !ocupacion && !actividades && !comunicaciones ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          No se pudo cargar el panel. Revisá tu conexión y volvé a intentar en unos minutos.
        </p>
      ) : null}
    </div>
  );
}
