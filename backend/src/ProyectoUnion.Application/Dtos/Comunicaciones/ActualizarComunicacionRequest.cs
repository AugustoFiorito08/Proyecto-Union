namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>
/// Body de PUT /api/comunicaciones/{id} (SPEC.md §5). Solo permitido mientras
/// Comunicacion.Estado=Borrador (ComunicacionesController.Actualizar); permite re-resolver
/// destinatarios y canales igual que la creación.
/// </summary>
public sealed record ActualizarComunicacionRequest(
    string Asunto,
    string? Descripcion,
    string ContenidoHtml,
    int TipoComunicacion,
    SegmentoDestinatariosRequest Segmento,
    int[] Canales);
