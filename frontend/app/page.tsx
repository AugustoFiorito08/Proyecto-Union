import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone, Clock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { ConfiguracionPublica } from "@/lib/types";
import { LogoCau } from "@/components/logo-cau";

export const dynamic = "force-dynamic";

/**
 * Disciplinas y pasos son el único contenido de esta página que no viene del
 * backend. Las disciplinas salieron del propio export de Figma del club
 * (`diseño-web/`, gráfico "Deportistas por actividad") — están acá arriba, en
 * una sola constante, para que el club las corrija sin tocar el markup.
 *
 * A propósito NO se publica ningún dato duro (cantidad de socios, año de
 * fundación, títulos): serían afirmaciones sobre una institución real que este
 * proyecto no tiene forma de verificar.
 */
const DISCIPLINAS = [
  "Fútbol",
  "Tenis",
  "Pádel",
  "Vóley",
  "Natación",
  "Hockey",
  "Gimnasia",
  "Golf",
] as const;

/**
 * Los 3 pasos describen el flujo real de `SolicitudMembresia` (Etapa 6):
 * alta pública con adjuntos → revisión de secretaría con aviso por email →
 * aprobación que da de alta al Socio y habilita su carnet con QR (Etapas 1 y 5).
 * La numeración es honesta: es una secuencia real, no un adorno.
 */
const PASOS = [
  {
    n: "01",
    titulo: "Enviás la solicitud",
    detalle:
      "Completás tus datos y adjuntás tu documento y la ficha médica. No hace falta que vengas al club.",
  },
  {
    n: "02",
    titulo: "La revisa la secretaría",
    detalle:
      "El club valida la documentación y te avisa por email cuando la solicitud queda resuelta.",
  },
  {
    n: "03",
    titulo: "Recibís tu carnet",
    detalle:
      "Te asignamos tu número de socio y tu carnet digital con QR, con el que entrás al club.",
  },
] as const;

/** Patrón fijo, decorativo — representa el QR del carnet, no es un código escaneable. */
const QR_PATRON = [
  "1110111", "1000101", "1011101", "1010001", "1110111", "0001010", "1101011",
] as const;

function CarnetQr() {
  return (
    <svg viewBox="0 0 7 7" className="size-full" aria-hidden="true" shapeRendering="crispEdges">
      <rect width="7" height="7" fill="#FFFFFF" />
      {QR_PATRON.map((fila, y) =>
        fila.split("").map((celda, x) =>
          celda === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#062A19" />
          ) : null,
        ),
      )}
    </svg>
  );
}

/**
 * Elemento firma de la landing: el carnet de socio. Es el objeto que en un club
 * dice "pertenecés", y además es una vista honesta de lo que el sistema
 * realmente emite (carnet digital con QR, Etapas 1 y 5). Lleva "TU NOMBRE" en
 * vez de un nombre inventado: se lee como una plantilla esperando al visitante,
 * que es justo lo que propone el titular de la página.
 */
function CarnetSocio() {
  return (
    <div className="landing-carnet w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#12764A] to-[#062A19] p-6 shadow-2xl ring-1 ring-white/15">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LogoCau className="size-9 shrink-0" />
          <div className="font-condensed leading-none text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
              Carnet de socio
            </p>
            <p className="text-lg font-bold uppercase tracking-wide">Club Atlético Unión</p>
          </div>
        </div>
        <div className="size-12 shrink-0 overflow-hidden rounded bg-white p-1">
          <CarnetQr />
        </div>
      </div>

      <div className="mt-8 border-t border-white/15 pt-4">
        <p className="font-condensed text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
          Socio
        </p>
        <p className="font-display text-2xl uppercase leading-tight tracking-tight text-white">
          Tu nombre
        </p>
      </div>
    </div>
  );
}

/**
 * Landing pública (SPEC.md §7.1). Consume `GET /api/configuracion/publica`
 * ([NUEVO-SPEC-UI], §5 "Configuración" — sin sesión, subconjunto de
 * `ConfiguracionGeneral` sin datos financieros ni de acceso). Defensivo a
 * propósito: si el SuperAdmin nunca cargó los datos institucionales, o el
 * fetch falla, la página se muestra completa igual y solo se omite esa sección.
 *
 * A diferencia del resto de la app, esta página fija su propia paleta (verdes
 * institucionales explícitos) en lugar de usar los tokens de tema: es una
 * pieza de marca y debe verse igual para cualquier visitante, sin depender de
 * si su sistema está en modo claro u oscuro.
 */
