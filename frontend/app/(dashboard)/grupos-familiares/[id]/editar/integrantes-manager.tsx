"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import type { GrupoFamiliarIntegrante, Parentesco, SocioResumen } from "@/lib/types";
import { agregarIntegrante, cambiarTitular, quitarIntegrante } from "../../actions";

const PARENTESCOS_DISPONIBLES: Exclude<Parentesco, "Titular">[] = ["Conyuge", "Hijo"];

interface IntegrantesManagerProps {
  grupoId: string;
  titularSocioId: string;
  integrantes: GrupoFamiliarIntegrante[];
  sociosDisponibles: SocioResumen[];
}

export function IntegrantesManager({
  grupoId,
  titularSocioId,
  integrantes,
  sociosDisponibles,
}: IntegrantesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nuevoSocioId, setNuevoSocioId] = useState("");
  const [nuevoParentesco, setNuevoParentesco] =
    useState<Exclude<Parentesco, "Titular">>("Conyuge");
  const [agregarError, setAgregarError] = useState<string | null>(null);

  const [titularDialogOpen, setTitularDialogOpen] = useState(false);
  const [nuevoTitularId, setNuevoTitularId] = useState("");
  const [titularError, setTitularError] = useState<string | null>(null);

  const [removiendoId, setRemoviendoId] = useState<string | null>(null);
  const [removerError, setRemoverError] = useState<string | null>(null);

  const noTitulares = integrantes.filter((integrante) => integrante.socioId !== titularSocioId);

  function handleAgregar() {
    if (!nuevoSocioId) {
      setAgregarError("Seleccioná un socio.");
      return;
    }
    setAgregarError(null);
    startTransition(async () => {
      const result = await agregarIntegrante(grupoId, {
        socioId: nuevoSocioId,
        parentesco: nuevoParentesco,
      });
      if (!result.success) {
        setAgregarError(result.message);
        return;
      }
      setNuevoSocioId("");
      router.refresh();
    });
  }

  function handleQuitar(socioId: string) {
    setRemoviendoId(socioId);
    setRemoverError(null);
    startTransition(async () => {
      const result = await quitarIntegrante(grupoId, socioId);
      setRemoviendoId(null);
      if (!result.success) {
        setRemoverError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleCambiarTitular() {
    if (!nuevoTitularId) {
      setTitularError("Seleccioná el nuevo titular.");
      return;
    }
    setTitularError(null);
    startTransition(async () => {
      const result = await cambiarTitular(grupoId, { nuevoTitularSocioId: nuevoTitularId });
      if (!result.success) {
        setTitularError(result.message);
        return;
      }
      setTitularDialogOpen(false);
      setNuevoTitularId("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Integrantes</CardTitle>
        <Dialog open={titularDialogOpen} onOpenChange={setTitularDialogOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Cambiar titular
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar titular del grupo</DialogTitle>
              <DialogDescription>
                El nuevo titular debe ser uno de los integrantes actuales del grupo (RN-GF-01).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="nuevoTitularId">Nuevo titular</Label>
              <Select
                value={nuevoTitularId}
                onValueChange={(value) => setNuevoTitularId(value ?? "")}
              >
                <SelectTrigger id="nuevoTitularId" className="w-full">
                  <SelectValue placeholder="Seleccioná un integrante" />
                </SelectTrigger>
                <SelectContent>
                  {noTitulares.map((integrante) => (
                    <SelectItem key={integrante.socioId} value={integrante.socioId}>
                      {integrante.apellidoNombres}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {titularError ? (
                <p className="text-sm text-destructive">{titularError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTitularDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleCambiarTitular} disabled={isPending}>
                {isPending ? "Guardando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {removerError ? (
          <p className="text-sm text-destructive">{removerError}</p>
        ) : null}

        {integrantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay integrantes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrantes.map((integrante) => {
                const esTitular = integrante.socioId === titularSocioId;
                return (
                  <TableRow key={integrante.socioId}>
                    <TableCell className="font-medium">{integrante.apellidoNombres}</TableCell>
                    <TableCell>{esTitular ? "Titular" : integrante.parentesco}</TableCell>
                    <TableCell className="text-right">
                      {esTitular ? (
                        <span className="text-xs text-muted-foreground">
                          No se puede quitar al titular
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuitar(integrante.socioId)}
                          disabled={isPending && removiendoId === integrante.socioId}
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                          Quitar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-end gap-3 border-t pt-4">
        <div className="min-w-52 flex-1 space-y-2">
          <Label htmlFor="nuevoSocioId">Agregar integrante</Label>
          <Select
            value={nuevoSocioId}
            onValueChange={(value) => setNuevoSocioId(value ?? "")}
          >
            <SelectTrigger id="nuevoSocioId" className="w-full">
              <SelectValue placeholder="Seleccioná un socio" />
            </SelectTrigger>
            <SelectContent>
              {sociosDisponibles.map((socio) => (
                <SelectItem key={socio.id} value={socio.id}>
                  {socio.apellido}, {socio.nombres} (DNI {socio.dni})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="nuevoParentesco">Parentesco</Label>
          <Select
            value={nuevoParentesco}
            onValueChange={(value) =>
              setNuevoParentesco(value as Exclude<Parentesco, "Titular">)
            }
          >
            <SelectTrigger id="nuevoParentesco" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARENTESCOS_DISPONIBLES.map((parentesco) => (
                <SelectItem key={parentesco} value={parentesco}>
                  {parentesco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAgregar} disabled={isPending}>
          {isPending ? "Agregando..." : "Agregar"}
        </Button>

        {agregarError ? (
          <p className="w-full text-sm text-destructive">{agregarError}</p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
