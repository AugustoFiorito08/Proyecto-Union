"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";

import type {
  CanalComunicacion,
  Categoria,
  Comunicacion,
  GrupoFamiliarResumen,
  SocioResumen,
} from "@/lib/types";
import {
  actualizarComunicacion,
  crearComunicacion,
  enviarComunicacion,
  programarComunicacion,
  subirAdjuntosComunicacion,
} from "./actions";

const MAX_ADJUNTOS = 5;
const CANALES: { value: CanalComunicacion; label: string; hint: string }[] = [
  { value: "Email", label: "Email", hint: "Envío saliente por correo electrónico." },
  { value: "WhatsApp", label: "WhatsApp", hint: "Envío saliente vía proveedor de mensajería." },
  {
    value: "Novedad",
    label: "Novedad",
    hint: "Feed in-app en el Portal del Socio (\"Mis novedades\"), no es un envío saliente.",
  },
];

type SegmentoTipo = "todos" | "categoriaOGrupo" | "socioEspecifico";
type CategoriaOGrupoTipo = "categoria" | "grupoFamiliar";

interface ComunicacionWizardProps {
  categorias: Categoria[];
  grupos: GrupoFamiliarResumen[];
  socios: SocioResumen[];
  /** Presente solo en modo edición de un borrador ya creado. */
  comunicacionExistente?: Comunicacion;
}

/**
 * `<ComunicacionWizard />` (SPEC.md §7.2): "4 pasos (Destinatarios → Asunto →
 * Editor enriquecido → Opciones), con selector de destinatario segmentado
 * (Todos / Grupo o categoría / Socio específico / Novedad)". "Novedad" en esa
 * enumeración es en rigor un CANAL (`ComunicacionDestinatario.Canal`, §4.2),
 * no un cuarto segmento de destinatario mutuamente excluyente con los otros
 * tres — así lo confirma `lib/types.ts` (`ComunicacionSegmentoInput` solo
 * modela 3 variantes: `todos`/`categoriaId`+`grupoFamiliarId`/`socioIds`).
 * Este wizard separa entonces: 3 radios de segmento (paso 1) + checkboxes de
 * canal independientes (Email/WhatsApp/Novedad, 1 o más).
 *
 * No usa react-hook-form (mismo criterio documentado en
 * `pagos/registrar-pago-dialog.tsx`): la forma del body cambia por completo
 * según el segmento elegido y hay 4 pasos con validación propia cada uno.
 *
 * LIMITACIÓN DE MODO EDICIÓN: `GET /api/comunicaciones/{id}` (`Comunicacion`,
 * `lib/types.ts`) no expone el segmento/canales originales del borrador — el
 * modelo solo los recibe como INPUT de alta (`ComunicacionInput`), no los
 * persiste de forma legible en la respuesta de lectura (gap del contrato
 * [SUPUESTO], a reconciliar). Por eso, al editar un borrador existente, el
 * paso 1 arranca en blanco y hay que volver a elegir destinatarios/canales
 * antes de guardar — asunto/descripción/contenido/adjuntos sí se precargan.
 */
