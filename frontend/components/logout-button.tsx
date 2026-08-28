import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth-actions";

/**
 * Botón de logout compartido entre el mini-portal del Instructor y el Portal
 * del Socio (ver decisión de diseño en `lib/auth-actions.ts`). Es un Server
 * Component: un `<form action={serverAction}>` no necesita `"use client"`
 * para invocar una Server Action.
 */
export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
        Cerrar sesión
      </button>
    </form>
  );
}
