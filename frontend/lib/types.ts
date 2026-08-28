/**
 * Tipos de dominio para Etapa 1 (Socios, Grupos Familiares, Categorías,
 * Coberturas Médicas), verificados contra el código real del backend
 * (`backend/src/ProyectoUnion.Application/Dtos/**`) — no son un supuesto.
 *
 * Dos particularidades del contrato real a tener en cuenta en todo el
 * frontend:
 * 1. Las relaciones (Categoria, CoberturaMedica, Plan, titular de un grupo)
 *    NO viajan como objeto anidado — el backend proyecta un campo plano
 *    `*Nombre` (ej. `categoriaNombre`, `titularApellidoNombres`) para evitar
 *    payloads N+1. No hay `socio.categoria.nombre`, hay `socio.categoriaNombre`.
 * 2. Los enums viajan como **string** al leer (`enum.ToString()` explícito en
 *    cada Controller) pero se esperan como **número** al escribir (el body
 *    de un POST/PUT) — ver `lib/enums.ts` para la conversión, que se aplica
 *    en los Server Actions, nunca acá.
 */

export type SocioEstado = "Activo" | "Suspendido" | "Inactivo";
export type Genero = "Masculino" | "Femenino" | "Otro";
export type TipoPago = "Mensual" | "Semestral" | "Anual" | "Estudiante";
export type Parentesco = "Titular" | "Conyuge" | "Hijo";
export type Modalidad = "Cobrador" | "SecretariaWeb";

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string | null;
  valorCuota: number;
  estado: "Activo" | "Inactivo";
}

export interface Plan {
  id: string;
  coberturaMedicaId: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
}

export interface CoberturaMedica {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: "Activo" | "Inactivo";
  planes?: Plan[];
}

export interface SocioResumen {
  id: string;
  numeroSocio: string;
  apellido: string;
  nombres: string;
  dni: string;
  email: string;
  telefono?: string | null;
  estado: SocioEstado;
  categoriaId: string;
  categoriaNombre: string;
  grupoFamiliarId?: string | null;
}

/** "Vigente" | "ProximaAVencer" | "Vencida" — solo viene poblado cuando el
 * rol del usuario autenticado NO tiene acceso a la ficha médica completa
 * (regla transversal, SPEC.md §2.2); en ese caso los campos de ficha médica
 * de abajo vienen todos en `null`. */
export type FichaMedicaVigencia = "Vigente" | "ProximaAVencer" | "Vencida";

export interface Socio extends SocioResumen {
  cuil?: string | null;
  fechaNacimiento: string;
  genero: Genero;
  nacionalidad?: string | null;
  tipoPago: TipoPago;
  celular?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  coberturaMedicaId?: string | null;
  coberturaMedicaNombre?: string | null;
  planId?: string | null;
  planNombre?: string | null;
  grupoSanguineo?: string | null;
  contactoEmergencia?: string | null;
  observacionesMedicas?: string | null;
  fichaMedicaFechaEmision?: string | null;
  fichaMedicaFechaVencimiento?: string | null;
  fotoUrl?: string | null;
  parentesco?: Parentesco | null;
  modalidad: Modalidad;
  fechaAlta: string;
  fechaBaja?: string | null;
  motivoBaja?: string | null;
  codigoQr: string;
  consentimientoDatosSaludFecha?: string | null;
  fichaMedicaVigencia?: FichaMedicaVigencia | null;
}

export interface SocioInput {
  apellido: string;
  nombres: string;
  dni: string;
  fechaNacimiento: string;
  genero: Genero;
  categoriaId: string;
  telefono?: string;
  celular?: string;
  email: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  coberturaMedicaId?: string;
  planId?: string;
  tipoPago: TipoPago;
  grupoSanguineo?: string;
  observacionesMedicas?: string;
  fichaMedicaFechaEmision?: string;
  contactoEmergencia?: string;
  consentimientoDatosSalud: boolean;
  modalidad: Modalidad;
}

/** Shape real de `IntegranteGrupoFamiliarResponse` — el backend combina
 * apellido+nombres en un solo string y no incluye DNI por integrante. */
export interface GrupoFamiliarIntegrante {
  socioId: string;
  apellidoNombres: string;
  parentesco: Parentesco | null;
}

export interface GrupoFamiliarResumen {
  id: string;
  numeroGrupo: string;
  nombre: string;
  tipo: string;
  estado: "Activo" | "Inactivo";
  titularSocioId: string;
  titularApellidoNombres: string;
  // El backend usa el mismo mapper para listado y detalle: `integrantes`
  // viaja completo en ambas respuestas, no solo en el detalle.
  integrantes: GrupoFamiliarIntegrante[];
}

export interface GrupoFamiliar extends GrupoFamiliarResumen {
  observaciones?: string | null;
  motivoBaja?: string | null;
  fechaCreacion: string;
  fechaBaja?: string | null;
}

export interface GrupoFamiliarInput {
  titularSocioId: string;
  nombre?: string;
  observaciones?: string;
}

export interface GrupoFamiliarIntegranteInput {
  socioId: string;
  parentesco: Exclude<Parentesco, "Titular">;
}

export interface CambiarTitularInput {
  nuevoTitularSocioId: string;
}

// Sin `estado`: ninguno de estos tres Request del backend lo acepta en
// alta/edición — el alta siempre crea en Activo y la baja es un endpoint
// aparte (`POST .../baja`) en cada controller.
export interface CategoriaInput {
  nombre: string;
  descripcion?: string;
  valorCuota: number;
}

export interface CoberturaMedicaInput {
  nombre: string;
  descripcion?: string;
}

