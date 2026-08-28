namespace ProyectoUnion.Application.Dtos.InstructorPortal;

/// <summary>Actividad propia de un Instructor autenticado (SPEC.md §5 "GET /api/instructor/actividades").</summary>
public sealed record ActividadInstructorPortalResponse(
    Guid Id,
    string Nombre,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    string Estado,
    int CupoMaximo,
    int CupoOcupado,
    Guid? DivisionDeportivaId,
    string? DivisionDeportivaNombre);
