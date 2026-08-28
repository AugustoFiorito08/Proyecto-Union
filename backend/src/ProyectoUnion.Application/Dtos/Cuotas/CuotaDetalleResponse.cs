namespace ProyectoUnion.Application.Dtos.Cuotas;

public sealed record CuotaDetalleResponse(
    Guid Id,
    string Concepto,
    Guid? ActividadId,
    string? ActividadNombre,
    Guid? SocioId,
    string? SocioApellidoNombres,
    decimal Importe);