export interface PlanInput {
  nombre: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Tipos de dominio para Etapa 2 — parte 1 (Actividades, Instructores,
 * Espacios/Amenities, Reservas — SPEC.md §4.2/§5). A diferencia de Etapa 1,
 * el backend real de estas entidades está parcialmente escrito en paralelo
 * (`backend/src/ProyectoUnion.Domain/Entities/Actividad.cs`,
 * `ActividadInstructor.cs`, `DivisionDeportiva.cs`, `DivisionInstructor.cs`,
 * `Instructor.cs`, `Amenity.cs`, `EspacioAmenity.cs` ya existen; no hay
 * `Espacio.cs` ni `Reserva.cs` todavía) — los shapes de Espacio/Reserva son
 * un supuesto basado 100% en SPEC.md, a reconciliar cuando el backend los
 * defina. Mismas dos reglas de Etapa 1: relaciones como campo plano
 * (`categoriaNombre`, no `categoria.nombre`) y enums como string al leer /
 * número al escribir (ver `lib/enums.ts`).
 */

// ---------------------------------------------------------------------------
// Actividades
// ---------------------------------------------------------------------------

export type EstadoActividad = "Activa" | "Suspendida" | "Finalizada";
export type ModalidadInscripcion = "HorarioFijo" | "PaseLibre";
export type EstadoDivisionDeportiva = "Activa" | "Inactiva";

/**
 * Item de la proyección N:M Actividad↔Instructor / DivisionDeportiva↔Instructor
 * (RN-ACT-02, SPEC.md §3.17). No es un objeto anidado del Instructor completo
 * (eso violaría la regla de campos planos) — es la misma clase de proyección
 * liviana que `GrupoFamiliarIntegrante` en Etapa 1: solo el id de la relación
 * y un string ya combinado para mostrar en UI (`<AvatarGroup />`, §7.2).
 */
export interface InstructorAsignado {
  instructorId: string;
  instructorApellidoNombres: string;
}

export interface DivisionDeportiva {
  id: string;
  actividadId: string;
  nombre: string;
  edadMinima?: number | null;
  edadMaxima?: number | null;
  /** Texto libre, igual que el backend (`DivisionDeportiva.Genero` es `string?`, no enum). */
  genero?: string | null;
  /** Días separados por coma, ej. "Lunes,Miercoles" — mismo formato que `Actividad.Dias`. */
  dias?: string | null;
  horarioInicio: string;
  horarioFin: string;
  estado: EstadoDivisionDeportiva;
  instructores: InstructorAsignado[];
}

/**
 * [SUPUESTO] SPEC.md §5 solo lista `POST`/`PUT .../divisiones[/{id}]` para
 * los campos propios de la división — no hay un endpoint separado tipo
 * `.../divisiones/{id}/instructores` (a diferencia de la Actividad, que sí
 * tiene `PUT .../instructores` dedicado). Se asume que el mismo body de
 * alta/edición de división acepta `instructorIds` y reemplaza el conjunto
 * completo de `DivisionInstructor`, igual que hace `PUT .../instructores` a
 * nivel Actividad — a reconciliar contra el backend real.
 */
export interface DivisionDeportivaInput {
  nombre: string;
  edadMinima?: number;
  edadMaxima?: number;
  genero?: string;
  dias?: string;
  horarioInicio: string;
  horarioFin: string;
  estado: EstadoDivisionDeportiva;
}

/** Body de `PUT /api/actividades/{id}/divisiones/{divisionId}/instructores` — mismo shape que `ActividadInstructoresInput`, endpoint dedicado y separado del alta/edición de la división. */
export interface DivisionInstructoresInput {
  instructorIds: string[];
}

export interface ActividadResumen {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoriaId: string;
  categoriaNombre: string;
  espacioId?: string | null;
  espacioNombre?: string | null;
  precio?: number | null;
  modalidadInscripcion: ModalidadInscripcion;
  cupoMinimo: number;
  cupoMaximo: number;
  /** `ActividadResponse.CupoOcupado` — cantidad de `Inscripcion` en estado Activa. */
  cupoOcupado: number;
  dias?: string | null;
  horarioInicio: string;
  horarioFin: string;
  duracion: number;
  estado: EstadoActividad;
  imagenUrl?: string | null;
  instructores: InstructorAsignado[];
}

export interface Actividad extends ActividadResumen {
  fechaUltimaModificacion: string;
  divisiones: DivisionDeportiva[];
}

export interface ActividadInput {
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  espacioId?: string;
  precio?: number;
  modalidadInscripcion: ModalidadInscripcion;
  cupoMinimo: number;
  cupoMaximo: number;
  dias?: string;
  horarioInicio: string;
  horarioFin: string;
  duracion: number;
  /** Requerido por `CrearActividadRequest`/`ActualizarActividadRequest` — el form de alta/edición
   * no lo expone (lo maneja `ActividadEstadoActions` aparte); se completa en `actions.ts`:
   * "Suspendida" en el alta, el valor actual sin cambios en la edición. */
  estado: EstadoActividad;
}

/** Body de `PUT /api/actividades/{id}/instructores` (RN-ACT-02, §3.17) — reemplaza el conjunto completo. */
export interface ActividadInstructoresInput {
  instructorIds: string[];
}

// ---------------------------------------------------------------------------
// Instructores
// ---------------------------------------------------------------------------

export type EstadoInstructor = "Activo" | "Inactivo";

export interface Instructor {
  id: string;
  usuarioId: string;
  apellido: string;
  nombres: string;
  dni: string;
  telefono?: string | null;
  email: string;
  especialidad?: string | null;
  estado: EstadoInstructor;
}

export interface InstructorInput {
  apellido: string;
  nombres: string;
  dni: string;
  telefono?: string;
  email: string;
  especialidad?: string;
}

/** Body de edición — sin `dni` (no editable) ni contraseña (eso es "restablecer contraseña", fuera de alcance de esta parte). */
export interface InstructorEditarInput {
  apellido: string;
  nombres: string;
  telefono?: string;
  email: string;
  especialidad?: string;
}

/**
 * [NUEVO-SPEC, supuesto — CAMBIO DE CONTRATO Etapa 4] Respuesta de
 * `POST /api/instructores`: hasta Etapa 3 devolvía siempre `passwordTemporal`
 * en texto plano (placeholder de Etapa 0-2, TODO documentado). Etapa 4 cierra
 * ese TODO: la contraseña ahora se envía por email real y la respuesta pasa a
 * indicar el resultado de ese envío (`passwordEnviadaPorEmail`);
 * `passwordTemporal` solo viaja como fallback de emergencia cuando el envío
 * de email falló (`passwordEnviadaPorEmail: false`). Mismo shape que
 * `CrearAccesoResponse` (Socio) — ver comentario ahí.
 */
export interface InstructorAltaResult extends Instructor {
  passwordEnviadaPorEmail: boolean;
  passwordTemporal?: string | null;
}

// ---------------------------------------------------------------------------
// Espacios / Amenities — [SUPUESTO] no hay `Espacio.cs`/`Reserva.cs` en el
// backend todavía; shape basado en SPEC.md §4.2 y §7.3 (renombre de
// `Espacio.Tipo` a Deportivo/Recreativo/Eventos).
// ---------------------------------------------------------------------------

export type EspacioTipo = "Deportivo" | "Recreativo" | "Eventos";
export type UnidadPrecio = "PorHora" | "PorTurno" | "PorEvento";
export type EstadoEspacio = "Activo" | "Inactivo";

/** `Amenity` no tiene `Estado` en el backend (`Amenity.cs`: solo `Id`/`Nombre`) — catálogo simple, sin baja lógica. */
export interface Amenity {
  id: string;
  nombre: string;
}

export interface AmenityInput {
  nombre: string;
}

export interface Espacio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  tipo: EspacioTipo;
  capacidad: number;
  precio: number;
  unidadPrecio: UnidadPrecio;
  solicitarEvaluacion: boolean;
  permitirNoSocios: boolean;
  estado: EstadoEspacio;
  imagenUrl?: string | null;
  politicaCancelacionHoras?: number | null;
  porcentajeReembolso?: number | null;
  amenities: Amenity[];
}

