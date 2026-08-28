namespace ProyectoUnion.Application.Dtos.Espacios;

public sealed record EspacioResponse(
    Guid Id,
    string Nombre,
    string? Descripcion,
    string? Ubicacion,
    string Tipo,
    int Capacidad,
    decimal Precio,
    string UnidadPrecio,
    bool SolicitarEvaluacion,
    bool PermitirNoSocios,
    string Estado,
    string? ImagenUrl,
    int PoliticaCancelacionHoras,
    decimal PorcentajeReembolso,
    IReadOnlyList<AmenityResponse> Amenities);
