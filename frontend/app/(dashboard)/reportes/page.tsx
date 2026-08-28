import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ScanLine,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import type { ReporteActividadItem, ReporteEspacioItem, ReporteSocios } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCardRow, type KpiCardItem } from "@/components/kpi-card-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ReportesEspaciosFiltro } from "./reportes-espacios-filtro";

export const dynamic = "force-dynamic";

interface ReportesPageProps {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}

interface FetchResult<T> {
  data: T | null;
  error: string | null;
  forbidden: boolean;
}

/**
 * Los 3 fetches de este módulo se manejan de forma independiente entre sí
 * (mismo criterio que `/finanzas/dashboard` y `/configuracion/general`,
 * Etapas 3 y 6): el backend restringe el módulo entero a
 * SuperAdmin/Administrador (403 para cualquier otro rol), así que un tab
 * fallando no debe romper los otros — cada `fetchReporte*` distingue 403 de
 * cualquier otro error para mostrar un mensaje específico en su propio tab.
 */
async function fetchReporte<T>(path: string): Promise<FetchResult<T>> {
  try {
    const data = await apiFetch<T>(path);
    return { data, error: null, forbidden: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { data: null, error: null, forbidden: true };
    }
    return {
      data: null,
      error: error instanceof Error ? error.message : "No se pudo cargar el reporte.",
      forbidden: false,
    };
  }
}

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