export interface EspacioInput {
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  tipo: EspacioTipo;
  capacidad: number;
  precio: number;
  unidadPrecio: UnidadPrecio;
  solicitarEvaluacion: boolean;
  permitirNoSocios: boolean;
  politicaCancelacionHoras?: number;
  porcentajeReembolso?: number;
  amenityIds: string[];
}

// ---------------------------------------------------------------------------
// Reservas — [SUPUESTO] misma salvedad que Espacio.
// ---------------------------------------------------------------------------

export type TipoReserva =
  | "Partido"
  | "Entrenamiento"
  | "ReunionDirectiva"
  | "Capacitacion"
  | "Evento"
  | "Otro";

export type EstadoReserva =
  | "PendienteConfirmacion"
  | "Confirmada"
  | "Rechazada"
  | "Pagada"
  | "Cancelada";

export interface Reserva {
  id: string;
  /** Nullable: reserva de No Socio gestionada por staff (§4.2 "Reserva"). */
  socioId?: string | null;
  socioApellidoNombres?: string | null;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  emailContacto?: string | null;
  espacioId: string;
  espacioNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
  tipoReserva: TipoReserva;
  cantidadInvitados?: number | null;
  observaciones?: string | null;
  importe?: number | null;
  estado: EstadoReserva;
  motivoRechazo?: string | null;
  fechaCreacion: string;
}

export interface ReservaInput {
  /** Exactamente uno de `socioId` o los tres campos de contacto, según §4.2. */
  socioId?: string;
  nombreContacto?: string;
  telefonoContacto?: string;
  emailContacto?: string;
  espacioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  /** Requerido por `CrearReservaRequest`/`ActualizarReservaRequest` (confirmado contra el backend real). */
  duracion: number;
  tipoReserva: TipoReserva;
  cantidadInvitados?: number;
  observaciones?: string;
}

/**
 * [SUPUESTO] Body de `.../rechazar` y `.../cancelar`: se unifica en `motivo`
 * (no `motivoRechazo`), replicando la misma convención que ya usa `baja` de
 * Socio/GrupoFamiliar en Etapa 1 (contrato de wire simplificado, aunque la
 * columna en `Reserva` se llame `MotivoRechazo`).
 */
export interface MotivoInput {
  motivo: string;
}

/**
 * [SUPUESTO] Body de `POST /api/me/reservas` — mismos campos que `ReservaInput`
 * salvo `socioId`/los tres campos de contacto: `MePortalController` (Etapa 2,
 * ver SPEC.md changelog de Etapa 2 y §5 "todos los endpoints bajo `/api/me/*`
 * resuelven el `SocioId` desde el token") ya resuelve el socio desde el JWT,
 * así que el frontend nunca los envía en este endpoint puntual (a diferencia
 * de `POST /api/reservas` del backoffice, donde el staff puede reservar en
 * nombre de un socio o de un No Socio).
 */
