using ProyectoUnion.Application.Dtos.Instructores;

namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record DivisionResponse(
    Guid Id,
    Guid ActividadId,
    string Nombre,
    int? EdadMinima,
    int? EdadMaxima,
    string? Genero,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    string Estado,
    IReadOnlyList<InstructorResumenResponse> Instructores);
