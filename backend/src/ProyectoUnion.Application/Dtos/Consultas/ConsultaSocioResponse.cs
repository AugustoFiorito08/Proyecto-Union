namespace ProyectoUnion.Application.Dtos.Consultas;

/// <summary>Respuesta de listado/detalle de ConsultaSocio (SPEC.md §5 "Consultas del Socio").</summary>
public sealed record ConsultaSocioResponse(
    Guid Id,
    Guid SocioId,
    string SocioNombre,
    string Area,
    string Asunto,
    string Detalle,
    string? AdjuntoUrl,
    string Estado,
    DateTime FechaCreacion,
    Guid? RespondidoPorUsuarioId,
    string? RespondidoPorEmail,
    DateTime? FechaRespuesta,
    string? Respuesta);
