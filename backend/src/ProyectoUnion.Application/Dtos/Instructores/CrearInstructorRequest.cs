namespace ProyectoUnion.Application.Dtos.Instructores;

/// <summary>
/// Alta de instructor (SPEC.md §5). Crea el <see cref="ProyectoUnion.Domain.Entities.Instructor"/>
/// y la cuenta de login asociada (rol "Instructor", contraseña temporal — ver
/// <see cref="InstructorCreadoResponse"/>).
/// </summary>
public sealed record CrearInstructorRequest(
    string Apellido,
    string Nombres,
    string DNI,
    string? Telefono,
    string Email,
    string? Especialidad);
