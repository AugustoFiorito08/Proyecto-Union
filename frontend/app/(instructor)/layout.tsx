/**
 * [DECISIÓN — Etapa 2 parte 2] La Parte 1 había puesto acá el chrome
 * completo del mini-portal del Instructor (header + info de rol) como
 * placeholder mínimo. SPEC.md §7.1 pide la pantalla real en
 * `/instructor/actividades` (ruta anidada, no la raíz del route group), así
 * que el sidebar/header reducido definitivo se movió a
 * `app/(instructor)/instructor/layout.tsx` — ver ese archivo. Este layout de
 * raíz del route group se deja como passthrough puro (sin chrome propio)
 * para no duplicar header/sidebar anidando dos layouts con UI.
 */
export default function InstructorGroupLayout({ children }: LayoutProps<"/">) {
  return children;
}