export function ComunicacionWizard({
  categorias,
  grupos,
  socios,
  comunicacionExistente,
}: ComunicacionWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState<string | null>(null);

  // Paso 1 — Destinatarios
  const [segmentoTipo, setSegmentoTipo] = useState<SegmentoTipo>("todos");
  const [categoriaOGrupoTipo, setCategoriaOGrupoTipo] =
    useState<CategoriaOGrupoTipo>("categoria");
  const [categoriaId, setCategoriaId] = useState("");
  const [grupoFamiliarId, setGrupoFamiliarId] = useState("");
  const [socioIdsSeleccionados, setSocioIdsSeleccionados] = useState<string[]>([]);
  const [filtroSocio, setFiltroSocio] = useState("");
  const [canales, setCanales] = useState<CanalComunicacion[]>([]);

  // Paso 2 — Asunto
  const [asunto, setAsunto] = useState(comunicacionExistente?.asunto ?? "");
  const [descripcion, setDescripcion] = useState(comunicacionExistente?.descripcion ?? "");

  // Paso 3 — Contenido
  const [contenidoHtml, setContenidoHtml] = useState(comunicacionExistente?.contenidoHtml ?? "");

  // Paso 4 — Opciones
  // `ComunicacionResponse` (backend real) no devuelve la lista de adjuntos
  // existentes, solo `cantidadAdjuntos` — no hay forma de prefillear ni de
  // mostrarlos por nombre/URL al editar un borrador ya creado, solo de
  // sumar adjuntos nuevos. Limitación conocida, documentada acá.
  const cantidadAdjuntosExistentes = comunicacionExistente?.cantidadAdjuntos ?? 0;
  const [adjuntosNuevos, setAdjuntosNuevos] = useState<File[]>([]);
  const [modoEnvio, setModoEnvio] = useState<"ahora" | "programar">("ahora");
  const [fechaProgramada, setFechaProgramada] = useState("");

  const sociosFiltrados = useMemo(() => {
    const texto = filtroSocio.trim().toLowerCase();
    if (!texto) return socios;
    return socios.filter(
      (socio) =>
        `${socio.apellido} ${socio.nombres}`.toLowerCase().includes(texto) ||
        socio.dni.includes(texto)
    );
  }, [socios, filtroSocio]);

  const slotsAdjuntosDisponibles =
    MAX_ADJUNTOS - cantidadAdjuntosExistentes - adjuntosNuevos.length;

  function validarPaso1(): string | null {
    if (canales.length === 0) return "Elegí al menos un canal de envío.";
    if (segmentoTipo === "categoriaOGrupo") {
      if (categoriaOGrupoTipo === "categoria" && !categoriaId) {
        return "Seleccioná una categoría.";
      }
      if (categoriaOGrupoTipo === "grupoFamiliar" && !grupoFamiliarId) {
        return "Seleccioná un grupo familiar.";
      }
    }
    if (segmentoTipo === "socioEspecifico" && socioIdsSeleccionados.length === 0) {
      return "Seleccioná al menos un socio.";
    }
    return null;
  }

  function validarPaso2(): string | null {
    if (!asunto.trim()) return "Ingresá el asunto.";
    return null;
  }

  function validarPaso3(): string | null {
    const textoPlano = contenidoHtml.replace(/<[^>]*>/g, "").trim();
    if (!textoPlano) return "Escribí el contenido del mensaje.";
    return null;
  }

  function irAlSiguientePaso() {
    const validacion =
      step === 1 ? validarPaso1() : step === 2 ? validarPaso2() : step === 3 ? validarPaso3() : null;
    if (validacion) {
      setError(validacion);
      return;
    }
    setError(null);
    setStep((prev) => (prev < 4 ? ((prev + 1) as typeof prev) : prev));
  }

  function irAlPasoAnterior() {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as typeof prev) : prev));
  }

  function handleArchivosSeleccionados(files: FileList | null) {
    if (!files) return;
    const nuevos = Array.from(files).slice(0, Math.max(0, slotsAdjuntosDisponibles));
    setAdjuntosNuevos((prev) => [...prev, ...nuevos].slice(0, MAX_ADJUNTOS));
  }

  function quitarAdjuntoNuevo(index: number) {
    setAdjuntosNuevos((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarBorrador(): Promise<string | null> {
    const input = {
      asunto: asunto.trim(),
      descripcion: descripcion.trim() || undefined,
      contenidoHtml,
      // "Novedad" como tipo (no confundir con el canal homónimo) es el valor
      // más afín a un mensaje general compuesto a mano — Recordatorio/
      // Cumpleanos quedan reservados para los jobs automáticos, Otro es el
      // catch-all. El wizard no expone un selector de tipo (§7.2).
      tipoComunicacion: "Novedad" as const,
      // `todos` es obligatorio en el body real (bool no nullable) — siempre
      // explícito, nunca se omite.
      segmento:
        segmentoTipo === "todos"
          ? { todos: true }
          : segmentoTipo === "categoriaOGrupo"
            ? categoriaOGrupoTipo === "categoria"
              ? { todos: false, categoriaId }
              : { todos: false, grupoFamiliarId }
            : { todos: false, socioIds: socioIdsSeleccionados },
      canales,
    };

    const result = comunicacionExistente
      ? await actualizarComunicacion(comunicacionExistente.id, input)
      : await crearComunicacion(input);

    if (!result.success) return null;

    const id = result.data.id;

    if (adjuntosNuevos.length > 0) {
      const subida = await subirAdjuntosComunicacion(id, adjuntosNuevos);
      if (!subida.success) {
        setError(`Borrador guardado, pero falló la subida de adjuntos: ${subida.message}`);
        return null;
      }
    }

    return id;
  }

  function handleGuardarBorrador() {
    const validacion = validarPaso1() ?? validarPaso2() ?? validarPaso3();
    if (validacion) {
      setError(validacion);
      return;
    }
    setError(null);
    startTransition(async () => {
      const id = await guardarBorrador();
      if (!id) {
        setError((prev) => prev ?? "No se pudo guardar el borrador.");
        return;
      }
      router.push("/comunicaciones");
      router.refresh();
    });
  }

  function handleFinalizar() {
    const validacion = validarPaso1() ?? validarPaso2() ?? validarPaso3();
    if (validacion) {
      setError(validacion);
      setStep(1);
      return;
    }
    if (modoEnvio === "programar" && !fechaProgramada) {
      setError("Elegí la fecha y hora de envío.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const id = await guardarBorrador();
      if (!id) {
        setError((prev) => prev ?? "No se pudo guardar la comunicación.");
        return;
      }

      const resultadoEnvio =
        modoEnvio === "ahora"
          ? await enviarComunicacion(id)
          : await programarComunicacion(id, {
              fechaProgramada: new Date(fechaProgramada).toISOString(),
            });

      if (!resultadoEnvio.success) {
        setError(
          `La comunicación quedó guardada como borrador, pero falló ${
            modoEnvio === "ahora" ? "el envío" : "la programación"
          }: ${resultadoEnvio.message}`
        );
        return;
      }

      router.push("/comunicaciones");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {comunicacionExistente ? "Editar borrador" : "Nueva comunicación"}
          </CardTitle>
          <span className="text-sm text-muted-foreground">Paso {step} de 4</span>
        </div>
        <div className="flex gap-1.5 pt-2">
          {[1, 2, 3, 4].map((numero) => (
            <div
              key={numero}
              className={
                "h-1.5 flex-1 rounded-full " + (numero <= step ? "bg-primary" : "bg-muted")
              }
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Destinatarios</Label>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="segmento"
                    checked={segmentoTipo === "todos"}
                    onChange={() => setSegmentoTipo("todos")}
                  />
                  Todos los socios
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="segmento"
                    checked={segmentoTipo === "categoriaOGrupo"}
                    onChange={() => setSegmentoTipo("categoriaOGrupo")}
                  />
                  Categoría o Grupo Familiar
                </label>
                {segmentoTipo === "categoriaOGrupo" ? (
                  <div className="ml-6 space-y-3 rounded-md border border-border p-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="categoriaOGrupoTipo"
                          checked={categoriaOGrupoTipo === "categoria"}
                          onChange={() => setCategoriaOGrupoTipo("categoria")}
                        />
                        Categoría
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="categoriaOGrupoTipo"
                          checked={categoriaOGrupoTipo === "grupoFamiliar"}
                          onChange={() => setCategoriaOGrupoTipo("grupoFamiliar")}
                        />
                        Grupo Familiar
                      </label>
                    </div>

                    {categoriaOGrupoTipo === "categoria" ? (
                      <Select value={categoriaId || undefined} onValueChange={(v) => setCategoriaId(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccioná una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={grupoFamiliarId || undefined}
                        onValueChange={(v) => setGrupoFamiliarId(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccioná un grupo familiar" />
                        </SelectTrigger>
                        <SelectContent>
                          {grupos.map((grupo) => (
                            <SelectItem key={grupo.id} value={grupo.id}>
                              {grupo.nombre || grupo.numeroGrupo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : null}

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="segmento"
                    checked={segmentoTipo === "socioEspecifico"}
                    onChange={() => setSegmentoTipo("socioEspecifico")}
                  />
                  Socio específico
                </label>
                {segmentoTipo === "socioEspecifico" ? (
                  <div className="ml-6 space-y-2">
                    <Input
                      placeholder="Buscar por nombre o DNI..."
                      value={filtroSocio}
                      onChange={(event) => setFiltroSocio(event.target.value)}
                    />
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                      {sociosFiltrados.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-muted-foreground">Sin resultados.</p>
                      ) : (
                        sociosFiltrados.map((socio) => {
                          const checked = socioIdsSeleccionados.includes(socio.id);
                          return (
                            <label
                              key={socio.id}
                              className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  setSocioIdsSeleccionados((prev) =>
                                    value
                                      ? [...prev, socio.id]
                                      : prev.filter((id) => id !== socio.id)
                                  )
                                }
                              />
                              {socio.apellido}, {socio.nombres} (DNI {socio.dni})
                            </label>
                          );
                        })
                      )}
                    </div>
                    {socioIdsSeleccionados.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {socioIdsSeleccionados.length} socio(s) seleccionado(s).
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canales de envío</Label>
              <div className="space-y-2">
                {CANALES.map((canal) => {
                  const checked = canales.includes(canal.value);
                  return (
                    <label key={canal.value} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        onCheckedChange={(value) =>
                          setCanales((prev) =>
                            value
                              ? [...prev, canal.value]
                              : prev.filter((c) => c !== canal.value)
                          )
                        }
                      />
                      <span>
                        <span className="font-medium">{canal.label}</span>
                        <span className="block text-xs text-muted-foreground">{canal.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asunto">Asunto</Label>
              <Input
                id="asunto"
                value={asunto}
                onChange={(event) => setAsunto(event.target.value)}
                placeholder="Ej.: Corte de agua programado para el sábado"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción breve (opcional)</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Copete corto que se muestra en el listado"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <Label>Contenido del mensaje</Label>
            <RichTextEditor value={contenidoHtml} onChange={setContenidoHtml} />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Adjuntos (hasta {MAX_ADJUNTOS})</Label>
              {/* `ComunicacionResponse` no expone la lista de adjuntos existentes (solo
                  `cantidadAdjuntos`) — no hay forma de listarlos por nombre acá al editar
                  un borrador, solo de informar cuántos hay ya cargados. */}
              {cantidadAdjuntosExistentes > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ya hay {cantidadAdjuntosExistentes} adjunto(s) cargado(s) en este borrador.
                </p>
              ) : null}
              {adjuntosNuevos.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {adjuntosNuevos.map((archivo, index) => (
                    <li key={`${archivo.name}-${index}`} className="flex items-center gap-2">
                      <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{archivo.name}</span>
                      <button
                        type="button"
                        onClick={() => quitarAdjuntoNuevo(index)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${archivo.name}`}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {slotsAdjuntosDisponibles > 0 ? (
                <Input
                  type="file"
                  multiple
                  onChange={(event) => handleArchivosSeleccionados(event.target.files)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Llegaste al máximo de adjuntos.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Envío</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="modoEnvio"
                    checked={modoEnvio === "ahora"}
                    onChange={() => setModoEnvio("ahora")}
                  />
                  Enviar ahora
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="modoEnvio"
                    checked={modoEnvio === "programar"}
                    onChange={() => setModoEnvio("programar")}
                  />
                  Programar envío
                </label>
              </div>
              {modoEnvio === "programar" ? (
                <Input
                  type="datetime-local"
                  value={fechaProgramada}
                  onChange={(event) => setFechaProgramada(event.target.value)}
                  className="max-w-xs"
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-2">
        <div>
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={irAlPasoAnterior} disabled={isPending}>
              Atrás
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.push("/comunicaciones")}>
              Cancelar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step === 4 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleGuardarBorrador}
              disabled={isPending}
            >
              Guardar como borrador
            </Button>
          ) : null}
          {step < 4 ? (
            <Button type="button" onClick={irAlSiguientePaso} disabled={isPending}>
              Siguiente
            </Button>
          ) : (
            <Button type="button" onClick={handleFinalizar} disabled={isPending}>
              {isPending
                ? "Guardando..."
                : modoEnvio === "ahora"
                  ? "Enviar ahora"
                  : "Programar envío"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
