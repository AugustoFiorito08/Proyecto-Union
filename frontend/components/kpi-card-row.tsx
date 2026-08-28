import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * `<KpiCardRow />` genérico (SPEC.md §7.2: "fila de tarjetas de resumen —
 * ícono, valor, label, variación %" — Dashboard, Socios, Grupos Familiares,
 * Espacios, Reservas, Finanzas, Comunicaciones, Configuración de usuarios).
 * No existía todavía ningún módulo que lo hubiera extraído como componente
 * reusable — se crea acá (primer consumidor: `/finanzas/dashboard`) y queda
 * disponible para que las demás pantallas listadas en SPEC.md lo adopten
 * más adelante sin duplicar el markup de tarjeta.
 */
export interface KpiCardItem {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  /** Texto libre opcional bajo el valor (ej. "+12% vs. mes anterior"). */
  hint?: string;
  tone?: "default" | "destructive" | "warning";
}

const TONE_ICON_CLASSES: Record<NonNullable<KpiCardItem["tone"]>, string> = {
  default: "text-primary",
  destructive: "text-destructive",
  warning: "text-amber-600 dark:text-amber-500",
};

export function KpiCardRow({ items }: { items: KpiCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              {item.hint ? (
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              ) : null}
            </div>
            <item.icon
              className={cn("size-5 shrink-0", TONE_ICON_CLASSES[item.tone ?? "default"])}
              aria-hidden="true"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
