import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  MessageCircleQuestion,
  Receipt,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import { ESTADO_CONSULTA_A_INT, ESTADO_SOLICITUD_MEMBRESIA_A_INT } from "@/lib/enums";
import type {
  ConsultaSocio,
  FinanzasDashboard,
  PaginatedResult,
  ReporteActividadItem,
  ReporteSocios,
  SolicitudMembresia,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Resultado de cada fetch del panel. `forbidden` es un caso normal, no un
 * error: el panel es la pantalla de inicio de TODOS los roles de staff, y la
 * matriz de permisos (§2.2) no le da Finanzas ni Reportes a Empleado/
 * Secretaría. Una sección sin permiso simplemente no se dibuja — no tiene
 * sentido llenarle el inicio de avisos de "no tenés acceso" a quien entra acá
 * todos los días.
 */
interface Fetch<T> {
  data: T | null;
  forbidden: boolean;
}

async function traer<T>(path: string): Promise<Fetch<T>> {
  try {
    return { data: await apiFetch<T>(path), forbidden: false };
  } catch (error) {
    return {
      data: null,
      forbidden: error instanceof ApiError && error.status === 403,
    };
  }
}

/** Varios listados devuelven `PagedResult` incluso sin paginar — patrón recurrente desde Etapa 3. */
function contar<T>(resultado: PaginatedResult<T> | T[] | null): number | null {
  if (resultado === null) return null;
  if (Array.isArray(resultado)) return resultado.length;
  return resultado.totalCount ?? resultado.items.length;
}

function moneda(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Tarjeta de un pendiente accionable. Toda la tarjeta es el enlace al módulo
 * donde se resuelve: el panel no informa por informar, lleva al lugar donde se
 * hace algo. Cuando el contador está en cero se muestra igual, en tono neutro
 * — que no haya nada pendiente también es información.
 */
function Pendiente({
  href,
  etiqueta,
  cantidad,
  icono: Icono,
  urgente,
}: {
  href: string;
  etiqueta: string;
  cantidad: number;
  icono: typeof Users;
  urgente?: boolean;
}) {
  const hay = cantidad > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start justify-between gap-2.5 rounded-xl border p-3.5 transition-colors sm:p-4",
        hay && urgente
          ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
          : hay
            ? "border-primary/25 bg-primary/5 hover:bg-primary/10"
            : "border-border bg-card hover:bg-muted",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm leading-snug text-muted-foreground">{etiqueta}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums sm:text-3xl",
            hay && urgente ? "text-destructive" : hay ? "text-primary" : "text-muted-foreground",
          )}
        >
          {cantidad}
        </p>
      </div>
      <Icono
        className={cn(
          "size-5 shrink-0",
          hay && urgente ? "text-destructive" : hay ? "text-primary" : "text-muted-foreground/60",
        )}
        aria-hidden="true"
      />
    </Link>
  );
}

