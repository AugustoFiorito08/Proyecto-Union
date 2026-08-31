import type { Metadata } from "next";
import { Inter, Geist_Mono, Archivo_Black, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Inter: sans geométrica de la identidad visual del club (export de Figma en
// `diseño-web/`). La variable la consume `--font-sans` en globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Las dos familias siguientes son exclusivas de la landing pública (`app/page.tsx`):
// una grotesca pesada para los títulos y una condensada tipo cartelería de club
// para volantas, números y listados. Se declaran acá (mismo patrón probado que el
// resto) pero solo se descargan en las páginas que efectivamente las usan.
const archivoBlack = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Atlético Unión — Sistema de gestión",
  description: "Sistema de gestión del Club Atlético Unión (CAU).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} ${archivoBlack.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