export interface MeReservaInput {
  espacioId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  /** Requerido por `CrearMeReservaRequest` (confirmado contra el backend real). */
  duracion: number;
  tipoReserva: TipoReserva;
  cantidadInvitados?: number;
  observaciones?: string;
}

// ---------------------------------------------------------------------------
// Portal del Instructor (SPEC.md §5 "Portal del Instructor") — verificado
// contra `backend/.../Dtos/InstructorPortal/*.cs` y `Actividades/InscripcionResponse.cs`.
// `GET /api/instructor/actividades` NO reutiliza `ActividadResumen`: es una
// proyección propia (`ActividadInstructorPortalResponse`) sin datos de cupo
// mínimo/imagen/etc., con la División propia (si la asignación es a nivel
// división) como campos planos opcionales. `GET .../inscriptos` reutiliza
// directamente `InscripcionResponse` (el mismo shape que ve el backoffice en
// `.../actividades/{id}/inscriptos`) — sin DNI del socio, solo
// apellido+nombres combinados.
// ---------------------------------------------------------------------------

export type EstadoInscripcion = "Activa" | "Cancelada";

export interface ActividadInstructorPortal {
  id: string;
  nombre: string;
  dias?: string | null;
  horarioInicio: string;
  horarioFin: string;
  estado: EstadoActividad;
  cupoMaximo: number;
  cupoOcupado: number;
  /** Poblado solo si la asignación del instructor es a nivel división, no actividad completa. */
  divisionDeportivaId?: string | null;
  divisionDeportivaNombre?: string | null;
}

/** Shape real de `InscripcionResponse` (mismo DTO que usa el backoffice en `.../inscriptos`). */
export interface InscriptoActividad {
  id: string;
  socioId: string;
  socioApellidoNombres: string;
  actividadId: string;
  actividadNombre: string;
  divisionDeportivaId?: string | null;
  divisionDeportivaNombre?: string | null;
  fechaInscripcion: string;
  estado: EstadoInscripcion;
}

// ---------------------------------------------------------------------------
// Otorgar acceso a un Socio existente (SPEC.md — prerrequisito de Etapa 2 para
// poder ejercitar el Portal del Socio; ver `backend/.../Dtos/Socios/CrearAccesoResponse.cs`).
// ---------------------------------------------------------------------------

/**
 * [CAMBIO DE CONTRATO Etapa 4] `POST /api/socios/{id}/crear-acceso`. Hasta
 * Etapa 3 el backend devolvía siempre `passwordTemporal` en texto plano — la
 * pantalla la mostraba en el diálogo (placeholder de Etapa 0-2, TODO
 * documentado en `AuthController`/`CrearAccesoDialog`). Etapa 4 cierra ese
 * TODO: la contraseña temporal ahora se envía por email real;
 * `passwordEnviadaPorEmail` indica si ese envío tuvo éxito. `passwordTemporal`
 * solo viaja cuando `passwordEnviadaPorEmail === false`, como fallback de
 * emergencia para que el operador se la comunique manualmente al socio.
 */
export interface CrearAccesoResponse {
  usuarioId: string;
  passwordEnviadaPorEmail: boolean;
  passwordTemporal?: string | null;
}

// ---------------------------------------------------------------------------
// Etapa 3 — Finanzas (Cuota, CuotaDetalle, Pago, ConceptoIngresoLibre,
// ConfiguracionGeneral — SPEC.md §3.2/§3.5/§3.9/§3.15/§3.16/§3.18/§3.20,
// §4.2, §5 "Finanzas"). El backend real de esta etapa lo construye otro
// agente en paralelo — no hay entidades de backend verificadas todavía
// (a diferencia de Etapa 1). Shapes 100% basados en SPEC.md + los mismos dos
// criterios de contrato de Etapas 1-2: relaciones como campo plano
// (`socioApellidoNombres`, no `socio.apellido`) y enums como string al leer /
// número al escribir (ver `lib/enums.ts`). A reconciliar contra el backend
// real de Etapa 3.
// ---------------------------------------------------------------------------

export type EstadoCuota = "Pendiente" | "Pagada" | "Vencida";

/**
 * `Pago.Estado` (backend real, `Domain/Entities/Pago.cs`). `PendienteReembolso`
 * es el estado que usa RN-RES-01 (§3.9) para un reembolso de reserva pendiente
 * de gestión manual de Finanzas.
 */
export type EstadoPago = "Pendiente" | "Pagada" | "Rechazada" | "PendienteReembolso";

/** `Pago.MedioPago` (backend real, `Domain/Entities/Pago.cs`). */
export type MedioPago = "Efectivo" | "Transferencia" | "MercadoPago";

/** RN-FIN-03 (§3.5): dos modos de cálculo de la cuota de un Grupo Familiar. */
export type TipoTarifaFamiliar = "TarifaPlanaGrupo" | "SumaCategoriasIndividuales";

/**
 * Desglose informativo del `Importe` de una `Cuota` (RN-FIN-08, §3.18) — no
 * es cobrable de forma independiente, no tiene `Estado` ni `Pago` propios.
 */
export interface CuotaDetalle {
  id: string;
  cuotaId: string;
  concepto: string;
  actividadId?: string | null;
  actividadNombre?: string | null;
  /** Identifica qué integrante generó el cargo — relevante en cuotas familiares. */
  socioId?: string | null;
  socioApellidoNombres?: string | null;
  importe: number;
}

