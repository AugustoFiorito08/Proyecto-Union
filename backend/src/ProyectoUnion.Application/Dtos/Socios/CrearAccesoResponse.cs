namespace ProyectoUnion.Application.Dtos.Socios;

/// <summary>
/// Respuesta de <c>POST /api/socios/{id}/crear-acceso</c>. TODO(Etapa 4): enviar
/// <see cref="PasswordTemporal"/> por email en vez de exponerla en la respuesta.
/// </summary>
public sealed record CrearAccesoResponse(Guid UsuarioId, string PasswordTemporal);
