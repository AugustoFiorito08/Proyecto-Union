import { AlertTriangle, CalendarClock, Clock, TrendingUp, Users } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api";
import type { FinanzasDashboard, ReporteIngresosItem } from "@/lib/types";
import { KpiCardRow, type KpiCardItem } from "@/components/kpi-card-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

/**
 * `/finanzas/dashboard` (SPEC.md §7.1, matriz §2.2: "Finanzas — Reportes/
 * Dashboard | L" — solo SuperAdmin/Administrador tienen lectura, Empleado no
 * tiene acceso). No hay ninguna librería de gráficos instalada en
 * `package.json` (se revisó antes de escribir esta pantalla) — se muestran
 * los indicadores en `<KpiCardRow />` + una tabla de ingresos por concepto,
 * sin agregar una dependencia nueva.
 */
export default async function FinanzasDashboardPage() {
  let dashboard: FinanzasDashboard | null = null;
  let reporteIngresos: ReporteIngresosItem[] = [];
  let loadError: string | null = null;
  let forbidden = false;

  try {
    [dashboard, reporteIngresos] = await Promise.all([
      apiFetch<FinanzasDashboard>("/api/finanzas/dashboard"),
      apiFetch<ReporteIngresosItem[]>("/api/finanzas/reportes/ingresos"),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      forbidden = true;
    } else {
      loadError = error instanceof Error ? error.message : "No se pudo cargar el dashboard.";
    }
  }

  const items: KpiCardItem[] = dashboard
    ? [
        {
          key: "ingresos-mes",
          label: "Ingresos del mes",
          value: currency(dashboard.ingresosMesActual),
          icon: TrendingUp,
        },
        {
          key: "socios-morosos",
          label: "Socios morosos",
          value: String(dashboard.sociosMorosos),
          icon: Users,
          tone: dashboard.sociosMorosos > 0 ? "destructive" : "default",
          hint: "Al menos una cuota Vencida (RN-FIN-01)",
        },
        {
          key: "cuotas-pendientes",
          label: "Cuotas pendientes",
          value: String(dashboard.cuotasPendientes),
          icon: Clock,
          tone: "warning",
        },
        {
          key: "cuotas-vencidas",
          label: "Cuotas vencidas",
          value: String(dashboard.cuotasVencidas),
          icon: AlertTriangle,
          tone: dashboard.cuotasVencidas > 0 ? "destructive" : "default",
        },
        {
          key: "reservas-pendientes-check",
          label: "Reservas pagadas por chequear",
          value: String(dashboard.reservasPagadasPendientesDeCheck),
          icon: CalendarClock,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dashboard financiero</h2>
        <p className="text-sm text-muted-foreground">
          Indicadores de cobranza del mes en curso.
        </p>
      </div>

      {forbidden ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No tenés permiso para ver los reportes financieros.
        </p>
      ) : loadError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : dashboard ? (
        <>
          <KpiCardRow items={items} />

          {reporteIngresos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por origen (RN-FIN-09)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origen</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporteIngresos.map((item) => (
                      <TableRow key={`${item.origen}-${item.conceptoNombre ?? ""}`}>
                        <TableCell className="font-medium">{item.origen}</TableCell>
                        <TableCell>{item.conceptoNombre ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.cantidad}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
