namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record InscripcionResponse(
    Guid Id,
    Guid SocioId,
    string SocioApellidoNombres,
    Guid ActividadId,
    string ActividadNombre,
    Guid? DivisionDeportivaId,
    string? DivisionDeportivaNombre,
    DateTime FechaInscripcion,
    string Estado);
