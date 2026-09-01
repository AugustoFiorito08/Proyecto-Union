import Image from "next/image";

import logoCau from "@/public/logo-cau.png";

interface LogoCauProps {
  className?: string;
  /** Para usarlo como elemento decorativo, sin anunciarlo al lector de pantalla. */
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Escudo oficial del Club Atlético Unión (`public/logo-cau.png`, 994×1116 con
 * transparencia, verde institucional #00933F).
 *
 * Es el archivo real que entregó el club, no una reconstrucción: la versión
 * anterior era un SVG dibujado a mano a partir de una captura del diseño y no
 * era fiel — las siglas del escudo real son de estilo collegiate, con las
 * esquinas achaflanadas, y el borde superior tiene dos hombros con una curva
 * cóncava en el medio. Aproximar una marca se nota.
 *
 * Se usa `next/image` con import estático para que Next conozca las medidas y
 * sirva el tamaño adecuado: el logo aparece desde 20px en el sidebar hasta
 * ~180px en el login.
 */
export function LogoCau({ className, "aria-hidden": ariaHidden }: LogoCauProps) {
  const decorativo = ariaHidden === true || ariaHidden === "true";

  return (
    <Image
      src={logoCau}
      alt={decorativo ? "" : "Club Atlético Unión"}
      aria-hidden={decorativo ? true : undefined}
      className={className}
      priority
    />
  );
}
