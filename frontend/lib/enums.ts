/**
 * Conversión entre los enums "amigables" (string) que usa la UI y el formato
 * numérico que espera el backend .NET en el *body* de los requests (los
 * enums de C# se serializan como su valor entero salvo que se configure
 * `JsonStringEnumConverter`, que la API no tiene habilitado). Las
 * *respuestas* del backend sí vienen como string (`enum.ToString()` explícito
 * en cada Controller) — esta conversión solo aplica al escribir, nunca al leer.
 *
 * Valores confirmados contra `backend/src/ProyectoUnion.Domain/Entities/Socio.cs`
 * y `GrupoFamiliar.cs`.
 */
import type {
  EspacioTipo,
  EstadoActividad,
  EstadoCuota,
  EstadoDivisionDeportiva,
  EstadoEspacio,
  EstadoInstructor,
  EstadoPago,
  EstadoReserva,
  MedioPago,
  Modalidad,
  ModalidadInscripcion,
  Parentesco,
  TipoPago,
  TipoReserva,
  TipoTarifaFamiliar,
  UnidadPrecio,
} from "@/lib/types";

export const TIPO_PAGO_A_INT: Record<TipoPago, number> = {
  Mensual: 1,
  Semestral: 2,
  Anual: 3,
  Estudiante: 4,
};

export const MODALIDAD_A_INT: Record<Modalidad, number> = {
  Cobrador: 1,
  SecretariaWeb: 2,
};

export const PARENTESCO_A_INT: Record<Parentesco, number> = {
  Titular: 1,
  Conyuge: 2,
  Hijo: 3,
};

/**
 * Mapas de enum Etapa 2 — parte 1 (Actividades, Instructores, Espacios,
 * Reservas). Mismos valores enteros que los enums de C# reales cuando el
 * backend ya los define (`backend/.../Entities/Actividad.cs`,
 * `DivisionDeportiva.cs`, `Instructor.cs`, declaración `1..N` en el orden del
 * enum); para Espacio/Reserva (sin entidad de backend todavía, ver
 * `lib/types.ts`) se asume el mismo criterio: 1..N en el orden en que
 * aparecen listados en SPEC.md §4.2.
 */
export const ESTADO_ACTIVIDAD_A_INT: Record<EstadoActividad, number> = {
  Activa: 1,
  Suspendida: 2,
  Finalizada: 3,
};

export const MODALIDAD_INSCRIPCION_A_INT: Record<ModalidadInscripcion, number> = {
  HorarioFijo: 1,
  PaseLibre: 2,
};

export const ESTADO_DIVISION_DEPORTIVA_A_INT: Record<EstadoDivisionDeportiva, number> = {
  Activa: 1,
  Inactiva: 2,
};

export const ESTADO_INSTRUCTOR_A_INT: Record<EstadoInstructor, number> = {
  Activo: 1,
  Inactivo: 2,
};

// [SUPUESTO] Espacio.Tipo ya renombrado en SPEC.md §7.3 a Deportivo/Recreativo/Eventos.
export const ESPACIO_TIPO_A_INT: Record<EspacioTipo, number> = {
  Deportivo: 1,
  Recreativo: 2,
  Eventos: 3,
};

export const UNIDAD_PRECIO_A_INT: Record<UnidadPrecio, number> = {
  PorHora: 1,
  PorTurno: 2,
  PorEvento: 3,
};

export const ESTADO_ESPACIO_A_INT: Record<EstadoEspacio, number> = {
  Activo: 1,
  Inactivo: 2,
};

export const TIPO_RESERVA_A_INT: Record<TipoReserva, number> = {
  Partido: 1,
  Entrenamiento: 2,
  ReunionDirectiva: 3,
  Capacitacion: 4,
  Evento: 5,
  Otro: 6,
};

export const ESTADO_RESERVA_A_INT: Record<EstadoReserva, number> = {
  PendienteConfirmacion: 1,
  Confirmada: 2,
  Rechazada: 3,
  Pagada: 4,
  Cancelada: 5,
};

/**
 * Mapas de enum Etapa 3 (Finanzas — SPEC.md §3.2/§3.5/§4.2/§5). Valores
 * confirmados contra `backend/.../Entities/{Cuota,Pago,ConfiguracionGeneral}.cs`.
 */
export const ESTADO_CUOTA_A_INT: Record<EstadoCuota, number> = {
  Pendiente: 1,
  Pagada: 2,
  Vencida: 3,
};

export const ESTADO_PAGO_A_INT: Record<EstadoPago, number> = {
  Pendiente: 1,
  Pagada: 2,
  Rechazada: 3,
  PendienteReembolso: 4,
};

export const MEDIO_PAGO_A_INT: Record<MedioPago, number> = {
  Efectivo: 1,
  Transferencia: 2,
  MercadoPago: 3,
};

export const TIPO_TARIFA_FAMILIAR_A_INT: Record<TipoTarifaFamiliar, number> = {
  TarifaPlanaGrupo: 1,
  SumaCategoriasIndividuales: 2,
};
