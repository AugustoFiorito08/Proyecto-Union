using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Identity;

/// <summary>
/// Implementación de <see cref="IJwtTokenService"/> (Etapa 0). Firma el access token con
/// HMAC-SHA256 sobre el secreto de configuración. El claim incluye RolId/nombre de rol,
/// NivelJerarquico y un claim por cada permiso del rol, para que la autorización se
/// resuelva contra los claims del token (PermissionAuthorizationHandler) sin ir a la base.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public TokenResult GenerarTokens(ApplicationUser usuario, ApplicationRole rol, IEnumerable<string> permisos)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(ClaimTypes.Email, usuario.Email ?? string.Empty),
            new(ClaimTypes.Name, usuario.UserName ?? usuario.Email ?? string.Empty),
            new(ProyectoUnionClaimTypes.RolId, rol.Id.ToString()),
            new(ProyectoUnionClaimTypes.RolNombre, rol.Name ?? string.Empty),
            new(ProyectoUnionClaimTypes.NivelJerarquico, rol.NivelJerarquico.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(permisos.Select(codigo => new Claim(ProyectoUnionClaimTypes.Permiso, codigo)));

        var clave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        var credenciales = new SigningCredentials(clave, SecurityAlgorithms.HmacSha256);
        var expira = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expira,
            signingCredentials: credenciales);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = GenerarRefreshToken();
        var expiresIn = _options.AccessTokenMinutes * 60;

        return new TokenResult(accessToken, refreshToken, expiresIn);
    }

    public string GenerarRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
