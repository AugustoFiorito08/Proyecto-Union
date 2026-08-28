namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>Respuesta de GET /api/comunicaciones/{id}/trazabilidad (SPEC.md §5).</summary>
public sealed record ComunicacionTrazabilidadResponse(
    Guid ComunicacionId,
    string Asunto,
    string Estado,
    IReadOnlyList<ComunicacionDestinatarioResponse> Destinatarios);
