import Link from "next/link";
import { AlertTriangle, Eye, Pencil, Plus, Receipt, Search, UserCheck, UserX, Users } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { ESTADO_SOCIO_A_INT } from "@/lib/enums";
import type { FinanzasDashboard, PaginatedResult, SocioEstado, SocioResumen } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TAMANIO_PAGINA = 20;
const ESTADOS: SocioEstado[] = ["Activo", "Suspendido", "Inactivo"];

interface SociosPageProps {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
}

/** Iniciales para el avatar: ancla visual para recorrer las filas con la vista. */
function iniciales(apellido: string, nombres: string): string {
  return `${apellido.charAt(0)}${nombres.charAt(0)}`.toUpperCase();
}

/**
 * Tarjeta de indicador del encabezado, con el ícono en círculo tintado como en
 * el diseño (nodo 246:823).
 */
function Indicador({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: typeof Users;
  tono: "verde" | "azul" | "naranja" | "violeta";
}) {
  const tonos = {
    verde: "bg-primary/12 text-primary",
    azul: "bg-[#145EC8]/12 text-[#145EC8] dark:text-[#6FA8F0]",
    naranja: "bg-[#F47338]/15 text-[#C6541D] dark:text-[#F49460]",
    violeta: "bg-[#745BD8]/12 text-[#745BD8] dark:text-[#A996EC]",
  } as const;

  return (
    <Card>
      <CardContent className="flex items-center gap-3.5">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            tonos[tono],
          )}
        >
          <Icono className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{etiqueta}</p>
          <p className="text-2xl font-bold tabular-nums">{valor}</p>
          {detalle ? <p className="text-xs text-muted-foreground">{detalle}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Listado de Socios (`/socios`), alineado con el diseño de Figma (nodo
 * 246:823): fila de indicadores arriba, barra con buscador y filtros, tabla con
 * avatar + número de socio + contacto, y pie con el rango mostrado y paginado.
 *
 * Desvíos deliberados respecto del mockup, por los datos que existen de verdad:
 *  - El diseño muestra "Nuevos este mes" y "Bajas este mes". El listado sí trae
 *    `fechaAlta`, pero viene paginado: contar sobre la página actual daría un
 *    número falso, y no hay endpoint que devuelva esos totales. Se reemplazan
 *    por Suspendidos e Inactivos, que sí son totales reales.
 *  - Se omite la columna "Cuota al día": el estado de cuota por socio no viene
 *    en el listado y resolverlo exigiría una consulta por fila.
 *  - Se omiten las casillas de selección múltiple: no hay ningún endpoint de
 *    acciones en lote, así que serían un control muerto.
 */
export default async function SociosPage({ searchParams }: SociosPageProps) {
  const { q, estado, page } = await searchParams;

  const paginaActual = Math.max(1, Number(page) || 1);
  const estadoFiltro = estado && ESTADOS.includes(estado as SocioEstado) ? (estado as SocioEstado) : null;

  const query = new URLSearchParams({
    page: String(paginaActual),
    pageSize: String(TAMANIO_PAGINA),
  });
  if (q) query.set("nombre", q);
  if (estadoFiltro) query.set("estado", String(ESTADO_SOCIO_A_INT[estadoFiltro]));

  let socios: SocioResumen[] = [];
  let total = 0;
  let loadError: string | null = null;

  try {
    const resultado = await apiFetch<PaginatedResult<SocioResumen> | SocioResumen[]>(
      `/api/socios?${query.toString()}`,
    );
    if (Array.isArray(resultado)) {
      socios = resultado;
      total = resultado.length;
    } else {
      socios = resultado.items;
      total = resultado.totalCount ?? resultado.items.length;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el listado.";
  }

  // Totales por estado y morosos: se piden aparte porque el listado viene
  // paginado y contar sobre la página daría números equivocados.
  const [resumen, finanzas] = await Promise.all([
    apiFetch<{ porEstado: { estado: SocioEstado; cantidad: number }[] }>(
      "/api/reportes/socios",
    ).catch(() => null),
    apiFetch<FinanzasDashboard>("/api/finanzas/dashboard").catch(() => null),
  ]);

  const porEstado = (e: SocioEstado) =>
    resumen?.porEstado.find((f) => f.estado === e)?.cantidad ?? 0;
  const totalSocios = resumen ? porEstado("Activo") + porEstado("Suspendido") + porEstado("Inactivo") : 0;
  const activos = porEstado("Activo");
  const pctActivos = totalSocios > 0 ? Math.round((activos / totalSocios) * 1000) / 10 : 0;
  const morosos = finanzas?.sociosMorosos ?? 0;
  const pctMorosos = totalSocios > 0 ? Math.round((morosos / totalSocios) * 1000) / 10 : 0;

  const buscando = Boolean(q || estadoFiltro);
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANIO_PAGINA));
  /** Hay socios, pero se pidió una página más allá de la última. */
  const paginaFueraDeRango = total > 0 && socios.length === 0;
  const desde = total === 0 ? 0 : (paginaActual - 1) * TAMANIO_PAGINA + 1;
  const hasta = Math.min(paginaActual * TAMANIO_PAGINA, total);

  /** Mantiene los filtros activos al cambiar de página. */
  const enlacePagina = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estadoFiltro) p.set("estado", estadoFiltro);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `/socios?${qs}` : "/socios";
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Socios</h2>
        <p className="mt-0.5 text-muted-foreground">
          Gestioná la información de los socios del club.
        </p>
      </header>

      {resumen ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Total de socios"
            valor={String(totalSocios)}
            detalle={`Activos: ${activos} (${pctActivos}%)`}
            icono={Users}
            tono="violeta"
          />
          <Indicador
            etiqueta="Activos"
            valor={String(activos)}
            icono={UserCheck}
            tono="verde"
          />
          <Indicador
            etiqueta="Suspendidos"
            valor={String(porEstado("Suspendido"))}
            icono={UserX}
            tono="azul"
          />
          <Indicador
            etiqueta="Morosos"
            valor={String(morosos)}
            detalle={totalSocios > 0 ? `${pctMorosos}% del total` : undefined}
            icono={AlertTriangle}
            tono="naranja"
          />
        </section>
      ) : null}

      {/* Barra de herramientas: buscador ancho + filtro de estado + alta. */}
      <form className="flex flex-wrap items-center gap-2" action="/socios">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o apellido…"
            aria-label="Buscar socios por nombre o apellido"
            className="h-11 pl-9"
          />
        </div>

        <label className="sr-only" htmlFor="estado">
          Filtrar por estado
        </label>
        <select
          id="estado"
          name="estado"
          defaultValue={estadoFiltro ?? ""}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Estado: todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <Button type="submit" variant="outline" className="h-11">
          Filtrar
        </Button>

        <Link href="/socios/nuevo" className={cn(buttonVariants(), "h-11")}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo socio
        </Link>
      </form>

      {loadError ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : socios.length === 0 ? (
        /* Tres motivos distintos para no tener filas, y cada uno merece su
           propia salida. El tercero — pasarse del final al paginar — decía
           "todavía no hay socios" aunque hubiera cientos: la página está
           vacía, el listado no. */
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          {paginaFueraDeRango ? (
            <>
              <p className="font-medium">Esta página no tiene socios.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                El listado tiene {total} {total === 1 ? "socio" : "socios"}, repartidos en{" "}
                {totalPaginas} {totalPaginas === 1 ? "página" : "páginas"}.
              </p>
              <Link
                href={enlacePagina(1)}
                className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
              >
                Volver a la primera página
              </Link>
            </>
          ) : buscando ? (
            <>
              <p className="font-medium">No hay socios que coincidan con la búsqueda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Probá con otro nombre o cambiá el filtro de estado.
              </p>
              <Link href="/socios" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
                Ver todos los socios
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium">Todavía no hay socios.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando des de alta al primero, va a aparecer acá.
              </p>
              <Link href="/socios/nuevo" className={cn(buttonVariants(), "mt-5")}>
                <Plus className="size-4" aria-hidden="true" />
                Dar de alta un socio
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {socios.map((socio) => (
                <TableRow key={socio.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
                        aria-hidden="true"
                      >
                        {iniciales(socio.apellido, socio.nombres)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/socios/${socio.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {socio.apellido}, {socio.nombres}
                        </Link>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          Socio N° {socio.numeroSocio}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{socio.dni}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {socio.categoriaNombre}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 leading-tight">
                      {socio.telefono ? (
                        <p className="text-sm tabular-nums">{socio.telefono}</p>
                      ) : null}
                      <p className="truncate text-xs text-muted-foreground">{socio.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={socio.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Íconos con etiqueta accesible: la fila ya es larga y los
                        botones con texto la empujaban fuera del ancho visible. */}
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/socios/${socio.id}`}
                        title="Ver socio"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        <span className="sr-only">Ver socio</span>
                      </Link>
                      <Link
                        href={`/socios/${socio.id}/editar`}
                        title="Editar socio"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Editar socio</span>
                      </Link>
                      <Link
                        href={`/socios/${socio.id}/pagos`}
                        title="Ver pagos del socio"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      >
                        <Receipt className="size-4" aria-hidden="true" />
                        <span className="sr-only">Ver pagos del socio</span>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Mostrando {desde} a {hasta} de {total} {total === 1 ? "socio" : "socios"}
            </p>

            {totalPaginas > 1 ? (
              <div className="flex items-center gap-2">
                {paginaActual > 1 ? (
                  <Link
                    href={enlacePagina(paginaActual - 1)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Anterior
                  </Link>
                ) : null}
                <span className="text-sm tabular-nums text-muted-foreground">
                  Página {paginaActual} de {totalPaginas}
                </span>
                {paginaActual < totalPaginas ? (
                  <Link
                    href={enlacePagina(paginaActual + 1)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Siguiente
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
