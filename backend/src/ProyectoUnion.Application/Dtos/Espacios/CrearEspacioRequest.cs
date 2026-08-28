namespace ProyectoUnion.Application.Dtos.Espacios;

public sealed record CrearEspacioRequest(
    string Nombre,
    string? Descripcion,
    string? Ubicacion,
    int Tipo,
    int Capacidad,
    decimal Precio,
    int UnidadPrecio,
    bool SolicitarEvaluacion,
    bool PermitirNoSocios,
    string? ImagenUrl,
    int PoliticaCancelacionHoras,
    decimal PorcentajeReembolso,
    IReadOnlyList<Guid>? AmenityIds);
