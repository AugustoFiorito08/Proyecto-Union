import { cn } from "@/lib/utils";

/**
 * Paleta categórica del panel, tomada del propio diseño de Figma. Validada con
 * el verificador de la guía de visualización: pasa banda de luminosidad, piso de
 * croma, separación bajo daltonismo (peor par ΔE 18.5 deutan) y piso de visión
 * normal. Dos tonos quedan por debajo de 3:1 de contraste contra el fondo, lo
 * que obliga a etiquetas visibles — por eso la leyenda del donut siempre lleva
 * nombre y cantidad, y las barras su valor encima: el color nunca es el único
 * portador de la información.
 */
export const COLORES_CATEGORIAS = [
  "#00923F",
  "#145EC8",
  "#F47338",
  "#745BD8",
  "#20ACB8",
] as const;

export interface PorcionDonut {
  clave: string;
  etiqueta: string;
  cantidad: number;
}

/**
 * Donut de composición (socios por categoría), como en el diseño. Se dibuja con
 * `stroke-dasharray` sobre un único círculo en vez de generar paths por porción:
 * menos matemática, y el separador entre porciones sale gratis con un pequeño
 * hueco en el trazo.
 */
export function DonutCategorias({ porciones }: { porciones: PorcionDonut[] }) {
  const total = porciones.reduce((suma, p) => suma + p.cantidad, 0);

  if (total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Todavía no hay socios cargados.
      </p>
    );
  }

  const RADIO = 60;
  const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
  const HUECO = 2; // separación entre porciones, en unidades de trazo

  let acumulado = 0;

  return (
    /* Donut arriba y leyenda debajo: el panel ocupa un tercio del ancho, y
       poniéndolos lado a lado la leyenda quedaba tan angosta que se cortaban
       los nombres de las categorías. */
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 160 160" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Distribución de socios por categoría">
        {porciones.map((porcion, i) => {
          const fraccion = porcion.cantidad / total;
          const largo = Math.max(0, fraccion * CIRCUNFERENCIA - HUECO);
          const offset = -acumulado * CIRCUNFERENCIA;
          acumulado += fraccion;
          return (
            <circle
              key={porcion.clave}
              cx="80"
              cy="80"
              r={RADIO}
              fill="none"
              stroke={COLORES_CATEGORIAS[i % COLORES_CATEGORIAS.length]}
              strokeWidth="22"
              strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>

      <ul className="w-full space-y-2">
        {porciones.map((porcion, i) => (
          <li key={porcion.clave} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORES_CATEGORIAS[i % COLORES_CATEGORIAS.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{porcion.etiqueta}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {Math.round((porcion.cantidad / total) * 100)}%
            </span>
            <span className="w-10 shrink-0 text-right font-medium tabular-nums">
              ({porcion.cantidad})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarraActividad {
  clave: string;
  etiqueta: string;
  valor: number;
}

/**
 * "Deportistas por actividad" — barras verticales, como en el diseño.
 *
 * Una diferencia deliberada con el mockup: el diseño pinta cada barra de un
 * color distinto, pero acá hay UNA sola serie (cantidad de inscriptos) y el
 * largo de la barra ya codifica la magnitud. Colorear cada barra distinto
 * sugiere una diferencia de categoría que no existe, así que van todas en el
 * verde institucional. El valor va escrito encima de cada una.
 */
export function BarrasActividades({ barras }: { barras: BarraActividad[] }) {
  if (barras.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Todavía no hay inscripciones en actividades.
      </p>
    );
  }

  const maximo = Math.max(...barras.map((b) => b.valor), 1);

  return (
    <div className="flex items-end gap-3 overflow-x-auto pb-1 sm:gap-5">
      {barras.map((barra) => {
        const alturaPct = Math.max(2, (barra.valor / maximo) * 100);
        return (
          <div key={barra.clave} className="flex min-w-16 flex-1 flex-col items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{barra.valor}</span>
            <div className="flex h-40 w-full items-end">
              <div
                className={cn("w-full rounded-t-md bg-primary")}
                style={{ height: `${alturaPct}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-xs text-muted-foreground">
              {barra.etiqueta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
