"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type {
  ConceptoIngresoLibre,
  Cuota,
  MedioPago,
  Reserva,
  SocioResumen,
} from "@/lib/types";
import { registrarPagoManual } from "./actions";

type OrigenPago = "Cuota" | "Reserva" | "ConceptoIngresoLibre";

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia (CBU)" },
  { value: "MercadoPago", label: "Mercado Pago" },
];

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value);
}

interface RegistrarPagoDialogProps {
  socios: SocioResumen[];
  cuotas: Cuota[];
  reservas: Reserva[];
  conceptos: ConceptoIngresoLibre[];
}

/**
 * "Registrar pago manual" (`POST /api/pagos`, §5 y matriz §2.2: Empleado
 * puede registrar pago manual, Administrador/SuperAdmin también). Cubre las
 * tres variantes de origen del `Pago` (RF-FIN-34 actualizado por RN-FIN-09):
 * Cuota (con multi-selección para "Pagar todo", RN-FIN-07 §3.16), Reserva y
 * ConceptoIngresoLibre. No usa react-hook-form (a diferencia de los diálogos
 * CRUD simples de Configuración) porque la forma del body cambia por
 * completo según el origen elegido — mismo criterio de `useState` llano que
 * `instructores-manager.tsx`/`socio-detail-actions.tsx`.
 */
