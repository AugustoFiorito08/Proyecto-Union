namespace ProyectoUnion.Application.Dtos.Instructores;

public sealed record ActualizarInstructorRequest(
    string Apellido,
    string Nombres,
    string? Telefono,
    string Email,
    string? Especialidad);
