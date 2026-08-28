"use client";

import { usePathname } from "next/navigation";

// Mapeo de segmentos de ruta conocidos a etiquetas legibles. Un segmento no
// listado (típicamente un `[id]`) se muestra tal cual — es un breadcrumb
// simple, no intenta resolver el nombre real de la entidad (eso ya lo
// muestra el `<h1>`/`<CardTitle>` de cada página).
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  socios: "Socios",
  nuevo: "Nuevo",
  editar: "Editar",
  "grupos-familiares": "Grupos Familiares",
  configuracion: "Configuración",
  categorias: "Categorías",
  "coberturas-medicas": "Coberturas Médicas",
  pagos: "Pagos",
  finanzas: "Finanzas",
  general: "General",
  "conceptos-ingreso-libre": "Conceptos de Ingreso Libre",
  "mi-cuenta": "Mi cuenta",
};

export function HeaderBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const labels = segments.map((segment) => SEGMENT_LABELS[segment] ?? segment);

  return (
    <p className="truncate text-xs text-muted-foreground">{labels.join(" / ")}</p>
  );
}