export function RegistrarPagoDialog({
  socios,
  cuotas,
  reservas,
  conceptos,
}: RegistrarPagoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [origen, setOrigen] = useState<OrigenPago>("Cuota");
  const [socioId, setSocioId] = useState("");
  const [cuotaIdsSeleccionadas, setCuotaIdsSeleccionadas] = useState<string[]>([]);
  const [reservaId, setReservaId] = useState("");
  const [conceptoIngresoLibreId, setConceptoIngresoLibreId] = useState("");
  const [importeLibre, setImporteLibre] = useState<string>("");
  const [conceptoTexto, setConceptoTexto] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("Efectivo");

  const socioSeleccionado = socios.find((socio) => socio.id === socioId);

  const cuotasDelSocio = useMemo(() => {
    if (!socioSeleccionado) return [];
    return cuotas.filter(
      (cuota) =>
        cuota.estado !== "Pagada" &&
        (cuota.socioId === socioSeleccionado.id ||
          (cuota.grupoFamiliarId &&
            cuota.grupoFamiliarId === socioSeleccionado.grupoFamiliarId))
    );
  }, [cuotas, socioSeleccionado]);

  const reservasDisponibles = useMemo(
    () => reservas.filter((reserva) => reserva.estado === "Confirmada"),
    [reservas]
  );

  const conceptosActivos = useMemo(
    () => conceptos.filter((concepto) => concepto.estado === "Activo"),
    [conceptos]
  );

  const totalCuotasSeleccionadas = cuotasDelSocio
    .filter((cuota) => cuotaIdsSeleccionadas.includes(cuota.id))
    .reduce((total, cuota) => total + cuota.importe + (cuota.recargoMora ?? 0), 0);

  function resetForm() {
    setOrigen("Cuota");
    setSocioId("");
    setCuotaIdsSeleccionadas([]);
    setReservaId("");
    setConceptoIngresoLibreId("");
    setImporteLibre("");
    setConceptoTexto("");
    setMedioPago("Efectivo");
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    if (origen === "Cuota" && cuotaIdsSeleccionadas.length === 0) {
      setError("Seleccioná un socio y al menos una cuota pendiente.");
      return;
    }
    if (origen === "Reserva" && !reservaId) {
      setError("Seleccioná una reserva.");
      return;
    }
    if (origen === "ConceptoIngresoLibre") {
      if (!conceptoIngresoLibreId) {
        setError("Seleccioná un concepto de ingreso libre.");
        return;
      }
      const importe = Number(importeLibre);
      if (!importe || importe <= 0) {
        setError("Ingresá un importe válido.");
        return;
      }
    }

    startTransition(async () => {
      const result = await registrarPagoManual({
        cuotaIds: origen === "Cuota" ? cuotaIdsSeleccionadas : undefined,
        reservaId: origen === "Reserva" ? reservaId : undefined,
        conceptoIngresoLibreId: origen === "ConceptoIngresoLibre" ? conceptoIngresoLibreId : undefined,
        socioId: origen === "ConceptoIngresoLibre" ? socioId || undefined : undefined,
        importe: origen === "ConceptoIngresoLibre" ? Number(importeLibre) : undefined,
        concepto: origen === "ConceptoIngresoLibre" ? conceptoTexto || undefined : undefined,
        medioPago,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Registrar pago manual
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago manual</DialogTitle>
          <DialogDescription>
            Se registra en caja, sin pasar por el checkout de Mercado Pago.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Origen del pago</Label>
            <div className="flex flex-wrap gap-4 text-sm">
              {(
                [
                  { value: "Cuota", label: "Cuota" },
                  { value: "Reserva", label: "Reserva" },
                  { value: "ConceptoIngresoLibre", label: "Ingreso libre" },
                ] as { value: OrigenPago; label: string }[]
              ).map((opcion) => (
                <label key={opcion.value} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="origen"
                    checked={origen === opcion.value}
                    onChange={() => setOrigen(opcion.value)}
                  />
                  {opcion.label}
                </label>
              ))}
            </div>
          </div>

          {origen === "Cuota" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pago-socio">Socio</Label>
                <Select
                  value={socioId || undefined}
                  onValueChange={(value) => {
                    setSocioId(value ?? "");
                    setCuotaIdsSeleccionadas([]);
                  }}
                >
                  <SelectTrigger id="pago-socio" className="w-full">
                    <SelectValue placeholder="Seleccioná un socio" />
                  </SelectTrigger>
                  <SelectContent>
                    {socios.map((socio) => (
                      <SelectItem key={socio.id} value={socio.id}>
                        {socio.apellido}, {socio.nombres} (DNI {socio.dni})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {socioSeleccionado ? (
                cuotasDelSocio.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tiene cuotas pendientes ni vencidas.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {cuotasDelSocio.map((cuota) => {
                      const checked = cuotaIdsSeleccionadas.includes(cuota.id);
                      return (
                        <div key={cuota.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`cuota-${cuota.id}`}
                              checked={checked}
                              onCheckedChange={(value) => {
                                setCuotaIdsSeleccionadas((prev) =>
                                  value
                                    ? [...prev, cuota.id]
                                    : prev.filter((id) => id !== cuota.id)
                                );
                              }}
                            />
                            <Label htmlFor={`cuota-${cuota.id}`} className="font-normal">
                              {cuota.periodo} · N° {cuota.numeroCuota}
                            </Label>
                          </div>
                          <span className="text-sm tabular-nums">
                            {currency(cuota.importe + (cuota.recargoMora ?? 0))}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-medium">
                      <span>Total</span>
                      <span className="tabular-nums">{currency(totalCuotasSeleccionadas)}</span>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          ) : null}

          {origen === "Reserva" ? (
            <div className="space-y-2">
              <Label htmlFor="pago-reserva">Reserva confirmada</Label>
              <Select value={reservaId || undefined} onValueChange={(value) => setReservaId(value ?? "")}>
                <SelectTrigger id="pago-reserva" className="w-full">
                  <SelectValue placeholder="Seleccioná una reserva" />
                </SelectTrigger>
                <SelectContent>
                  {reservasDisponibles.map((reserva) => (
                    <SelectItem key={reserva.id} value={reserva.id}>
                      {reserva.espacioNombre} · {reserva.fecha} · {reserva.socioApellidoNombres ?? reserva.nombreContacto ?? "Sin socio"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {origen === "ConceptoIngresoLibre" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pago-concepto">Concepto</Label>
                <Select
                  value={conceptoIngresoLibreId || undefined}
                  onValueChange={(value) => setConceptoIngresoLibreId(value ?? "")}
                >
                  <SelectTrigger id="pago-concepto" className="w-full">
                    <SelectValue placeholder="Seleccioná un concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    {conceptosActivos.map((concepto) => (
                      <SelectItem key={concepto.id} value={concepto.id}>
                        {concepto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pago-socio-libre">Socio (opcional)</Label>
                <Select value={socioId || undefined} onValueChange={(value) => setSocioId(value ?? "")}>
                  <SelectTrigger id="pago-socio-libre" className="w-full">
                    <SelectValue placeholder="Sin socio asociado" />
                  </SelectTrigger>
                  <SelectContent>
                    {socios.map((socio) => (
                      <SelectItem key={socio.id} value={socio.id}>
                        {socio.apellido}, {socio.nombres}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pago-importe">Importe</Label>
                <Input
                  id="pago-importe"
                  type="number"
                  min="0"
                  step="0.01"
                  value={importeLibre}
                  onChange={(event) => setImporteLibre(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pago-concepto-texto">Aclaración (opcional)</Label>
                <Input
                  id="pago-concepto-texto"
                  value={conceptoTexto}
                  onChange={(event) => setConceptoTexto(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="pago-medio">Medio de pago</Label>
            <Select value={medioPago} onValueChange={(value) => setMedioPago(value as MedioPago)}>
              <SelectTrigger id="pago-medio" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIOS_PAGO.map((medio) => (
                  <SelectItem key={medio.value} value={medio.value}>
                    {medio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Registrando..." : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
