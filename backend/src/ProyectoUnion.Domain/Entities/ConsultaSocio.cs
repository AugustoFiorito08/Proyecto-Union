namespace ProyectoUnion.Domain.Entities;

/// <summary>Estado de una ConsultaSocio (SPEC.md §4.2 "ConsultaSocio").</summary>
public enum EstadoConsulta
{
    Pendiente = 1,
    Respondida = 2,
    Cerrada = 3
}

/// <summary>
/// Consulta del socio hacia el club — dirección inversa a <see cref="Comunicacion"/>, que es
/// club→socio (SPEC.md §4.2 "ConsultaSocio", NUEVO-SPEC-UI).
/// </summary>
public class ConsultaSocio
{
    public Guid Id { get; set; }

    public Guid SocioId { get; set; }

    public Socio Socio { get; set; } = null!;

    public string Area { get; set; } = string.Empty;

    public string Asunto { get; set; } = string.Empty;

    public string Detalle { get; set; } = string.Empty;

    public string? AdjuntoUrl { get; set; }

    public EstadoConsulta Estado { get; set; } = EstadoConsulta.Pendiente;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Guid? RespondidoPorUsuarioId { get; set; }

    public ApplicationUser? RespondidoPorUsuario { get; set; }

    public DateTime? FechaRespuesta { get; set; }

    /// <summary>
    /// Decisión de implementación: no está listado explícitamente en SPEC.md §4.2 (que solo
    /// menciona Estado/RespondidoPorUsuarioId/FechaRespuesta), pero es indispensable para
    /// poder mostrarle al socio qué le respondieron (enunciado Etapa 4, punto 1).
    /// </summary>
    public string? Respuesta { get; set; }
}
