namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record ActualizarDivisionRequest(
    string Nombre,
    int? EdadMinima,
    int? EdadMaxima,
    string? Genero,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    int Estado);
