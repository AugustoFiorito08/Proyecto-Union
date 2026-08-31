import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MessageCircleQuestion,
  Receipt,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import { getSessionToken } from "@/lib/auth";
import { decodeJwtPayload, nombreParaMostrar, type SessionClaims } from "@/lib/jwt";
import { ESTADO_CONSULTA_A_INT, ESTADO_SOLICITUD_MEMBRESIA_A_INT } from "@/lib/enums";
import type {
  ConsultaSocio,
  FinanzasDashboard,
  PaginatedResult,
  ReporteActividadItem,
  ReporteSocios,
  SolicitudMembresia,
} from "@/lib/types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * `forbidden` es un caso normal, no un error: el panel es la pantalla de inicio
 * de TODOS los roles de staff, y la matriz de permisos (§2.2) no le da Finanzas
 * ni Reportes a Empleado/Secretaría. Una sección sin permiso no se dibuja — no
 * tiene sentido llenarle el inicio de avisos de "no tenés acceso" a quien entra
 * acá todos los días.
 */
async function traer<T>(path: string): Promise<{ data: T | null }> {
  try {
    return { data: await apiFetch<T>(path) };
  } catch (error) {
    void (error instanceof ApiError);
    return { data: null };
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

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 13) return "Buen día";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/**
 * Tarjeta de un pendiente accionable: toda la tarjeta es el enlace al módulo
 * donde eso se resuelve. Sólo se dibuja cuando hay algo pendiente — cuatro
 * ceros en gris se leían como una pantalla rota, no como "todo bien" (para eso
 * está `<TodoAlDia />`).
 */
function Pendiente({
  href,
  etiqueta,
  cantidad,
  accion,
  icono: Icono,
  urgente,
}: {
  href: string;
  etiqueta: string;
  cantidad: number;
  accion: string;
  icono: typeof Users;
  urgente?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border p-5 transition-colors",
        urgente
          ? "border-destructive/25 bg-destructive/5 hover:bg-destructive/10"
          : "border-primary/20 bg-primary/5 hover:bg-primary/10",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          urgente ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
        )}
      >
        <Icono className="size-6" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              urgente ? "text-destructive" : "text-primary",
            )}
          >
            {cantidad}
          </span>
          <span className="truncate text-base font-medium">{etiqueta}</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          {accion}
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </p>
      </div>
    </Link>
  );
}

/** Un pendiente en cero no se oculta en silencio: se dice explícitamente que está al día. */
function TodoAlDia() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <CheckCircle2 className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-base font-semibold">Estás al día</p>
        <p className="text-sm text-muted-foreground">
          No hay solicitudes, consultas, cuotas vencidas ni reservas esperando.
        </p>
      </div>
    </div>
  );
}

/** Cifra de contexto dentro de un panel de estado. La primera de cada panel va destacada. */
function Cifra({
  etiqueta,
  valor,
  icono: Icono,
  destacada,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  icono: typeof Users;
  destacada?: boolean;
  tono?: "neutro" | "ok" | "alerta";
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          destacada ? "size-11" : "size-9",
          tono === "ok"
            ? "bg-primary/12 text-primary"
            : tono === "alerta"
              ? "bg-[#E8A33D]/15 text-[#B87A16] dark:text-[#E8A33D]"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icono className={destacada ? "size-5" : "size-4"} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-bold tabular-nums leading-tight",
            destacada ? "text-3xl" : "text-xl",
          )}
        >
          {valor}
        </p>
        <p className="text-sm text-muted-foreground">{etiqueta}</p>
      </div>
    </div>
  );
}

/**
 * Ocupación por actividad. Barras horizontales: el trabajo del dato es comparar
 * magnitudes entre categorías con nombres largos. Un solo tono verde — el largo
 * de la barra ya codifica la magnitud, así que escalar colores por umbral sería
 * redundante. El rojo queda reservado para la anomalía operativa real
 * (sobrecupo), y siempre acompañado del número, nunca color solo.
 */
