namespace ProyectoUnion.Domain.Entities;

/// <summary>Tipo de una Comunicacion (SPEC.md §4.2 "Comunicacion").</summary>
public enum TipoComunicacion
{
    Novedad = 1,
    Recordatorio = 2,
    Cumpleanos = 3,
    Otro = 4
}

/// <summary>Ciclo de vida de una Comunicacion (SPEC.md §5 "GET /api/comunicaciones" tabs).</summary>
public enum EstadoComunicacion
{
    Borrador = 1,
    Programada = 2,
    Enviada = 3
}

/// <summary>
/// Comunicación club→socio (SPEC.md §4.2 "Comunicacion", RF-COM-*, Etapa 4). El envío real
/// (Email/WhatsApp/Novedad) se resuelve por destinatario en
/// <see cref="ComunicacionDestinatario"/>; los archivos adjuntos (hasta 5, validado en el
/// controller) viven en <see cref="ComunicacionAdjunto"/>.
/// </summary>
public class Comunicacion : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Asunto { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public string ContenidoHtml { get; set; } = string.Empty;

    public TipoComunicacion TipoComunicacion { get; set; }

    public EstadoComunicacion Estado { get; set; } = EstadoComunicacion.Borrador;

    /// <summary>Envío diferido (NUEVO-SPEC-UI, SPEC.md §4.2): null si no está programada.</summary>
    public DateTime? FechaProgramada { get; set; }

    public Guid CreadoPorUsuarioId { get; set; }

    public ApplicationUser? CreadoPorUsuario { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public DateTime? FechaUltimoEnvio { get; set; }

    public ICollection<ComunicacionDestinatario> Destinatarios { get; set; } = new List<ComunicacionDestinatario>();

    public ICollection<ComunicacionAdjunto> Adjuntos { get; set; } = new List<ComunicacionAdjunto>();
}
