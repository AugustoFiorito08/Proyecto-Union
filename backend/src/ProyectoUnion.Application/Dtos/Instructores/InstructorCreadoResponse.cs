namespace ProyectoUnion.Application.Dtos.Instructores;

/// <summary>
/// Respuesta de alta de instructor. <see cref="PasswordTemporal"/> se expone en claro
/// únicamente en esta respuesta (RN-LOG-01, SPEC.md §3.10).
/// TODO(Etapa 4): enviar la contraseña temporal por email en vez de exponerla en la
/// respuesta (mismo patrón pendiente que AuthController.ForgotPassword).
/// </summary>
public sealed record InstructorCreadoResponse(InstructorResponse Instructor, string PasswordTemporal);
