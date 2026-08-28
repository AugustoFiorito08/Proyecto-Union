using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Resultado de la generación de tokens: access token corto + refresh token opaco,
/// junto con su vencimiento en segundos (para el DTO de respuesta de /api/auth/login).
/// </summary>
public sealed record TokenResult(string AccessToken, string RefreshToken, int ExpiresIn);

/// <summary>
/// Emisión y validación de JWT (Etapa 0: infraestructura + autenticación).
/// El access token incluye claims de RolId/nombre de rol y NivelJerarquico (RN-ADM-01,
/// SPEC.md §3.19) para que <c>PermissionAuthorizationHandler</c> autorice sin ir a la base.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Genera un access token (JWT firmado, corta duración) y un refresh token
    /// (string aleatorio criptográfico) para el usuario dado, incluyendo sus permisos
    /// como claims.
    /// </summary>
    TokenResult GenerarTokens(ApplicationUser usuario, ApplicationRole rol, IEnumerable<string> permisos);

    /// <summary>
    /// Genera únicamente un nuevo refresh token opaco (RandomNumberGenerator), usado al
    /// invalidar/rotar el token existente de <see cref="ApplicationUser.RecordarSesionToken"/>.
    /// </summary>
    string GenerarRefreshToken();
}