function Ocupacion({ actividades }: { actividades: ReporteActividadItem[] }) {
  const conCupo = actividades.filter((a) => a.cupoMaximo > 0).slice(0, 6);

  if (conCupo.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        Todavía no hay actividades con cupo definido.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {conCupo.map((actividad) => {
        const pct = Math.round(actividad.porcentajeOcupacion);
        const sobrecupo = pct > 100;
        return (
          <li key={actividad.actividadId}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-medium">{actividad.nombre}</span>
              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  sobrecupo ? "font-semibold text-destructive" : "text-muted-foreground",
                )}
              >
                {actividad.inscriptosActivos} de {actividad.cupoMaximo}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", sobrecupo ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-12 shrink-0 text-right text-sm font-semibold tabular-nums",
                  sobrecupo ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {pct}%
              </span>
            </div>
            {sobrecupo ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                Sobrecupo: hay más inscriptos que lugares
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Panel de inicio del staff (`/dashboard`). Se ordena por la pregunta real de
 * quien lo abre a la mañana: primero qué necesita atención hoy (accionable),
 * después cómo está el club. Todos los fetches van en paralelo y son
 * independientes: que un rol no tenga permiso sobre Finanzas no puede vaciarle
 * el inicio.
 */
export default async function DashboardPage() {
  const token = await getSessionToken();
  const claims = token ? decodeJwtPayload<SessionClaims>(token) : null;
  const nombre = nombreParaMostrar(claims);

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
    solicitudesPendientes
      ? {
          href: "/solicitudes-membresia",
          etiqueta:
            solicitudesPendientes === 1 ? "solicitud por revisar" : "solicitudes por revisar",
          cantidad: solicitudesPendientes,
          accion: "Revisar solicitudes",
          icono: ClipboardCheck,
        }
      : null,
    consultasPendientes
      ? {
          href: "/consultas",
          etiqueta: consultasPendientes === 1 ? "consulta sin responder" : "consultas sin responder",
          cantidad: consultasPendientes,
          accion: "Responder consultas",
          icono: MessageCircleQuestion,
        }
      : null,
    finanzas.data?.cuotasVencidas
      ? {
          href: "/pagos",
          etiqueta: finanzas.data.cuotasVencidas === 1 ? "cuota vencida" : "cuotas vencidas",
          cantidad: finanzas.data.cuotasVencidas,
          accion: "Ver pagos",
          icono: Receipt,
          urgente: true,
        }
      : null,
    finanzas.data?.reservasPagadasPendientesDeCheck
      ? {
          href: "/reservas",
          etiqueta:
            finanzas.data.reservasPagadasPendientesDeCheck === 1
              ? "reserva por revisar"
              : "reservas por revisar",
          cantidad: finanzas.data.reservasPagadasPendientesDeCheck,
          accion: "Ver reservas",
          icono: ClipboardCheck,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  /* Sólo se puede afirmar "estás al día" si de verdad se pudieron leer los
     pendientes. Si ningún fetch respondió, no hay nada que afirmar. */
  const pudoLeerPendientes =
    solicitudesPendientes !== null || consultasPendientes !== null || finanzas.data !== null;

  const cantidadPorEstado = (estado: string) =>
    socios.data?.porEstado.find((fila) => fila.estado === estado)?.cantidad ?? 0;

  const suspendidos = cantidadPorEstado("Suspendido");
  const hayEstadoDelClub = Boolean(socios.data || finanzas.data || actividades.data);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-heading text-3xl font-bold tracking-tight">
          {saludo()}
          {nombre ? `, ${nombre}` : ""}
        </h2>
        <p className="mt-1 text-muted-foreground first-letter:uppercase">
          {FECHA_LARGA.format(new Date())}
        </p>
      </header>

      {pendientes.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">Necesita tu atención</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {pendientes.map((item) => (
              <Pendiente key={item.href + item.etiqueta} {...item} />
            ))}
          </div>
        </section>
      ) : pudoLeerPendientes ? (
        <TodoAlDia />
      ) : null}

      {hayEstadoDelClub ? (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {socios.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Socios</CardTitle>
                <CardAction>
                  <Link
                    href="/socios"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Ver todos
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-5">
                <Cifra
                  etiqueta="activos"
                  valor={String(cantidadPorEstado("Activo"))}
                  icono={UserCheck}
                  tono="ok"
                  destacada
                />
                <Cifra
                  etiqueta="suspendidos"
                  valor={String(suspendidos)}
                  icono={UserX}
                  tono={suspendidos > 0 ? "alerta" : "neutro"}
                />
                <Cifra
                  etiqueta="inactivos"
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
                <CardAction>
                  <Link
                    href="/finanzas/dashboard"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Ver detalle
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-5">
                <Cifra
                  etiqueta="ingresos del mes"
                  valor={moneda(finanzas.data.ingresosMesActual)}
                  icono={TrendingUp}
                  tono="ok"
                  destacada
                />
                <Cifra
                  etiqueta="cuotas pendientes de cobro"
                  valor={String(finanzas.data.cuotasPendientes)}
                  icono={Wallet}
                />
                <Cifra
                  etiqueta="socios con deuda"
                  valor={String(finanzas.data.sociosMorosos)}
                  icono={AlertTriangle}
                  tono={finanzas.data.sociosMorosos > 0 ? "alerta" : "neutro"}
                />
              </CardContent>
            </Card>
          ) : null}

          {actividades.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ocupación de actividades</CardTitle>
                <CardAction>
                  <Link
                    href="/reportes"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Ver todas
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Ocupacion actividades={actividades.data} />
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      {pendientes.length === 0 && !pudoLeerPendientes && !hayEstadoDelClub ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No se pudo cargar el panel. Revisá tu conexión y volvé a intentar en unos minutos.
        </p>
      ) : null}
    </div>
  );
}
