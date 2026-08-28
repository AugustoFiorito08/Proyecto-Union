using ProyectoUnion.Application.Dtos.Instructores;

namespace ProyectoUnion.Application.Dtos.Actividades;

public sealed record ActividadResponse(
    Guid Id,
    string Nombre,
    string? Descripcion,
    Guid CategoriaId,
    string CategoriaNombre,
    Guid? EspacioId,
    string? EspacioNombre,
    decimal? Precio,
    string ModalidadInscripcion,
    int CupoMinimo,
    int CupoMaximo,
    int CupoOcupado,
    string? Dias,
    TimeOnly HorarioInicio,
    TimeOnly HorarioFin,
    int Duracion,
    string Estado,
    string? ImagenUrl,
    DateTime FechaUltimaModificacion,
    IReadOnlyList<InstructorResumenResponse> Instructores);
