"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { MeComunicacion } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { marcarComunicacionLeida } from "./actions";

interface NovedadesListProps {
  comunicaciones: MeComunicacion[];
}

/**
 * Tab "Novedades" de `/mi-cuenta/comunicaciones` (SPEC.md §5
 * `GET /api/me/comunicaciones`). Indicador de no-leída cuando
 * `fechaLectura == null`; al abrir el detalle dispara
 * `PUT /api/me/comunicaciones/{id}/leer` una única vez por comunicación.
 */
export function NovedadesList({ comunicaciones }: NovedadesListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [seleccionada, setSeleccionada] = useState<MeComunicacion | null>(null);

  function abrir(comunicacion: MeComunicacion) {
    setSeleccionada(comunicacion);
    if (!comunicacion.fechaLectura) {
      startTransition(async () => {
        await marcarComunicacionLeida(comunicacion.id);
        router.refresh();
      });
    }
  }

  if (comunicaciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        Todavía no recibiste novedades del club.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-background">
        {comunicaciones.map((comunicacion) => {
          const noLeida = !comunicacion.fechaLectura;
          return (
            <li key={comunicacion.id}>
              <button
                type="button"
                onClick={() => abrir(comunicacion)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
              >
                <span
                  className={
                    "mt-1.5 size-2 shrink-0 rounded-full " +
                    (noLeida ? "bg-primary" : "bg-transparent")
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      "block truncate text-sm " + (noLeida ? "font-semibold" : "font-medium")
                    }
                  >
                    {comunicacion.asunto}
                  </span>
                  {comunicacion.descripcion ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {comunicacion.descripcion}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(comunicacion.fechaEnvio)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!seleccionada} onOpenChange={(open) => !open && setSeleccionada(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{seleccionada?.asunto}</DialogTitle>
            <DialogDescription>{formatDate(seleccionada?.fechaEnvio)}</DialogDescription>
          </DialogHeader>

          {seleccionada ? (
            <div className="space-y-4">
              <div
                className="rte-content"
                dangerouslySetInnerHTML={{ __html: seleccionada.contenidoHtml }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