export interface Cuota {
  id: string;
  /** Exactamente uno de `socioId`/`grupoFamiliarId` no nulo (§4.2 "Cuota"). */
  socioId?: string | null;
  socioApellidoNombres?: string | null;
  grupoFamiliarId?: string | null;
  grupoFamiliarNombre?: string | null;
  numeroCuota: number;
  /** Formato `"yyyy-MM"` (ej. `"2026-08"`) — confirmado contra `CuotasController`. */
  periodo: string;
  fechaVencimiento: string;
  importe: number;
  /** Aplicado por el job diario de mora (RN-FIN-02) — nulo mientras no haya recargo. */
  recargoMora?: number | null;
  estado: EstadoCuota;
}

/** `GET /api/cuotas/{id}/detalle` (§5) — desglose societaria + actividades. */
export interface CuotaConDetalle extends Cuota {
  detalles: CuotaDetalle[];
}

export interface Pago {
  id: string;
  /** Nulo si el origen es `ConceptoIngresoLibre` sin socio identificado (§4.2). */
  socioId?: string | null;
  socioApellidoNombres?: string | null;
  cuotaId?: string | null;
  reservaId?: string | null;
  conceptoIngresoLibreId?: string | null;
  conceptoIngresoLibreNombre?: string | null;
  concepto: string;
  fecha: string;
  importe: number;
  medioPago: MedioPago;
  estado: EstadoPago;
  mercadoPagoTransaccionId?: string | null;
  comprobanteUrl?: string | null;
}

/**
 * Body de `POST /api/pagos` (registro manual, staff — §5). `cuotaIds` admite
 * uno o más ids: el backend genera un `Pago` por cada `Cuota` cancelada en la
 * misma transacción atómica cuando hay más de uno ("Pagar todo", RN-FIN-07,
 * §3.16). Exactamente uno de `cuotaIds`/`reservaId`/`conceptoIngresoLibreId`
 * debe venir completo, replicando el CHECK de exclusividad de `Pago`
 * (RF-FIN-34, actualizado por RN-FIN-09 §3.20).
 */
export interface PagoManualInput {
  cuotaIds?: string[];
  reservaId?: string;
  conceptoIngresoLibreId?: string;
  /** Solo tiene sentido junto a `conceptoIngresoLibreId` (ingreso libre asociado a un socio, opcional). */
  socioId?: string;
  /** Solo para `conceptoIngresoLibreId`: cuota/reserva ya traen su propio importe fijado del lado del backend. */
  importe?: number;
  medioPago: MedioPago;
  /** Texto libre opcional — solo relevante como aclaración de un ingreso libre. */
  concepto?: string;
}

export interface ConceptoIngresoLibre {
  id: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
}

export interface ConceptoIngresoLibreInput {
  nombre: string;
}

/**
 * `GET/PUT /api/configuracion/general` (confirmado contra
 * `ConfiguracionGeneralResponse`/`ActualizarConfiguracionGeneralRequest` del
 * backend real): fila singleton, solo estos 3 campos — no expone datos
 * institucionales del club (no existe ese endpoint en esta etapa).
 */
export interface ConfiguracionGeneral {
  maximaDeudaEnMeses: number;
  tipoTarifaFamiliar: TipoTarifaFamiliar;
  /** Solo relevante/editable si `tipoTarifaFamiliar === "TarifaPlanaGrupo"`. */
  tarifaPlanaGrupoImporte?: number | null;
  /**
   * [NUEVO-SPEC-UI, Etapa 5] RN-ACC-02 (§3.1): días de tolerancia después del
   * vencimiento de una cuota antes de que el Control de Acceso bloquee el
   * ingreso en portería. Se agrega a la misma fila singleton de
   * `ConfiguracionGeneral` — no hay una pantalla de configuración aparte para
   * Control de Acceso.
   */
  toleranciaAccesoDiasCuotaVencida: number;
  /**
   * [NUEVO-SPEC-UI, Etapa 6] Datos institucionales del club (SPEC.md §5
   * "Configuración": "datos institucionales del club — nombre, CUIT,
   * dirección, contacto, horarios de funcionamiento"). Se agregan a la misma
   * fila singleton — mismo criterio que `toleranciaAccesoDiasCuotaVencida`
   * en Etapa 5. Todos texto simple, todos opcionales (el SuperAdmin puede no
   * haberlos cargado todavía) — `GET /api/configuracion/publica` (nuevo,
   * público) expone un subconjunto de estos mismos campos para la landing.
   */
  nombreClub?: string | null;
  cuit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  emailContacto?: string | null;
  horariosFuncionamiento?: string | null;
}

export interface ConfiguracionGeneralInput {
  maximaDeudaEnMeses: number;
  tipoTarifaFamiliar: TipoTarifaFamiliar;
  tarifaPlanaGrupoImporte?: number;
  toleranciaAccesoDiasCuotaVencida: number;
  nombreClub?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  emailContacto?: string;
  horariosFuncionamiento?: string;
}

/**
 * `GET /api/configuracion/publica` (§5, **[NUEVO-SPEC-UI, Etapa 6]** — no
 * está en la lista original de endpoints de §5, se agrega porque la tarea de
 * Etapa 6 lo pide explícitamente para la landing pública). Sin autenticación
 * — subconjunto de `ConfiguracionGeneral` sin `cuit` (dato no pensado para
 * exposición pública) ni los campos financieros/de acceso, que no tiene
 * sentido exponer sin sesión.
 */
export interface ConfiguracionPublica {
  nombreClub?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  emailContacto?: string | null;
  horariosFuncionamiento?: string | null;
}

