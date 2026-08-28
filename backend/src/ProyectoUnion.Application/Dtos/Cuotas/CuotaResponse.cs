namespace ProyectoUnion.Application.Dtos.Cuotas;

public sealed record CuotaResponse(
    Guid Id,
    Guid? SocioId,
    string? SocioApellidoNombres,
    Guid? GrupoFamiliarId,
    string? GrupoFamiliarNombre,
    int NumeroCuota,
    string Periodo,
    DateTime FechaVencimiento,
    decimal Importe,
    decimal? RecargoMora,
    string Estado);
