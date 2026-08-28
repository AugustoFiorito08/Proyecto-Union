using Microsoft.AspNetCore.Identity;
using ProyectoUnion.Domain.Common;

namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Estado de una cuenta de usuario dentro del sistema.
/// Decisión de diseño (no especificada en SPEC.md §4.2): se modela como enum simple
/// (Activo/Inactivo) en lugar de reutilizar los estados de Socio (Activo/Suspendido/Inactivo),
/// porque el estado de la cuenta de acceso es conceptualmente distinto del estado de membresía.
/// </summary>
public enum EstadoUsuario
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Usuario de autenticación (SPEC.md §4.2, entidad "Usuario"), independiente del rol de negocio.
/// Extiende <see cref="IdentityUser{TKey}"/> de ASP.NET Core Identity, que ya cubre
/// Id, UserName/NombreUsuario, Email, PasswordHash. Se agregan solo los campos del SPEC
/// que Identity no cubre.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>, IAuditable
{
    /// <summary>
    /// FK al rol único del usuario. Decisión de diseño explícita del enunciado:
    /// NO se usa la tabla estándar AspNetUserRoles (relación N:M de Identity);
    /// la autorización se resuelve contra este campo directo (un solo rol por usuario).
    /// </summary>
    public Guid RolId { get; set; }

    public ApplicationRole? Rol { get; set; }

    public EstadoUsuario Estado { get; set; } = EstadoUsuario.Activo;

    /// <summary>
    /// Refresh token activo del usuario (RN de sesión). Un único token activo por usuario:
    /// se sobrescribe (invalida el anterior) al emitir uno nuevo en login/refresh.
    /// </summary>
    public string? RecordarSesionToken { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public DateTime? FechaUltimoAcceso { get; set; }
}
