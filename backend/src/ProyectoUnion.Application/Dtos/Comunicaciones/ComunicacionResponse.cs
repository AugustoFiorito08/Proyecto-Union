namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>
/// Respuesta de listado/detalle de Comunicacion (convención de contrato: enums como string,
/// campos planos en vez de objetos anidados).
/// </summary>
public sealed record ComunicacionResponse(
    Guid Id,
    string Asunto,
    string? Descripcion,
    string ContenidoHtml,
    string TipoComunicacion,
    string Estado,
    DateTime? FechaProgramada,
    Guid CreadoPorUsuarioId,
    string? CreadoPorEmail,
    DateTime FechaCreacion,
    DateTime? FechaUltimoEnvio,
    int CantidadDestinatarios,
    int CantidadAdjuntos);
