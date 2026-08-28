namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>
/// Segmento de destinatarios de una Comunicacion (enunciado Etapa 4, punto 4). Exactamente
/// uno de los cuatro campos debe estar activo (Todos=true, o uno de los tres restantes no
/// vacío/null) — validado en IComunicacionService.ResolverDestinatariosAsync.
/// </summary>
public sealed record SegmentoDestinatariosRequest(
    bool Todos,
    Guid? CategoriaId,
    Guid? GrupoFamiliarId,
    Guid[]? SocioIds);
