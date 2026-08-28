namespace ProyectoUnion.Application.Dtos.Instructores;

/// <summary>
/// Respuesta de alta de instructor. Etapa 4: la contraseña temporal se envía por email;
/// <see cref="PasswordTemporal"/> solo viaja en la respuesta como fallback de emergencia
/// cuando <see cref="PasswordEnviadaPorEmail"/> es false (RN-LOG-01, SPEC.md §3.10).
/// </summary>
public sealed record InstructorCreadoResponse(InstructorResponse Instructor, bool PasswordEnviadaPorEmail, string? PasswordTemporal);
