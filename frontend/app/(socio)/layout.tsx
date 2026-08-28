/**
 * [DECISIÓN — Etapa 2 parte 2] Mismo criterio que
 * `app/(instructor)/layout.tsx`: el chrome real del Portal del Socio vive en
 * `app/(socio)/mi-cuenta/layout.tsx` (ruta base `/mi-cuenta`, SPEC.md §7.1).
 * Este layout de raíz del route group queda como passthrough puro.
 */
export default function SocioGroupLayout({ children }: LayoutProps<"/">) {
  return children;
}
