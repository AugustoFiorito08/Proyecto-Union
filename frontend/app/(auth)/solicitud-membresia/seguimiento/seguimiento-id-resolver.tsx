"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SOLICITUD_MEMBRESIA_STORAGE_KEY } from "@/lib/constants";

function leerIdGuardado(): string | null {
  try {
    return window.localStorage.getItem(SOLICITUD_MEMBRESIA_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Se renderiza únicamente cuando `page.tsx` llegó sin `?id=` en la URL y el
 * intento defensivo contra `GET /api/me/solicitud-membresia` (ver comentario
 * ahí) tampoco resolvió nada — último recurso: buscar el id que
 * `solicitud-membresia-form.tsx` guardó en `localStorage` del mismo
 * navegador al crear la solicitud. Si lo encuentra, redirige a la misma
 * página con `?id=` (recarga el Server Component con datos reales). Si no
 * hay nada guardado (otro dispositivo/navegador, storage limpiado), muestra
 * un estado vacío en vez de quedarse en blanco.
 *
 * El id se lee de forma sincrónica en el inicializador de `useState` (no
 * dentro de un `useEffect`) para no disparar un `setState` síncrono en el
 * cuerpo del efecto — el `useEffect` solo dispara el efecto externo real
 * (la navegación), nunca actualiza estado propio del componente.
 */
export function SeguimientoIdResolver() {
  const router = useRouter();
  const [storedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : leerIdGuardado()
  );

  useEffect(() => {
    if (storedId) {
      router.replace(`/solicitud-membresia/seguimiento?id=${storedId}`);
    }
  }, [storedId, router]);

  if (storedId) {
    return (
      <p className="text-center text-sm text-muted-foreground">Buscando tu solicitud...</p>
    );
  }

  return (
    <div className="space-y-2 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos identificar automáticamente tu solicitud en este dispositivo.
      </p>
      <p className="text-xs text-muted-foreground">
        Abrí el enlace de seguimiento que te mostramos al enviar la solicitud (en el mismo
        navegador donde la enviaste), o contactá al club indicando tu número de solicitud.
      </p>
    </div>
  );
}
