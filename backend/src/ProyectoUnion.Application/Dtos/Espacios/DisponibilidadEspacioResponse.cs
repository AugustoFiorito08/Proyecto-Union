namespace ProyectoUnion.Application.Dtos.Espacios;

public sealed record BloqueOcupadoResponse(Guid ReservaId, TimeOnly HoraInicio, TimeOnly HoraFin, string Estado);

public sealed record DisponibilidadEspacioResponse(
    Guid EspacioId,
    DateTime Fecha,
    IReadOnlyList<BloqueOcupadoResponse> Ocupados);
