namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Tipo de pago elegido por el socio (RF-SOC-02, RN-FIN-04, SPEC.md §3.6). Un cambio de
/// TipoPago solo aplica a partir del próximo período a emitir.
/// </summary>
public enum TipoPago
{
    Mensual = 1,
    Semestral = 2,
    Anual = 3,
    Estudiante = 4
}

/// <summary>
/// Cómo se gestiona el cobro de la cuota del socio (SPEC.md §4.2 "Socio.Modalidad",
/// NUEVO-SPEC-UI).
/// </summary>
public enum ModalidadSocio
{
    Cobrador = 1,
    SecretariaWeb = 2
}

/// <summary>
/// Vínculo del socio con el titular de su Grupo Familiar (SPEC.md §4.2
/// "Socio.Parentesco", NUEVO-SPEC-UI). Solo aplica si GrupoFamiliarId no es null.
/// </summary>
public enum Parentesco
{
    Titular = 1,
    Conyuge = 2,
    Hijo = 3
}

public enum EstadoSocio
{
    Activo = 1,
    Suspendido = 2,
    Inactivo = 3
}

/// <summary>
/// Socio del club (SPEC.md §4.2 "Socio"). Incluye la ficha médica con vencimiento
/// (RF-SOC-04 ter/quater), datos sensibles cifrados en reposo (RN-SEG-01, §3.12:
/// <see cref="GrupoSanguineo"/> y <see cref="ObservacionesMedicas"/>, cifrados a nivel de
/// aplicación vía Data Protection API — ver SocioConfiguration/EncryptedStringConverter),
/// y el token opaco de QR del carnet digital (RN-ACC-05, §3.1).
/// </summary>
public class Socio : Common.IAuditable
{
    public Guid Id { get; set; }

    /// <summary>
    /// FK opcional a la cuenta de login del socio. El alta de socio en Etapa 1 no crea
    /// necesariamente un ApplicationUser (eso se resuelve en una etapa posterior de
    /// autogestión/portal, RF-LOG-05).
    /// </summary>
    public Guid? UsuarioId { get; set; }

    public ApplicationUser? Usuario { get; set; }

    public string NumeroSocio { get; set; } = string.Empty;

    public string Apellido { get; set; } = string.Empty;

    public string Nombres { get; set; } = string.Empty;

    public string DNI { get; set; } = string.Empty;

    public string? CUIL { get; set; }

    public DateTime FechaNacimiento { get; set; }

    public string? Genero { get; set; }

    public string? Nacionalidad { get; set; }

    public TipoPago TipoPago { get; set; }

    public Guid CategoriaId { get; set; }

    public Categoria Categoria { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? Celular { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? Domicilio { get; set; }

    public string? Localidad { get; set; }

    public string? Provincia { get; set; }

    public string? CodigoPostal { get; set; }

    public Guid? CoberturaMedicaId { get; set; }

    public CoberturaMedica? CoberturaMedica { get; set; }

    public Guid? PlanId { get; set; }

    public Plan? Plan { get; set; }

    /// <summary>Cifrado en reposo (RN-SEG-01, §3.12) — ver SocioConfiguration.</summary>
    public string? GrupoSanguineo { get; set; }

    public string? ContactoEmergencia { get; set; }

    /// <summary>Cifrado en reposo (RN-SEG-01, §3.12) — ver SocioConfiguration.</summary>
    public string? ObservacionesMedicas { get; set; }

    public DateTime? FichaMedicaFechaEmision { get; set; }

    /// <summary>
    /// Calculado = FichaMedicaFechaEmision + 1 año al setear la fecha de emisión
    /// (controller/servicio, NO computed column — ver enunciado Etapa 1, Paso 2).
    /// </summary>
    public DateTime? FichaMedicaFechaVencimiento { get; set; }

    public string? FotoUrl { get; set; }

    public Guid? GrupoFamiliarId { get; set; }

    public GrupoFamiliar? GrupoFamiliar { get; set; }

    /// <summary>Solo aplica si <see cref="GrupoFamiliarId"/> no es null.</summary>
    public Parentesco? Parentesco { get; set; }

    public ModalidadSocio Modalidad { get; set; } = ModalidadSocio.SecretariaWeb;

    public EstadoSocio Estado { get; set; } = EstadoSocio.Activo;

    public DateTime FechaAlta { get; set; } = DateTime.UtcNow;

    public DateTime? FechaBaja { get; set; }

    public string? MotivoBaja { get; set; }

    public DateTime FechaUltimaModificacion { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Token opaco, único e inmutable para el QR del Carnet Digital (RN-ACC-05, §3.1).
    /// Generado con RandomNumberGenerator al crear el socio; nunca contiene datos
    /// personales. Campo agregado en esta implementación de Etapa 1 (no estaba en
    /// SPEC.md original — ver reporte final para incorporarlo al documento).
    /// </summary>
    public string CodigoQr { get; set; } = string.Empty;

    /// <summary>
    /// Fecha en la que el socio prestó consentimiento informado para el tratamiento de sus
    /// datos de salud (RN-SEG-01, §3.12). Campo agregado en esta implementación de Etapa 1
    /// (no estaba en SPEC.md original — ver reporte final para incorporarlo al documento).
    /// </summary>
    public DateTime? ConsentimientoDatosSaludFecha { get; set; }
}
