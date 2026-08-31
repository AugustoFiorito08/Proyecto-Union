"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";

import type { CoberturaMedica, Plan } from "@/lib/types";
import { crearPlan, editarPlan } from "./actions";

interface PlanesDialogProps {
  cobertura: CoberturaMedica;
}

// Sin `estado`: `PlanRequest` (backend) no lo acepta en alta/edición — la
// baja es un endpoint aparte (`POST .../planes/{planId}/baja`).
interface PlanFormState {
  nombre: string;
}

const PLAN_VACIO: PlanFormState = { nombre: "" };

export function PlanesDialog({ cobertura }: PlanesDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlanFormState>(PLAN_VACIO);

  const [nuevoForm, setNuevoForm] = useState<PlanFormState>(PLAN_VACIO);

  const planes = cobertura.planes ?? [];

  function startEdit(plan: Plan) {
    setEditandoId(plan.id);
    setEditForm({ nombre: plan.nombre });
    setError(null);
  }

  function handleGuardarEdicion(planId: string) {
    if (!editForm.nombre.trim()) {
      setError("Ingresá el nombre del plan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await editarPlan(cobertura.id, planId, editForm);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEditandoId(null);
      router.refresh();
    });
  }

  function handleAgregarPlan() {
    if (!nuevoForm.nombre.trim()) {
      setError("Ingresá el nombre del plan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await crearPlan(cobertura.id, nuevoForm);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNuevoForm(PLAN_VACIO);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Planes ({planes.length})
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Planes de {cobertura.nombre}</DialogTitle>
          <DialogDescription>Altas y ediciones de los planes de esta cobertura.</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {planes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay planes cargados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planes.map((plan) =>
                editandoId === plan.id ? (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Input
                        value={editForm.nombre}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, nombre: event.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditandoId(null)}
                          disabled={isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleGuardarEdicion(plan.id)}
                          disabled={isPending}
                        >
                          Guardar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.nombre}</TableCell>
                    <TableCell>
                      <StatusBadge status={plan.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(plan)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3">
          <div className="min-w-40 flex-1 space-y-2">
            <Label htmlFor="nuevoPlanNombre">Nuevo plan</Label>
            <Input
              id="nuevoPlanNombre"
              placeholder="ej. OSDE 210"
              value={nuevoForm.nombre}
              onChange={(event) =>
                setNuevoForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
            />
          </div>
          <Button onClick={handleAgregarPlan} disabled={isPending}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
