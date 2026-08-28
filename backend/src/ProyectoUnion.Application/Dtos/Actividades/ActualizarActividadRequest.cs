namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record ActualizarActividadRequest(
    string Nombre,
    string? Descripcion,
    Guid CategoriaId,
    Guid? EspacioId,
    decimal? Precio,
    int ModalidadInscripcion,
    int CupoMinimo,
    int CupoMaximo,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    int Duracion,
    int Estado,
    string? ImagenUrl);
