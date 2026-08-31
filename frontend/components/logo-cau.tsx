interface LogoCauProps {
  className?: string;
  /** Color del escudo. Por defecto usa el verde institucional del propio SVG. */
  variant?: "color" | "monocromo";
  /** Para usarlo como marca de agua decorativa, sin anunciarlo al lector de pantalla. */
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Escudo del Club Atlético Unión, reconstruido como SVG a partir del export de
 * Figma (`diseño-web/`, pantalla "Inicio de sesión"): escudo verde #00923F con
 * contorno blanco, banda horizontal blanca y las siglas "CAU" en verde.
 *
 * Se dibuja como vector en lugar de usar un PNG recortado del diseño porque el
 * logo aparece a tamaños muy distintos (20px en el sidebar, ~250px en el login)
 * y el recorte disponible era de 56px — escalarlo se veía borroso.
 *
 * `variant="monocromo"` lo pinta enteramente en `currentColor` — todas las
 * partes, incluidas las siglas, para que la opacidad del contenedor las afecte
 * por igual. Es lo que permite usarlo como marca de agua muy tenue
 * (`text-white/[0.04]`) sin que las siglas se destaquen sobre el resto.
 */
export function LogoCau({
  className,
  variant = "color",
  "aria-hidden": ariaHidden,
}: LogoCauProps) {
  const esMono = variant === "monocromo";
  const verde = esMono ? "currentColor" : "#00923F";
  const blanco = esMono ? "transparent" : "#FFFFFF";
  const decorativo = ariaHidden === true || ariaHidden === "true";

  return (
    <svg
      viewBox="0 0 96 108"
      className={className}
      role={decorativo ? undefined : "img"}
      aria-hidden={decorativo ? true : undefined}
      aria-label={decorativo ? undefined : "Club Atlético Unión"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contorno del escudo */}
      <path
        d="M48 1.5 C36 6 20 9 4.5 10 L4.5 54 C4.5 79 22 96.5 48 106.5 C74 96.5 91.5 79 91.5 54 L91.5 10 C76 9 60 6 48 1.5 Z"
        fill={esMono ? "currentColor" : "#FFFFFF"}
      />
      {/* Cuerpo del escudo */}
      <path
        d="M48 9 C37 13 22.5 15.7 11.5 16.6 L11.5 54 C11.5 75.5 26.5 91 48 99.8 C69.5 91 84.5 75.5 84.5 54 L84.5 16.6 C73.5 15.7 59 13 48 9 Z"
        fill={esMono ? "currentColor" : verde}
        fillOpacity={esMono ? 0.45 : 1}
      />
      {/* Banda horizontal */}
      <path
        d="M11.5 39.5 L84.5 39.5 L84.5 68 L11.5 68 Z"
        fill={esMono ? "currentColor" : blanco}
      />
      {/* Siglas CAU */}
      <text
        x="48"
        y="59.5"
        textAnchor="middle"
        fill={esMono ? "currentColor" : verde}
        fillOpacity={esMono ? 0.45 : 1}
        fontSize="22"
        fontWeight="800"
        letterSpacing="1"
        fontFamily="var(--font-inter), ui-sans-serif, system-ui, sans-serif"
      >
        CAU
      </text>
    </svg>
  );
}
