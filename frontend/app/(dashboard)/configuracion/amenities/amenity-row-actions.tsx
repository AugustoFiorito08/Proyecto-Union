"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { Amenity } from "@/lib/types";
import { AmenityDialog } from "./amenity-dialog";
import { eliminarAmenity } from "./actions";

interface AmenityRowActionsProps {
  amenity: Amenity;
}

export function AmenityRowActions({ amenity }: AmenityRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleEliminar() {
    setError(null);
    startTransition(async () => {
      const result = await eliminarAmenity(amenity.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <AmenityDialog amenity={amenity} />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar amenity</DialogTitle>
            <DialogDescription>
              Se quita &quot;{amenity.nombre}&quot; del catálogo. Los espacios que ya la tienen
              asignada la pierden.
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEliminar} disabled={isPending}>
              {isPending ? "Eliminando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
