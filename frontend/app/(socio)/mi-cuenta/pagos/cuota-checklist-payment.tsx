"use client";

import { useMemo, useState, useTransition } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

import type { Cuota } from "@/lib/types";
import { pagarCuotasConMercadoPago } from "./actions";

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

interface CuotaChecklistPaymentProps {
  cuotas: Cuota[];
}

/**
 * `<CuotaChecklistPayment />` (SPEC.md §7.2: "selección múltiple de cuotas
 * pendientes + resumen de pago lateral", RN-FIN-07 §3.16). `GET /api/me/cuotas`
 * no distingue quién es titular de una cuota familiar (no existe ese campo
 * en `CuotaResponse`) — la autorización real de RN-FIN-06 (§3.15: solo el
 * titular puede iniciar el pago) la aplica el backend en el momento de pagar,
 * no acá. Por eso toda cuota pendiente se muestra seleccionable; si el socio
 * no es titular de una cuota familiar que incluyó en la selección, el
 * checkout entero es rechazado (403) y se muestra el mensaje del backend.
 */
export function CuotaChecklistPayment({ cuotas }: CuotaChecklistPaymentProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);

  const pendientes = useMemo(
    () => cuotas.filter((cuota) => cuota.estado !== "Pagada"),
    [cuotas]
  );

  const total = pendientes
    .filter((cuota) => seleccionadas.includes(cuota.id))
    .reduce((sum, cuota) => sum + cuota.importe + (cuota.recargoMora ?? 0), 0);

  function toggleTodas() {
    setSeleccionadas(
      seleccionadas.length === pendientes.length ? [] : pendientes.map((c) => c.id)
    );
  }

  function handlePagar() {
    if (seleccionadas.length === 0) {
      setError("Seleccioná al menos una cuota.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await pagarCuotasConMercadoPago(seleccionadas);
      if (!result.success) {
        setError(result.message);
        return;
      }
      window.location.href = result.data.checkoutUrl;
    });
  }

  if (pendientes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
        No tenés cuotas pendientes. ¡Estás al día!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cuotas pendientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendientes.length > 0 ? (
            <button
              type="button"
              onClick={toggleTodas}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {seleccionadas.length === pendientes.length ? "Deseleccionar todas" : "Seleccionar todas"}
            </button>
          ) : null}

          {pendientes.map((cuota) => {
            const checked = seleccionadas.includes(cuota.id);
            const esFamiliar = !!cuota.grupoFamiliarId;
            return (
              <div
                key={cuota.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`me-cuota-${cuota.id}`}
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSeleccionadas((prev) =>
                        value ? [...prev, cuota.id] : prev.filter((id) => id !== cuota.id)
                      );
                    }}
                  />
                  <div>
                    <Label htmlFor={`me-cuota-${cuota.id}`} className="font-medium">
                      Período {cuota.periodo} {esFamiliar ? "(cuota familiar)" : ""}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Vence {cuota.fechaVencimiento} · N° {cuota.numeroCuota}
                      {esFamiliar ? " · Solo el titular del grupo puede completar el pago (RN-FIN-06)" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {currency(cuota.importe + (cuota.recargoMora ?? 0))}
                  </span>
                  <StatusBadge status={cuota.estado} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cuotas seleccionadas</span>
            <span>{seleccionadas.length}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{currency(total)}</span>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handlePagar} disabled={isPending || seleccionadas.length === 0}>
            <CreditCard className="size-4" aria-hidden="true" />
            {isPending ? "Redirigiendo..." : "Pagar ahora con Mercado Pago"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