/** Número de contexto, sin acción asociada: sólo describe el estado del club. */
function Dato({
  etiqueta,
  valor,
  icono: Icono,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Users;
  tono?: "neutro" | "ok" | "alerta";
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border pt-4">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{etiqueta}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      </div>
      <Icono
        className={cn(
          "size-5 shrink-0",
          tono === "ok"
            ? "text-primary"
            : tono === "alerta"
              ? "text-[#C2810A] dark:text-[#E8A33D]"
              : "text-muted-foreground/60",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Ocupación por actividad. Barras horizontales: el trabajo del dato es comparar
 * magnitudes entre categorías con nombres largos. Un solo tono verde — el largo
 * de la barra ya codifica la magnitud, así que escalar colores por umbral sería
 * redundante. El rojo queda reservado para la anomalía operativa real
 * (sobrecupo, >100%), y siempre acompañado del número, nunca color solo.
 */
function Ocupacion({ actividades }: { actividades: ReporteActividadItem[] }) {
  const conCupo = actividades.filter((a) => a.cupoMaximo > 0).slice(0, 8);

  if (conCupo.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        No hay actividades con cupo definido.
      </p>
    );
  }

  return (
    <ul className="space-y-3.5">
      {conCupo.map((actividad) => {
        const pct = Math.round(actividad.porcentajeOcupacion);
        const sobrecupo = pct > 100;
        return (
          <li key={actividad.actividadId}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{actividad.nombre}</span>
              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  sobrecupo ? "font-semibold text-destructive" : "text-muted-foreground",
                )}
              >
                {actividad.inscriptosActivos}/{actividad.cupoMaximo}
                <span className="ml-1.5">({pct}%)</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", sobrecupo ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
              />
            </div>
            {sobrecupo ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                Sobrecupo
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Panel de inicio del staff (`/dashboard`). Reemplaza la grilla de accesos
 * directos que había — era un menú, no un panel, y además duplicaba el sidebar
 * quedándose sólo con los 4 módulos de la Etapa 1.
 *
 * Se ordena por la pregunta real de quien lo abre a la mañana: primero qué
 * necesita atención hoy (accionable, cada tarjeta lleva a su módulo), después
 * cómo está el club. Todos los fetches van en paralelo y son independientes:
 * que un rol no tenga permiso sobre Finanzas no puede vaciarle el inicio.
 */
export default async function DashboardPage() {
  const [finanzas, socios, actividades, solicitudes, consultas] = await Promise.all([
    traer<FinanzasDashboard>("/api/finanzas/dashboard"),
    traer<ReporteSocios>("/api/reportes/socios"),
    traer<ReporteActividadItem[]>("/api/reportes/actividades"),
    traer<PaginatedResult<SolicitudMembresia> | SolicitudMembresia[]>(
      `/api/solicitudes-membresia?estado=${ESTADO_SOLICITUD_MEMBRESIA_A_INT.Pendiente}`,
    ),
    traer<PaginatedResult<ConsultaSocio> | ConsultaSocio[]>(
      `/api/consultas?estado=${ESTADO_CONSULTA_A_INT.Pendiente}`,
    ),
  ]);

  const solicitudesPendientes = contar(solicitudes.data);
  const consultasPendientes = contar(consultas.data);

  const pendientes = [
    solicitudesPendientes !== null && {
      href: "/solicitudes-membresia",
      etiqueta: "Solicitudes por revisar",
      cantidad: solicitudesPendientes,
      icono: ClipboardCheck,
    },
    consultasPendientes !== null && {
      href: "/consultas",
      etiqueta: "Consultas sin responder",
      cantidad: consultasPendientes,
      icono: MessageCircleQuestion,
    },
    finanzas.data && {
      href: "/pagos",
      etiqueta: "Cuotas vencidas",
      cantidad: finanzas.data.cuotasVencidas,
      icono: Receipt,
      urgente: true,
    },
    finanzas.data && {
      href: "/reservas",
      etiqueta: "Reservas por revisar",
      cantidad: finanzas.data.reservasPagadasPendientesDeCheck,
      icono: ClipboardCheck,
    },
  ].filter(Boolean) as Array<Parameters<typeof Pendiente>[0] & { href: string }>;

  const cantidadPorEstado = (estado: string) =>
    socios.data?.porEstado.find((fila) => fila.estado === estado)?.cantidad ?? 0;

  const hayEstadoDelClub = Boolean(socios.data || finanzas.data);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Inicio</h2>
        <p className="text-sm text-muted-foreground">
          Lo que necesita atención hoy y cómo viene el club.
        </p>
      </div>

      {pendientes.length > 0 ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Requiere atención
          </h3>
          {/* Dos columnas ya desde mobile: cuatro tarjetas apiladas obligaban a
              scrollear casi una pantalla entera antes de llegar al estado del club. */}
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pendientes.map((item) => (
              <Pendiente key={item.href + item.etiqueta} {...item} />
            ))}
          </div>
        </section>
      ) : null}

      {hayEstadoDelClub ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {socios.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Socios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dato
                  etiqueta="Activos"
                  valor={String(cantidadPorEstado("Activo"))}
                  icono={UserCheck}
                  tono="ok"
                />
                <Dato
                  etiqueta="Suspendidos"
                  valor={String(cantidadPorEstado("Suspendido"))}
                  icono={UserX}
                  tono={cantidadPorEstado("Suspendido") > 0 ? "alerta" : "neutro"}
                />
                <Dato
                  etiqueta="Inactivos"
                  valor={String(cantidadPorEstado("Inactivo"))}
                  icono={Users}
                />
              </CardContent>
            </Card>
          ) : null}

          {finanzas.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Finanzas del mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dato
                  etiqueta="Ingresos"
                  valor={moneda(finanzas.data.ingresosMesActual)}
                  icono={Wallet}
                  tono="ok"
                />
                <Dato
                  etiqueta="Cuotas pendientes"
                  valor={String(finanzas.data.cuotasPendientes)}
                  icono={Receipt}
                />
                <Dato
                  etiqueta="Socios morosos"
                  valor={String(finanzas.data.sociosMorosos)}
                  icono={AlertTriangle}
                  tono={finanzas.data.sociosMorosos > 0 ? "alerta" : "neutro"}
                />
              </CardContent>
            </Card>
          ) : null}

          {actividades.data ? (
            <Card className="lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">Ocupación de actividades</CardTitle>
                <Link
                  href="/reportes"
                  className="inline-flex shrink-0 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                >
                  Ver todo
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardHeader>
              <CardContent>
                <Ocupacion actividades={actividades.data} />
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      {pendientes.length === 0 && !hayEstadoDelClub ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No se pudo cargar el panel. Verificá tu conexión o volvé a intentar en unos minutos.
        </p>
      ) : null}
    </div>
  );
}