export default async function Home() {
  const configuracion = await apiFetch<ConfiguracionPublica>("/api/configuracion/publica").catch(
    () => null,
  );

  const nombreClub = configuracion?.nombreClub || "Club Atlético Unión";

  const datosInstitucionales = [
    { icono: MapPin, etiqueta: "Dónde estamos", valor: configuracion?.direccion },
    { icono: Phone, etiqueta: "Teléfono", valor: configuracion?.telefono },
    { icono: Mail, etiqueta: "Email", valor: configuracion?.emailContacto },
    { icono: Clock, etiqueta: "Horarios", valor: configuracion?.horariosFuncionamiento },
  ].filter((dato) => Boolean(dato.valor));

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#F2F5F1]">
      {/* ---------- Barra superior ---------- */}
      <header className="absolute inset-x-0 top-0 z-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2.5 text-white">
            <LogoCau className="size-9 shrink-0" />
            <span className="font-condensed text-lg font-bold uppercase tracking-wide">
              {nombreClub}
            </span>
          </span>
          <Link
            href="/login"
            className="rounded-full px-4 py-2 font-condensed text-sm font-semibold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ingresar
          </Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      {/* El carnet es el único elemento visual del hero a propósito: un escudo de
          marca de agua detrás competía con él y lo debilitaba. */}
      <section className="relative overflow-hidden bg-[#062A19] px-6 pb-20 pt-28 sm:pb-24 sm:pt-32">
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="font-condensed text-sm font-semibold uppercase tracking-[0.32em] text-[#4FD98A]">
              Pasión · Compromiso · Familia
            </p>
            <h1 className="mt-5 font-display text-5xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              El club
              <br />
              también
              <br />
              <span className="text-[#4FD98A]">es tuyo</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-white/70">
              Asociate al {nombreClub} y entrá a las canchas, las actividades y la vida del club
              con tu carnet digital.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/solicitud-membresia"
                className="group inline-flex items-center gap-2 rounded-full bg-[#00923F] px-7 py-3.5 font-condensed text-base font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#00A648] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sumate al club
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/login"
                className="rounded-full px-5 py-3.5 font-condensed text-base font-semibold uppercase tracking-widest text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ya soy socio
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <CarnetSocio />
          </div>
        </div>
      </section>

      {/* ---------- Disciplinas ---------- */}
      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.32em] text-[#00923F]">
            En el club
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl uppercase leading-tight tracking-tight text-[#062A19] sm:text-4xl">
            Ocho disciplinas, una sola camiseta
          </h2>

          <ul className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {DISCIPLINAS.map((disciplina) => (
              <li
                key={disciplina}
                className="flex items-baseline justify-between border-b border-[#062A19]/12 py-5"
              >
                <span className="font-condensed text-2xl font-semibold uppercase tracking-wide text-[#062A19] sm:text-3xl">
                  {disciplina}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Cómo asociarte ---------- */}
      <section className="bg-[#0E663B] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.32em] text-[#4FD98A]">
            Cómo asociarte
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl uppercase leading-tight tracking-tight text-white sm:text-4xl">
            Tres pasos y estás adentro
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <li key={paso.n} className="border-t border-white/20 pt-5">
                <span className="font-display text-4xl leading-none text-white/25">{paso.n}</span>
                <h3 className="mt-4 font-condensed text-xl font-bold uppercase tracking-wide text-white">
                  {paso.titulo}
                </h3>
                <p className="mt-2.5 leading-relaxed text-white/70">{paso.detalle}</p>
              </li>
            ))}
          </ol>

          <Link
            href="/solicitud-membresia"
            className="group mt-12 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-condensed text-base font-bold uppercase tracking-widest text-[#0E663B] transition-colors hover:bg-[#E8F5ED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Empezar mi solicitud
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* ---------- Datos institucionales (solo si el club los cargó) ---------- */}
      {datosInstitucionales.length > 0 ? (
        <section className="px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="font-condensed text-sm font-semibold uppercase tracking-[0.32em] text-[#00923F]">
              Visitanos
            </p>
            <dl className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {datosInstitucionales.map(({ icono: Icono, etiqueta, valor }) => (
                <div key={etiqueta} className="border-t border-[#062A19]/12 pt-5">
                  <dt className="flex items-center gap-2 font-condensed text-sm font-semibold uppercase tracking-widest text-[#062A19]/50">
                    <Icono className="size-4 shrink-0" aria-hidden="true" />
                    {etiqueta}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-[#062A19]">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {/* ---------- Pie ---------- */}
      <footer className="mt-auto bg-[#062A19] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <LogoCau className="size-10 shrink-0" />
            <div className="font-condensed leading-tight text-white">
              <p className="text-base font-bold uppercase tracking-wide">{nombreClub}</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                Pasión · Compromiso · Familia
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="font-condensed text-sm font-semibold uppercase tracking-widest text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Acceso de socios y staff
          </Link>
        </div>
      </footer>
    </div>
  );
}
