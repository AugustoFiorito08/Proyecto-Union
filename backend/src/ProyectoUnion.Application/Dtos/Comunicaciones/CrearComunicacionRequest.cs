namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>
/// Body de POST /api/comunicaciones (SPEC.md §5 "Comunicaciones", enunciado Etapa 4, punto
/// 7). Crea la Comunicacion en Estado=Borrador junto con un ComunicacionDestinatario por
/// cada combinación Socio×Canal resuelta a partir de <see cref="Segmento"/> y
/// <see cref="Canales"/> (enteros de <c>CanalComunicacion</c>: 1=Email, 2=WhatsApp,
/// 3=Novedad — puede indicarse más de uno).
/// </summary>
public sealed record CrearComunicacionRequest(
    string Asunto,
    string? Descripcion,
    string ContenidoHtml,
    int TipoComunicacion,
    SegmentoDestinatariosRequest Segmento,
    int[] Canales);
