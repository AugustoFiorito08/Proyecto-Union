namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record CrearDivisionRequest(
    string Nombre,
    int? EdadMinima,
    int? EdadMaxima,
    string? Genero,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    int Estado);