function ForbiddenMessage() {
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      No tenés permiso para ver este reporte. Esta sección es exclusiva de SuperAdmin y
      Administrador.
    </p>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{text}</p>;
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

/** Tono de la barra de ocupación de `<ActividadesTable />`: alerta visual progresiva, mismo criterio de tonos que `<KpiCardRow />`. */
function ocupacionTone(porcentaje: number): string {
  if (porcentaje >= 100) return "bg-destructive";
  if (porcentaje >= 80) return "bg-amber-500 dark:bg-amber-600";
  return "bg-primary";
}

function SociosTab({ result }: { result: FetchResult<ReporteSocios> }) {
  if (result.forbidden) return <ForbiddenMessage />;
  if (result.error) return <ErrorMessage text={result.error} />;
  if (!result.data) return null;

  const { porEstado, sociosMorosos, porCategoria } = result.data;

  // `porEstado` siempre trae los 3 `EstadoSocio` (confirmado contra el
  // backend real) — se busca cada uno por nombre en vez de asumir un orden fijo.
  const cantidadPorEstado = (estado: string) =>
    porEstado.find((fila) => fila.estado === estado)?.cantidad ?? 0;
  const cantidadActivos = cantidadPorEstado("Activo");
  const cantidadSuspendidos = cantidadPorEstado("Suspendido");
  const cantidadInactivos = cantidadPorEstado("Inactivo");

  const items: KpiCardItem[] = [
    { key: "activos", label: "Socios activos", value: String(cantidadActivos), icon: UserCheck },
    {
      key: "suspendidos",
      label: "Socios suspendidos",
      value: String(cantidadSuspendidos),
      icon: UserX,
      tone: cantidadSuspendidos > 0 ? "destructive" : "default",
    },
    {
      key: "inactivos",
      label: "Socios inactivos",
      value: String(cantidadInactivos),
      icon: Users,
    },
    {
      key: "morosos",
      label: "Socios morosos",
      value: String(sociosMorosos),
      icon: AlertTriangle,
      tone: sociosMorosos > 0 ? "destructive" : "default",
    },
  ];

  return (
    <div className="space-y-4">
      <KpiCardRow items={items} />

      <Card>
        <CardHeader>
          <CardTitle>Desglose por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {porCategoria.length === 0 ? (
            <EmptyMessage text="No hay socios registrados por categoría." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porCategoria.map((fila) => (
                  <TableRow key={fila.categoriaId}>
                    <TableCell className="font-medium">{fila.categoriaNombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{fila.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActividadesTab({ result }: { result: FetchResult<ReporteActividadItem[]> }) {
  if (result.forbidden) return <ForbiddenMessage />;
  if (result.error) return <ErrorMessage text={result.error} />;
  if (!result.data) return null;

  if (result.data.length === 0) {
    return <EmptyMessage text="No hay actividades para mostrar." />;
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actividad</TableHead>
            <TableHead className="text-right">Cupo máximo</TableHead>
            <TableHead className="text-right">Inscriptos activos</TableHead>
            <TableHead>Ocupación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((actividad) => {
            const porcentaje = Math.max(0, Math.min(100, actividad.porcentajeOcupacion));
            return (
              <TableRow key={actividad.actividadId}>
                <TableCell className="font-medium">{actividad.nombre}</TableCell>
                <TableCell className="text-right tabular-nums">{actividad.cupoMaximo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {actividad.inscriptosActivos}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", ocupacionTone(porcentaje))}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {Math.round(actividad.porcentajeOcupacion)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EspaciosTab({
  result,
  desde,
  hasta,
}: {
  result: FetchResult<ReporteEspacioItem[]>;
  desde: string;
  hasta: string;
}) {
  return (
    <div className="space-y-4">
      <ReportesEspaciosFiltro desde={desde} hasta={hasta} />

      {result.forbidden ? (
        <ForbiddenMessage />
      ) : result.error ? (
        <ErrorMessage text={result.error} />
      ) : !result.data || result.data.length === 0 ? (
        <EmptyMessage text="No hay reservas en el rango seleccionado." />
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Espacio</TableHead>
                <TableHead className="text-right">Cantidad de reservas</TableHead>
                <TableHead className="text-right">Importe total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((espacio) => (
                <TableRow key={espacio.espacioId}>
                  <TableCell className="font-medium">{espacio.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {espacio.cantidadReservas}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currency(espacio.importeTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AccesosTab() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          El detalle de cada intento de ingreso por portería (permitido o denegado) se consulta
          en el historial de Control de Acceso.
        </p>
        <Link
          href="/control-acceso/historial"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ScanLine className="size-4" aria-hidden="true" />
          Ver historial de accesos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * `/reportes` (Etapa 7, "Reportes operativos por módulo") — pantalla nueva,
 * sin ruta prevista en §7 (mismo caso que Control de Acceso y Solicitudes de
 * Membresía en Etapas 5/6: nunca pasó por la auditoría de Figma). 4 tabs
 * traídos en paralelo server-side (mismo patrón que `/comunicaciones` y
 * `/solicitudes-membresia`), salvo "Accesos" que no pega al backend (solo
 * linkea a `/control-acceso/historial`, ya construida en Etapa 5). El tab
 * "Espacios" es el único que depende de `searchParams` (`desde`/`hasta`) —
 * su filtro de fechas recarga la pantalla completa vía query params, como el
 * resto de listados paginados/filtrados del proyecto (`HistorialFiltro`).
 */
export default async function ReportesPage({ searchParams }: ReportesPageProps) {
  const { desde, hasta } = await searchParams;

  const query = new URLSearchParams();
  if (desde) query.set("desde", desde);
  if (hasta) query.set("hasta", hasta);
  const espaciosPath = query.toString()
    ? `/api/reportes/espacios?${query.toString()}`
    : "/api/reportes/espacios";

  const [socios, actividades, espacios] = await Promise.all([
    fetchReporte<ReporteSocios>("/api/reportes/socios"),
    fetchReporte<ReporteActividadItem[]>("/api/reportes/actividades"),
    fetchReporte<ReporteEspacioItem[]>(espaciosPath),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Reportes</h2>
        <p className="text-sm text-muted-foreground">
          Reportes operativos por módulo: Socios, Actividades, Espacios y Accesos.
        </p>
      </div>

      <Tabs defaultValue={desde || hasta ? "espacios" : "socios"}>
        <TabsList>
          <TabsTrigger value="socios">Socios</TabsTrigger>
          <TabsTrigger value="actividades">Actividades</TabsTrigger>
          <TabsTrigger value="espacios">
            <CalendarRange className="size-4" aria-hidden="true" />
            Espacios
          </TabsTrigger>
          <TabsTrigger value="accesos">Accesos</TabsTrigger>
        </TabsList>

        <TabsContent value="socios" className="mt-4">
          <SociosTab result={socios} />
        </TabsContent>
        <TabsContent value="actividades" className="mt-4">
          <ActividadesTab result={actividades} />
        </TabsContent>
        <TabsContent value="espacios" className="mt-4">
          <EspaciosTab result={espacios} desde={desde ?? ""} hasta={hasta ?? ""} />
        </TabsContent>
        <TabsContent value="accesos" className="mt-4">
          <AccesosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
