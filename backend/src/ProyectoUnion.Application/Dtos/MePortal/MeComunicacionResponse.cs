namespace ProyectoUnion.Application.Dtos.MePortal;

/// <summary>
/// Respuesta de GET /api/me/comunicaciones (SPEC.md §5 "Portal del Socio"). Incluye
/// <see cref="FechaLectura"/> (canal Novedad) para que el frontend calcule el contador de no
/// leídas — enunciado Etapa 4, punto 6.
/// </summary>
public sealed record MeComunicacionResponse(
    Guid Id,
    string Asunto,
    string? Descripcion,
    string ContenidoHtml,
    string TipoComunicacion,
    DateTime FechaCreacion,
    DateTime? FechaEnvio,
    DateTime? FechaLectura);
