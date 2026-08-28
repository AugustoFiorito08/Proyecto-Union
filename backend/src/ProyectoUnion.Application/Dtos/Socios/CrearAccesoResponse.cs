namespace ProyectoUnion.Application.Dtos.Socios;

/// <summary>
/// Respuesta de <c>POST /api/socios/{id}/crear-acceso</c>. Etapa 4: la contraseña temporal
/// se envía por email; <see cref="PasswordTemporal"/> solo viaja en la respuesta como
/// fallback de emergencia cuando <see cref="PasswordEnviadaPorEmail"/> es false (el
/// proveedor de email no está configurado en este entorno).
/// </summary>
public sealed record CrearAccesoResponse(Guid UsuarioId, bool PasswordEnviadaPorEmail, string? PasswordTemporal);