/**
 * `GET /api/finanzas/dashboard` (confirmado contra `DashboardFinancieroResponse`
 * del backend real). No incluye desglose por concepto — eso lo devuelve el
 * endpoint aparte `GET /api/finanzas/reportes/ingresos` (`ReporteIngresosItem`).
 */
export interface FinanzasDashboard {
  ingresosMesActual: number;
  sociosMorosos: number;
  cuotasPendientes: number;
  cuotasVencidas: number;
  reservasPagadasPendientesDeCheck: number;
}

/** Fila de `GET /api/finanzas/reportes/ingresos` (`ReporteIngresosItemResponse`). */
export interface ReporteIngresosItem {
  origen: "Cuota" | "Reserva" | "ConceptoIngresoLibre";
  conceptoNombre?: string | null;
  cantidad: number;
  total: number;
}

/**
 * Respuesta del checkout de Mercado Pago (`MercadoPagoCheckoutResponse` del
 * backend real) — incluye los `Pago.Id` generados para que el webhook los
 * resuelva por `external_reference` (RN-FIN-07, §3.16).
 */
export interface MercadoPagoCheckoutResponse {
  checkoutUrl: string;
  pagoIds: string[];
}

// ---------------------------------------------------------------------------
// Etapa 4 — Comunicaciones y Consultas del Socio (SPEC.md §4.2 "Comunicacion"
// / "ComunicacionDestinatario" / "ComunicacionAdjunto" / "ConsultaSocio", §5
// "Comunicaciones" / "Consultas del Socio", §7.2 `<ComunicacionWizard />`).
// El backend real de esta etapa lo construye otro agente en paralelo — no hay
// entidades de backend verificadas todavía (mismo caso que Etapa 3). Shapes
// 100% basados en SPEC.md + los mismos criterios de contrato de etapas
// anteriores (relaciones como campo plano, enums como string al leer / número
// al escribir vía `lib/enums.ts`). A reconciliar contra el backend real.
// ---------------------------------------------------------------------------

/** `Comunicacion.TipoComunicacion` — confirmado contra `Domain/Entities/Comunicacion.cs`. */
export type TipoComunicacion = "Novedad" | "Recordatorio" | "Cumpleanos" | "Otro";

/** `Comunicacion.Estado` — confirmado contra `Domain/Entities/Comunicacion.cs`. */
export type EstadoComunicacion = "Borrador" | "Programada" | "Enviada";

export type CanalComunicacion = "Email" | "WhatsApp" | "Novedad";

/** `ComunicacionDestinatario.EstadoEnvio` — confirmado contra el backend real. */
export type EstadoEnvioComunicacion = "Pendiente" | "Enviado" | "Fallido";

/**
 * `ComunicacionResponse` (confirmado contra el backend real) — se usa tanto
 * para listado como para detalle (`GET /api/comunicaciones` y `GET .../{id}`
 * comparten el mismo shape); no incluye `contenidoHtml` como parte de una
 * variante "resumen" separada — el backend lo devuelve siempre. `adjuntos`
 * NO viaja como lista aquí, solo `cantidadAdjuntos` — la lista real de
 * adjuntos solo se conoce por la respuesta de `POST .../adjuntos` en el
 * momento de subirlos.
 */
export interface Comunicacion {
  id: string;
  asunto: string;
  descripcion?: string | null;
  contenidoHtml: string;
  tipoComunicacion: TipoComunicacion;
  estado: EstadoComunicacion;
  fechaProgramada?: string | null;
  creadoPorUsuarioId: string;
  creadoPorEmail?: string | null;
  fechaCreacion: string;
  fechaUltimoEnvio?: string | null;
  cantidadDestinatarios: number;
  cantidadAdjuntos: number;
}

export interface ComunicacionAdjunto {
  id: string;
  archivoUrl: string;
  nombreArchivo: string;
}

/** Fila de `GET /api/comunicaciones/{id}/trazabilidad` (`ComunicacionDestinatarioResponse`). */
export interface ComunicacionDestinatario {
  id: string;
  usuarioId: string;
  socioId?: string | null;
  socioNombre?: string | null;
  canal: CanalComunicacion;
  estadoEnvio: EstadoEnvioComunicacion;
  fechaEnvio?: string | null;
  fechaLectura?: string | null;
  motivoFallo?: string | null;
}

/**
 * Selector de destinatario segmentado del wizard (§7.2: "Todos los socios /
 * Grupo o categoría / Socio específico / Novedad" — mutuamente excluyentes,
 * "Novedad" en rigor es un canal, no un segmento, así que se modela junto a
 * `canales`). [SUPUESTO] shape del body — a reconciliar.
 */
export interface ComunicacionSegmentoInput {
  todos: boolean;
  categoriaId?: string;
  grupoFamiliarId?: string;
  socioIds?: string[];
}

/** Body de `POST`/`PUT /api/comunicaciones/{id}` (borrador). [SUPUESTO], ver comentario de `ComunicacionSegmentoInput`. */
export interface ComunicacionInput {
  asunto: string;
  descripcion?: string;
  contenidoHtml: string;
  tipoComunicacion: TipoComunicacion;
  segmento: ComunicacionSegmentoInput;
  canales: CanalComunicacion[];
}

/** Body de `POST /api/comunicaciones/{id}/programar` (§5, setea `FechaProgramada`). */
export interface ProgramarComunicacionInput {
  fechaProgramada: string;
}

// ---------------------------------------------------------------------------
// Consultas del Socio (dirección inversa: socio → club)
// ---------------------------------------------------------------------------

export type EstadoConsulta = "Pendiente" | "Respondida" | "Cerrada";

