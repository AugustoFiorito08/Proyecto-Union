namespace ProyectoUnion.Application.Dtos.Instructores;

public sealed record InstructorResponse(
    Guid Id,
    Guid UsuarioId,
    string Apellido,
    string Nombres,
    string DNI,
    string? Telefono,
    string Email,
    string? Especialidad,
    string Estado);
