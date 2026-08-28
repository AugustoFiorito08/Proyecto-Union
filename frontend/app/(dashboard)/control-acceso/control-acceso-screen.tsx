"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, ScanLine, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ValidarAccesoResponse } from "@/lib/types";
import { validarAcceso } from "./actions";

/** Tiempo que queda visible el panel de resultado antes de volver solo al modo de escaneo. */
const AUTO_DISMISS_MS = 6000;

function iniciales(apellidoNombres: string): string {
  const partes = apellidoNombres
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2);
  return partes.map((parte) => parte[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Pantalla de portería `/control-acceso` (RN-ACC-02 a 05, §5). No hay lector
 * de cámara ni librería de escaneo QR: los lectores físicos de portería
 * actúan como teclado (tipean el string del carnet y mandan Enter solos), así
 * que la interfaz entera es un input de texto autofocuseado + un `<form>` que
 * intercepta el submit.
 *
 * Flujo de escaneo continuo (decisión de diseño propia, no especificada en
 * SPEC.md — este módulo no tiene ruta prevista en §7): el componente es una
 * máquina de 3 estados —
 *   1. listo para escanear (input visible, enfocado, vacío);
 *   2. validando (input deshabilitado, esperando la Server Action);
 *   3. resultado (panel grande verde/rojo, el input queda oculto).
 * El estado 3 se cierra solo — con un timer de `AUTO_DISMISS_MS` — o antes,
 * si el operador toca "Siguiente"; cualquiera de los dos vuelve al estado 1 y
 * re-enfoca el input, para que el lector físico pueda tipear el próximo
 * escaneo sin que el operador tenga que tocar nada con el mouse/teclado.
 */
export function ControlAccesoScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [codigo, setCodigo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ValidarAccesoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-enfoca el input cada vez que se vuelve al modo de escaneo (al montar
  // y después de cerrar el panel de resultado, manual o automáticamente).
  useEffect(() => {
    if (!resultado) inputRef.current?.focus();
  }, [resultado]);

  useEffect(() => {
    if (!resultado) return;
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [resultado]);

  function dismiss() {
    setResultado(null);
    setError(null);
    setCodigo("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = codigo.trim();
    if (!value || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await validarAcceso({ codigoQr: value });
      setCodigo("");
      if (!result.success) {
        setError(result.message);
        inputRef.current?.focus();
        return;
      }
      setResultado(result.data);
    });
  }

  if (resultado) {
    const permitido = resultado.resultado === "Permitido";
    // `ValidarAccesoResponse` trae `apellido`/`nombres` por separado (a
    // diferencia de `RegistroAcceso.socioApellidoNombres` del historial) —
    // se combina acá solo para mostrar.
    const nombreCompleto =
      resultado.apellido && resultado.nombres
        ? `${resultado.apellido}, ${resultado.nombres}`
        : null;
    return (
      <div
        className={cn(
          "flex min-h-[65vh] flex-col items-center justify-center gap-6 rounded-xl border-4 p-10 text-center",
          permitido
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-destructive bg-destructive/10"
        )}
      >
        {permitido ? (
          <CheckCircle2 className="size-20 text-emerald-500" aria-hidden="true" />
        ) : (
          <XCircle className="size-20 text-destructive" aria-hidden="true" />
        )}

        {resultado.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- fotoUrl es una URL arbitraria del backend, sin dominio conocido de antemano para next/image.
          <img
            src={resultado.fotoUrl}
            alt=""
            className="size-40 rounded-full border-4 border-background object-cover shadow-lg"
          />
        ) : nombreCompleto ? (
          <div
            className="flex size-40 items-center justify-center rounded-full bg-muted text-4xl font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            {iniciales(nombreCompleto)}
          </div>
        ) : null}

        {nombreCompleto ? (
          <div>
            <p className="text-4xl font-bold">{nombreCompleto}</p>
          </div>
        ) : null}

        <p
          className={cn(
            "text-2xl font-semibold",
            permitido ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
        >
          {permitido ? "Acceso permitido" : (resultado.motivoDenegacion ?? "Acceso denegado")}
        </p>

        <Button size="lg" onClick={dismiss} autoFocus>
          Siguiente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border p-10 text-center">
      <ScanLine className="size-16 text-muted-foreground" aria-hidden="true" />

      <div>
        <h3 className="text-2xl font-semibold">Esperando escaneo</h3>
        <p className="text-sm text-muted-foreground">
          Pasá el carnet por el lector de portería para validar el ingreso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <label htmlFor="codigo-qr" className="sr-only">
          Código escaneado
        </label>
        <Input
          id="codigo-qr"
          ref={inputRef}
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          placeholder="Esperando escaneo..."
          autoFocus
          disabled={isPending}
          autoComplete="off"
          className="h-14 text-center text-lg"
        />
      </form>

      {isPending ? <p className="text-sm text-muted-foreground">Validando...</p> : null}
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