/**
 * `ConsultaSocioResponse` — confirmado contra el backend real. `Respuesta`
 * (texto de la respuesta) y `RespondidoPorEmail` no estaban en el modelo
 * literal de SPEC.md §4.2 pero el backend los agregó como decisión de
 * implementación necesaria, documentada en `ConsultaSocio.cs`.
 */
export interface ConsultaSocio {
  id: string;
  socioId: string;
  socioNombre: string;
  area: string;
  asunto: string;
  detalle: string;
  adjuntoUrl?: string | null;
  estado: EstadoConsulta;
  fechaCreacion: string;
  respondidoPorUsuarioId?: string | null;
  respondidoPorEmail?: string | null;
  respuesta?: string | null;
  fechaRespuesta?: string | null;
}

/** Body de `POST /api/me/consultas` (§5, Portal del Socio). */
export interface ConsultaSocioInput {
  area: string;
  asunto: string;
  detalle: string;
}

/** Body de `PUT /api/consultas/{id}/responder` (§5, admin/empleado). */
export interface ResponderConsultaInput {
  respuesta: string;
}

/**
 * `MeComunicacionResponse` (`GET /api/me/comunicaciones`, confirmado contra
 * el backend real — array plano, filtrado a `Canal=Novedad`). El `id` de
 * cada fila es el `ComunicacionDestinatario.Id` (no el de la `Comunicacion`)
 * — es el mismo id que espera `PUT /api/me/comunicaciones/{id}/leer`. No
 * incluye `adjuntos` (ese campo no existe en esta respuesta).
 */
export interface MeComunicacion {
  id: string;
  asunto: string;
  descripcion?: string | null;
  contenidoHtml: string;
  tipoComunicacion: TipoComunicacion;
  fechaCreacion: string;
  fechaEnvio?: string | null;
  fechaLectura?: string | null;
}

// ---------------------------------------------------------------------------
// Etapa 5 — Control de Acceso (QR) (SPEC.md §3.1 RN-ACC-01 a 05, §4.2
// "RegistroAcceso", §5 "Control de Acceso"). El backend real de esta etapa lo
// construye otro agente en paralelo — no hay entidad de backend verificada
// todavía (mismo caso que Etapas 3/4). Shapes 100% basados en SPEC.md + los
// mismos criterios de contrato de etapas anteriores (relaciones como campo
// plano, enums como string al leer). A diferencia de los módulos anteriores,
// este NO tiene ninguna ruta prevista en §7 (nunca pasó por la auditoría de
// Figma) — las pantallas se diseñaron desde cero siguiendo el estilo visual
// del resto del backoffice. A reconciliar contra el backend real.
// ---------------------------------------------------------------------------

export type ResultadoAcceso = "Permitido" | "Denegado";

/** Body de `POST /api/control-acceso/validar` (RN-ACC-05: el QR es un token opaco firmado, nunca un id en claro). */
export interface ValidarAccesoInput {
  codigoQr: string;
}

/**
 * `ValidarAccesoResponse` (confirmado contra el backend real). Incluye los
 * datos del socio (si el token se pudo resolver) tanto si el acceso se
 * permite como si se deniega — RN-ACC-03/04 exigen mostrarle al operador la
 * foto y el nombre en ambos casos (para un "Denegado" porque necesita saber a
 * quién le está negando el paso, no solo el motivo). `apellido`/`nombres`/etc.
 * vienen `null` únicamente cuando el motivo es "QR no reconocido" (el token
 * no resolvió a ningún socio). `motivoDenegacion` viaja `null` cuando
 * `resultado` es "Permitido". No hay `numeroSocio` ni `socioApellidoNombres`
 * combinado acá — a diferencia de `RegistroAcceso`, este DTO trae
 * `apellido`/`nombres` por separado.
 */
export interface ValidarAccesoResponse {
  resultado: ResultadoAcceso;
  motivoDenegacion?: string | null;
  fechaHora: string;
  socioId?: string | null;
  apellido?: string | null;
  nombres?: string | null;
  fotoUrl?: string | null;
}

/**
 * `RegistroAccesoResponse` (§4.2, confirmado contra el backend real) — fila
 * de `GET /api/control-acceso/historial`. Mismo criterio de campos planos
 * que `Pago`/`Cuota`: ni el Socio ni el operador (`Usuario`) viajan como
 * objeto anidado. No hay `numeroSocio` en esta respuesta.
 */
export interface RegistroAcceso {
  id: string;
  socioId?: string | null;
  socioApellidoNombres?: string | null;
  fechaHora: string;
  resultado: ResultadoAcceso;
  motivoDenegacion?: string | null;
  operadorUsuarioId: string;
  operadorEmail: string;
}

// ---------------------------------------------------------------------------
// Etapa 6 — Solicitudes de Membresía y Portal Público (SPEC.md línea 332-333
// "SolicitudMembresia", §5 "Solicitudes de Membresía", §7.1 tabla de rutas
// públicas). Primera etapa con pantallas SIN sesión (público, No Socio). El
// backend real de esta etapa lo construye otro agente en paralelo — mismo
// caso que Etapas 3/4/5: shapes 100% basados en SPEC.md + los mismos
// criterios de contrato ya validados (campo plano para relaciones, enum
// string al leer / número al escribir vía `lib/enums.ts` — salvo `Genero`,
// que Etapa 1 ya estableció que viaja como string también en el body, ver
// `SocioInput`/`socios/actions.ts`, sin mapa de conversión en `lib/enums.ts`).
// A reconciliar contra el backend real.
// ---------------------------------------------------------------------------

export type EstadoSolicitudMembresia = "Pendiente" | "Aprobada" | "Rechazada";

/**
 * `SolicitudMembresiaResponse` — confirmado contra el backend real.
 * `categoriaPretendidaNombre` sigue la misma convención de campo plano que
 * el resto de la app para la relación `CategoriaPretendidaId` (nunca objeto
 * `categoria` anidado). `observaciones` SÍ existe como columna real
 * (`SolicitudMembresia.Observaciones`) — la nota de la matriz §2.2 sobre que
 * Empleado puede "revisar y adjuntar observaciones" tiene dónde vivir.
 */
export interface SolicitudMembresia {
  id: string;
  usuarioId: string;
  numeroSolicitud: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  genero: Genero;
  email: string;
  telefono?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  categoriaPretendidaId?: string | null;
  categoriaPretendidaNombre?: string | null;
  documentoIdentidadUrl?: string | null;
  fichaMedicaUrl?: string | null;
  estado: EstadoSolicitudMembresia;
  motivoRechazo?: string | null;
  fechaSolicitud: string;
  /** Nota interna de staff (Empleado/Admin/SuperAdmin), separada de `motivoRechazo`. */
  observaciones?: string | null;
}

/**
 * Body de `POST /api/solicitudes-membresia` (público). Incluye `password`:
 * la solicitud crea de una vez el `Usuario` (rol NoSocio, ver
 * `backend/.../DbSeeder.cs`) que después permite iniciar sesión y consultar
 * el seguimiento — no hay un paso de alta de cuenta separado. Misma política
 * de contraseña que el resto de la app (RN-LOG-01, §3.10: 8+ caracteres,
 * mayúscula, minúscula, número).
 */
export interface SolicitudMembresiaInput {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  genero: Genero;
  email: string;
  telefono?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  categoriaPretendidaId?: string;
  password: string;
}

/**
 * Body de `POST /api/solicitudes-membresia/{id}/rechazar` — confirmado
 * contra `RechazarSolicitudMembresiaRequest` real: el campo se llama
 * `motivoRechazo`, no `motivo` (a diferencia de `MotivoInput` que sí usan
 * baja de Socio/GrupoFamiliar/Reserva).
 */
export interface RechazarSolicitudInput {
  motivoRechazo: string;
}

/**
 * `POST /api/solicitudes-membresia/{id}/aprobar` — confirmado contra el
 * controller real: NO recibe body (`Aprobar(Guid id, CancellationToken)`,
 * sin `[FromBody]`). La resolución de `CategoriaId` cuando
 * `CategoriaPretendidaId` es null la hace el backend solo (fallback a la
 * primera Categoría Activa, `SolicitudMembresiaService.AprobarAsync`) — no
 * hay forma de que el staff la override desde acá. El endpoint no acepta
 * ningún parámetro.
 */

/**
 * Body de `PUT /api/solicitudes-membresia/{id}` (no `/observaciones` — ese
 * sub-path no existe, confirmado contra `ActualizarSolicitudMembresiaRequest`
 * real y la ruta `[HttpPut("{id:guid}")]` de `SolicitudesMembresiaController`).
 * El campo `observaciones` sí existe en el backend real (`SolicitudMembresia.Observaciones`).
 */
export interface ActualizarObservacionesSolicitudInput {
  observaciones: string;
}

// ---------------------------------------------------------------------------
// Etapa 7 — Reportes operativos por módulo (§5 "Reportes"). El backend real de
// esta etapa lo construye otro agente en paralelo — no hay entidades de
// backend verificadas todavía (mismo caso que Etapas 3/4/5/6). Shapes 100%
// basados en la especificación de la tarea de Etapa 7 + los mismos criterios
// de contrato de etapas anteriores (relaciones como campo plano, ej.
// `categoriaNombre` en vez de un objeto `categoria` anidado). Módulo
// restringido a SuperAdmin/Administrador — el backend responde 403 para
// cualquier otro rol logueado; cada tab de `/reportes` maneja ese caso de
// forma independiente, igual que `/finanzas/dashboard` y
// `/configuracion/general`.
// ---------------------------------------------------------------------------

/** Fila de "conteo por estado" de `GET /api/reportes/socios` — confirmado contra el backend
 * real: siempre trae los 3 `EstadoSocio` (Activo/Suspendido/Inactivo), con `cantidad=0` para
 * el que no tenga socios, en vez de 3 campos planos separados. */
export interface ReporteSocioPorEstado {
  estado: SocioEstado;
  cantidad: number;
}

/** Fila del desglose por categoría de `GET /api/reportes/socios`. */
export interface ReporteSociosCategoria {
  categoriaId: string;
  categoriaNombre: string;
  cantidad: number;
}

/**
 * `GET /api/reportes/socios` — confirmado contra `ReporteSociosResponse` real
 * (`PorEstado`/`PorCategoria`/`SociosMorosos`).
 */
export interface ReporteSocios {
  porEstado: ReporteSocioPorEstado[];
  porCategoria: ReporteSociosCategoria[];
  sociosMorosos: number;
}

/** Fila de `GET /api/reportes/actividades`. */
export interface ReporteActividadItem {
  actividadId: string;
  nombre: string;
  cupoMaximo: number;
  inscriptosActivos: number;
  /** 0-100, ya calculado por el backend (`inscriptosActivos / cupoMaximo`). */
  porcentajeOcupacion: number;
}

/** Fila de `GET /api/reportes/espacios?desde=&hasta=` (default: mes actual si no se especifica). */
export interface ReporteEspacioItem {
  espacioId: string;
  nombre: string;
  cantidadReservas: number;
  importeTotal: number;
}
